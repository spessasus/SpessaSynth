import { getEvent, messageTypes } from '../../midi_parser/midi_message.js'
import { WorkletSequencerReturnMessageType } from './sequencer_message.js'
import { consoleColors } from '../../utils/other.js'
import { readBytesAsUintBigEndian } from '../../utils/byte_functions.js'
import { SpessaSynthWarn } from '../../utils/loggin.js'

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
        if(event.messageStatusByte >= 0x80) {
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
            if(velocity > 0) {
                this.synth.noteOn(statusByteData.channel, event.messageData[0], velocity);
                this.playingNotes.push({
                    midiNote: event.messageData[0],
                    channel: statusByteData.channel,
                    velocity: velocity
                });
            }
            else
            {
                this.synth.noteOff(statusByteData.channel, event.messageData[0]);
                this.playingNotes.splice(this.playingNotes.findIndex(n =>
                    n.midiNote === event.messageData[0] && n.channel === statusByteData.channel), 1);
            }
            break;

        case messageTypes.noteOff:
            this.synth.noteOff(statusByteData.channel, event.messageData[0]);
            this.playingNotes.splice(this.playingNotes.findIndex(n =>
                n.midiNote === event.messageData[0] && n.channel === statusByteData.channel), 1);
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
        case messageTypes.midiPort:
        case messageTypes.endOfTrack:
        case messageTypes.midiChannelPrefix:
        case messageTypes.timeSignature:
        case messageTypes.songPosition:
        case messageTypes.activeSensing:
        case messageTypes.keySignature:
            break;

        default:
            SpessaSynthWarn(`%cUnrecognized Event: %c${event.messageStatusByte}%c status byte: %c${Object.keys(messageTypes).find(k => messageTypes[k] === statusByteData.status)}`,
                consoleColors.warn,
                consoleColors.unrecognized,
                consoleColors.warn,
                consoleColors.value);
            break;

        case messageTypes.pitchBend:
            this.synth.pitchWheel(statusByteData.channel, event.messageData[1], event.messageData[0]);
            break;

        case messageTypes.controllerChange:
            this.synth.controllerChange(statusByteData.channel, event.messageData[0], event.messageData[1]);
            break;

        case messageTypes.programChange:
            this.synth.programChange(statusByteData.channel, event.messageData[0]);
            break;

        case messageTypes.systemExclusive:
            this.synth.systemExclusive(event.messageData, offset);
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

        case messageTypes.reset:
            this.synth.stopAllChannels();
            this.synth.resetAllControllers();
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
        if(i === 9)
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