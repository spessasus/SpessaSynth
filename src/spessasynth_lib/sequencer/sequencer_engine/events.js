import { messageTypes, midiControllers } from "../../midi/midi_message.js";

import { MIDI_CHANNEL_COUNT } from "../../synthetizer/synth_constants.js";

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
    this?.onMIDIMessage?.(message);
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