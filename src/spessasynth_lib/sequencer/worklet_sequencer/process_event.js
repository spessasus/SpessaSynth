import { getEvent, messageTypes, midiControllers } from '../../midi_parser/midi_message.js'
import { WorkletSequencerReturnMessageType } from './sequencer_message.js'
import { consoleColors } from '../../utils/other.js'
import { SpessaSynthWarn } from '../../utils/loggin.js'
import { readBytesAsUintBigEndian } from '../../utils/byte_functions/big_endian.js'
import { DEFAULT_PERCUSSION } from '../../synthetizer/synthetizer.js'

/**
 * Processes a single event
 * @param event {MidiMessage}
 * @param trackIndex {number}
 * @this {WorkletSequencer}
 * @private
 */
export function _processEvent(event, trackIndex)
{
    if(this.ignoreEvents) return;
    if(this.sendMIDIMessages)
    {
        if(event.messageStatusByte >= 0x80)
        {
            this.sendMIDIMessage([event.messageStatusByte, ...event.messageData]);
            return;
        }
    }
    const statusByteData = getEvent(event.messageStatusByte);
    const offset = this.midiPortChannelOffsets[this.midiPorts[trackIndex]] || 0
    statusByteData.channel += offset;
    // process the event
    switch (statusByteData.status) {
        case messageTypes.noteOn:
            const velocity = event.messageData[1];
            if(velocity > 0)
            {
                this.synth.noteOn(statusByteData.channel, event.messageData[0], velocity);
                this.playingNotes.push({
                    midiNote: event.messageData[0],
                    channel: statusByteData.channel,
                    velocity: velocity,
                    startTime: this.currentTime
                });
            }
            else
            {
                this.synth.noteOff(statusByteData.channel, event.messageData[0]);
                const toDelete = this.playingNotes.findIndex(n =>
                    n.midiNote === event.messageData[0] && n.channel === statusByteData.channel);
                if(toDelete !== -1)
                {
                    this.playingNotes.splice(toDelete, 1);
                }
            }
            break;

        case messageTypes.noteOff:
            this.synth.noteOff(statusByteData.channel, event.messageData[0]);
            const toDelete = this.playingNotes.findIndex(n =>
                n.midiNote === event.messageData[0] && n.channel === statusByteData.channel);
            if(toDelete !== -1)
            {
                this.playingNotes.splice(toDelete, 1);
            }
            break;

        case messageTypes.pitchBend:
            this.synth.pitchWheel(statusByteData.channel, event.messageData[1], event.messageData[0]);
            break;

        case messageTypes.controllerChange:
            // special case if the RMID is embedded: subtract 1 from bank. See wiki About-RMIDI
            let v = event.messageData[1];
            if(this.midiData.embeddedSoundFont && event.messageData[0] === midiControllers.bankSelect)
            {
                v--;
            }
            this.synth.controllerChange(statusByteData.channel, event.messageData[0], v);
            break;

        case messageTypes.programChange:
            this.synth.programChange(statusByteData.channel, event.messageData[0]);
            break;

        case messageTypes.polyPressure:
            this.synth.polyPressure(statusByteData.channel, event.messageData[0], event.messageData[1]);
            break;

        case messageTypes.channelPressure:
            this.synth.channelPressure(statusByteData.channel, event.messageData[0]);
            break;

        case messageTypes.systemExclusive:
            this.synth.systemExclusive(event.messageData, offset);
            break;

        case messageTypes.setTempo:
            this.oneTickToSeconds = 60 / (getTempo(event) * this.midiData.timeDivision);
            if(this.oneTickToSeconds === 0)
            {
                this.oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
                SpessaSynthWarn("invalid tempo! falling back to 120 BPM");
            }
            break;

        // recongized but ignored
        case messageTypes.timeSignature:
        case messageTypes.endOfTrack:
        case messageTypes.midiChannelPrefix:
        case messageTypes.songPosition:
        case messageTypes.activeSensing:
        case messageTypes.keySignature:
            break;

        case messageTypes.text:
        case messageTypes.lyric:
        case messageTypes.copyright:
        case messageTypes.trackName:
        case messageTypes.marker:
        case messageTypes.cuePoint:
        case messageTypes.instrumentName:
            this.post(WorkletSequencerReturnMessageType.textEvent, [event.messageData, statusByteData.status])
            break;

        case messageTypes.midiPort:
            this.assignMIDIPort(trackIndex, event.messageData[0]);
            break;

        case messageTypes.reset:
            this.synth.stopAllChannels();
            this.synth.resetAllControllers();
            break;

        default:
            SpessaSynthWarn(`%cUnrecognized Event: %c${event.messageStatusByte}%c status byte: %c${Object.keys(messageTypes).find(k => messageTypes[k] === statusByteData.status)}`,
                consoleColors.warn,
                consoleColors.unrecognized,
                consoleColors.warn,
                consoleColors.value);
            break;
    }
}

/**
 * Adds 16 channels to the synth
 * @this {WorkletSequencer}
 * @private
 */
export function _addNewMidiPort()
{
    for (let i = 0; i < 16; i++) {
        this.synth.createWorkletChannel(true);
        if(i === DEFAULT_PERCUSSION)
        {
            this.synth.setDrums(this.synth.workletProcessorChannels.length - 1, true);
        }
    }
}

/**
 * gets tempo from the midi message
 * @param event {MidiMessage}
 * @return {number} the tempo in bpm
 */
function getTempo(event)
{
    event.messageData.currentIndex = 0;
    return 60000000 / readBytesAsUintBigEndian(event.messageData, 3);
}