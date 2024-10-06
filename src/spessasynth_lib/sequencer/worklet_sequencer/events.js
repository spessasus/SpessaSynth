import { returnMessageType } from "../../synthetizer/worklet_system/message_protocol/worklet_message.js";
import { WorkletSequencerMessageType, WorkletSequencerReturnMessageType } from "./sequencer_message.js";
import { messageTypes, midiControllers } from "../../midi_parser/midi_message.js";
import { MIDI_CHANNEL_COUNT } from "../../synthetizer/synthetizer.js";

/**
 * @param messageType {WorkletSequencerMessageType}
 * @param messageData {any}
 * @this {WorkletSequencer}
 */
export function processMessage(messageType, messageData)
{
    switch (messageType)
    {
        default:
            break;
        
        case WorkletSequencerMessageType.loadNewSongList:
            this.loadNewSongList(messageData);
            break;
        
        case WorkletSequencerMessageType.pause:
            this.pause();
            break;
        
        case WorkletSequencerMessageType.play:
            this.play(messageData);
            break;
        
        case WorkletSequencerMessageType.stop:
            this.stop();
            break;
        
        case WorkletSequencerMessageType.setTime:
            this.currentTime = messageData;
            break;
        
        case WorkletSequencerMessageType.changeMIDIMessageSending:
            this.sendMIDIMessages = messageData;
            break;
        
        case WorkletSequencerMessageType.setPlaybackRate:
            this.playbackRate = messageData;
            break;
        
        case WorkletSequencerMessageType.setLoop:
            this.loop = messageData;
            break;
        
        case WorkletSequencerMessageType.changeSong:
            if (messageData)
            {
                this.nextSong();
            }
            else
            {
                this.previousSong();
            }
            break;
        
        case WorkletSequencerMessageType.getMIDI:
            this.post(WorkletSequencerReturnMessageType.getMIDI, this.midiData);
            break;
        
        case WorkletSequencerMessageType.setSkipToFirstNote:
            this._skipToFirstNoteOn = messageData;
            break;
    }
}

/**
 *
 * @param messageType {WorkletSequencerReturnMessageType}
 * @param messageData {any}
 * @this {WorkletSequencer}
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
 * @this {WorkletSequencer}
 */
export function sendMIDIMessage(message)
{
    this.post(WorkletSequencerReturnMessageType.midiEvent, message);
}

/**
 * @this {WorkletSequencer}
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
 * @this {WorkletSequencer}
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
 * @this {WorkletSequencer}
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
 * @this {WorkletSequencer}
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