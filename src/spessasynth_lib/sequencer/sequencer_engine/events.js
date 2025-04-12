import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    returnMessageType
} from "../../synthetizer/audio_engine/message_protocol/worklet_message.js";
import {
    SongChangeType,
    SpessaSynthSequencerMessageType,
    SpessaSynthSequencerReturnMessageType
} from "../worklet_wrapper/sequencer_message.js";
import { messageTypes, midiControllers } from "../../midi_parser/midi_message.js";

import { MIDI_CHANNEL_COUNT } from "../../synthetizer/synth_constants.js";

/**
 * @param messageType {SpessaSynthSequencerMessageType}
 * @param messageData {any}
 * @this {SpessaSynthSequencer}
 */
export function processMessage(messageType, messageData)
{
    switch (messageType)
    {
        default:
            break;
        
        case SpessaSynthSequencerMessageType.loadNewSongList:
            this.loadNewSongList(messageData[0], messageData[1]);
            break;
        
        case SpessaSynthSequencerMessageType.pause:
            this.pause();
            break;
        
        case SpessaSynthSequencerMessageType.play:
            this.play(messageData);
            break;
        
        case SpessaSynthSequencerMessageType.stop:
            this.stop();
            break;
        
        case SpessaSynthSequencerMessageType.setTime:
            this.currentTime = messageData;
            break;
        
        case SpessaSynthSequencerMessageType.changeMIDIMessageSending:
            this.sendMIDIMessages = messageData;
            break;
        
        case SpessaSynthSequencerMessageType.setPlaybackRate:
            this.playbackRate = messageData;
            break;
        
        case SpessaSynthSequencerMessageType.setLoop:
            const [loop, count] = messageData;
            this.loop = loop;
            if (count === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                this.loopCount = Infinity;
            }
            else
            {
                this.loopCount = count;
            }
            break;
        
        case SpessaSynthSequencerMessageType.changeSong:
            switch (messageData[0])
            {
                case SongChangeType.forwards:
                    this.nextSong();
                    break;
                
                case SongChangeType.backwards:
                    this.previousSong();
                    break;
                
                case SongChangeType.shuffleOff:
                    this.shuffleMode = false;
                    this.songIndex = this.shuffledSongIndexes[this.songIndex];
                    break;
                
                case SongChangeType.shuffleOn:
                    this.shuffleMode = true;
                    this.shuffleSongIndexes();
                    this.songIndex = 0;
                    this.loadCurrentSong();
                    break;
                
                case SongChangeType.index:
                    this.songIndex = messageData[1];
                    this.loadCurrentSong();
                    break;
            }
            break;
        
        case SpessaSynthSequencerMessageType.getMIDI:
            this.post(SpessaSynthSequencerReturnMessageType.getMIDI, this.midiData);
            break;
        
        case SpessaSynthSequencerMessageType.setSkipToFirstNote:
            this.skipToFirstNoteOn = messageData;
            break;
        
        case SpessaSynthSequencerMessageType.setPreservePlaybackState:
            this.preservePlaybackState = messageData;
    }
}

/**
 *
 * @param messageType {SpessaSynthSequencerReturnMessageType}
 * @param messageData {any}
 * @this {SpessaSynthSequencer}
 */
export function post(messageType, messageData = undefined)
{
    if (!this.synth.enableEventSystem)
    {
        return;
    }
    this.synth.post({
        messageType: returnMessageType.sequencerSpecific,
        messageData: {
            messageType: messageType,
            messageData: messageData
        }
    });
}

/**
 * @param message {number[]}
 * @this {SpessaSynthSequencer}
 */
export function sendMIDIMessage(message)
{
    if (!this.sendMIDIMessages)
    {
        return;
    }
    this.post(SpessaSynthSequencerReturnMessageType.midiEvent, message);
}

/**
 * @this {SpessaSynthSequencer}
 * @param channel {number}
 * @param type {number}
 * @param value {number}
 */
export function sendMIDICC(channel, type, value)
{
    channel %= 16;
    if (!this.sendMIDIMessages)
    {
        return;
    }
    this.sendMIDIMessage([messageTypes.controllerChange | channel, type, value]);
}

/**
 * @this {SpessaSynthSequencer}
 * @param channel {number}
 * @param program {number}
 */
export function sendMIDIProgramChange(channel, program)
{
    channel %= 16;
    if (!this.sendMIDIMessages)
    {
        return;
    }
    this.sendMIDIMessage([messageTypes.programChange | channel, program]);
}

/**
 * Sets the pitch of the given channel
 * @this {SpessaSynthSequencer}
 * @param channel {number} usually 0-15: the channel to change pitch
 * @param MSB {number} SECOND byte of the MIDI pitchWheel message
 * @param LSB {number} FIRST byte of the MIDI pitchWheel message
 */
export function sendMIDIPitchWheel(channel, MSB, LSB)
{
    channel %= 16;
    if (!this.sendMIDIMessages)
    {
        return;
    }
    this.sendMIDIMessage([messageTypes.pitchBend | channel, LSB, MSB]);
}

/**
 * @this {SpessaSynthSequencer}
 */
export function sendMIDIReset()
{
    if (!this.sendMIDIMessages)
    {
        return;
    }
    this.sendMIDIMessage([messageTypes.reset]);
    for (let ch = 0; ch < MIDI_CHANNEL_COUNT; ch++)
    {
        this.sendMIDIMessage([messageTypes.controllerChange | ch, midiControllers.allSoundOff, 0]);
        this.sendMIDIMessage([messageTypes.controllerChange | ch, midiControllers.resetAllControllers, 0]);
    }
}