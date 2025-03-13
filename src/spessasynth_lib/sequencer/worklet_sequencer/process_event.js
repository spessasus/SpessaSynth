import { getEvent, messageTypes } from "../../midi_parser/midi_message.js";
import { WorkletSequencerReturnMessageType } from "./sequencer_message.js";
import { consoleColors } from "../../utils/other.js";
import { SpessaSynthWarn } from "../../utils/loggin.js";
import { readBytesAsUintBigEndian } from "../../utils/byte_functions/big_endian.js";

/**
 * Processes a single event
 * @param event {MidiMessage}
 * @param trackIndex {number}
 * @this {WorkletSequencer}
 * @private
 */
export function _processEvent(event, trackIndex)
{
    if (this.ignoreEvents)
    {
        return;
    }
    if (this.sendMIDIMessages)
    {
        if (event.messageStatusByte >= 0x80)
        {
            this.sendMIDIMessage([event.messageStatusByte, ...event.messageData]);
            return;
        }
    }
    const statusByteData = getEvent(event.messageStatusByte);
    const offset = this.midiPortChannelOffsets[this.midiPorts[trackIndex]] || 0;
    statusByteData.channel += offset;
    // process the event
    switch (statusByteData.status)
    {
        case messageTypes.noteOn:
            const velocity = event.messageData[1];
            if (velocity > 0)
            {
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
                const toDelete = this.playingNotes.findIndex(n =>
                    n.midiNote === event.messageData[0] && n.channel === statusByteData.channel);
                if (toDelete !== -1)
                {
                    this.playingNotes.splice(toDelete, 1);
                }
            }
            break;
        
        case messageTypes.noteOff:
            this.synth.noteOff(statusByteData.channel, event.messageData[0]);
            const toDelete = this.playingNotes.findIndex(n =>
                n.midiNote === event.messageData[0] && n.channel === statusByteData.channel);
            if (toDelete !== -1)
            {
                this.playingNotes.splice(toDelete, 1);
            }
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
            event.messageData.currentIndex = 0;
            let tempoBPM = 60000000 / readBytesAsUintBigEndian(event.messageData, 3);
            this.oneTickToSeconds = 60 / (tempoBPM * this.midiData.timeDivision);
            if (this.oneTickToSeconds === 0)
            {
                this.oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
                SpessaSynthWarn("invalid tempo! falling back to 120 BPM");
                tempoBPM = 120;
            }
            break;
        
        // recongized but ignored
        case messageTypes.timeSignature:
        case messageTypes.endOfTrack:
        case messageTypes.midiChannelPrefix:
        case messageTypes.songPosition:
        case messageTypes.activeSensing:
        case messageTypes.keySignature:
        case messageTypes.sequenceNumber:
        case messageTypes.sequenceSpecific:
            break;
        
        case messageTypes.text:
        case messageTypes.lyric:
        case messageTypes.copyright:
        case messageTypes.trackName:
        case messageTypes.marker:
        case messageTypes.cuePoint:
        case messageTypes.instrumentName:
        case messageTypes.programName:
            let lyricsIndex = -1;
            if (statusByteData.status === messageTypes.lyric)
            {
                lyricsIndex = Math.min(
                    this.midiData.lyricsTicks.indexOf(event.ticks) + 1,
                    this.midiData.lyrics.length - 1
                );
            }
            let sentStatus = statusByteData.status;
            // if MIDI is a karaoke file, it uses the "text" event type or "lyrics" for lyrics (duh)
            // why?
            // because the MIDI standard is a messy pile of garbage, and it's not my fault that it's like this :(
            // I'm just trying to make the best out of a bad situation.
            // I'm sorry
            // okay I should get back to work
            // anyway,
            // check for a karaoke file and change the status byte to "lyric" if it's a karaoke file
            if (this.midiData.isKaraokeFile && (
                statusByteData.status === messageTypes.text ||
                statusByteData.status === messageTypes.lyric
            ))
            {
                lyricsIndex = Math.min(
                    this.midiData.lyricsTicks.indexOf(event.ticks),
                    this.midiData.lyricsTicks.length
                );
                sentStatus = messageTypes.lyric;
            }
            this.post(
                WorkletSequencerReturnMessageType.textEvent,
                [event.messageData, sentStatus, lyricsIndex]
            );
            break;
        
        case messageTypes.midiPort:
            this.assignMIDIPort(trackIndex, event.messageData[0]);
            break;
        
        case messageTypes.reset:
            this.synth.stopAllChannels();
            this.synth.resetAllControllers();
            break;
        
        default:
            SpessaSynthWarn(
                `%cUnrecognized Event: %c${event.messageStatusByte}%c status byte: %c${Object.keys(
                    messageTypes).find(k => messageTypes[k] === statusByteData.status)}`,
                consoleColors.warn,
                consoleColors.unrecognized,
                consoleColors.warn,
                consoleColors.value
            );
            break;
    }
    if (statusByteData.status >= 0 && statusByteData.status < 0x80)
    {
        this.post(WorkletSequencerReturnMessageType.metaEvent, [event.messageStatusByte, event.messageData]);
    }
}

/**
 * Adds 16 channels to the synth
 * @this {WorkletSequencer}
 * @private
 */
export function _addNewMidiPort()
{
    for (let i = 0; i < 16; i++)
    {
        this.synth.createWorkletChannel(true);
    }
}