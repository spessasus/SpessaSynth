import { returnMessageType } from "./worklet_message.js";

import { modulatorSources } from "../../../soundfont/basic_soundfont/modulator.js";
import { customControllers, NON_CC_INDEX_OFFSET } from "../worklet_utilities/controller_tables.js";

/**
 * Calls synth event from the worklet side
 * @param eventName {EventTypes} the event name
 * @param eventData {EventCallbackData}
 * @this {SpessaSynthProcessor}
 */
export function callEvent(eventName, eventData)
{
    if (!this.enableEventSystem)
    {
        return;
    }
    this.post({
        messageType: returnMessageType.eventCall,
        messageData: {
            eventName: eventName,
            eventData: eventData
        }
    });
}

/**
 * @typedef {Object} ChannelProperty
 * @property {number} voicesAmount
 * @property {number} pitchBend - from -8192 do 8192
 * @property {number} pitchBendRangeSemitones - in semitones
 * @property {boolean} isMuted
 * @property {boolean} isDrum
 * @property {number} transposition
 */

/**
 * @this {SpessaSynthProcessor}
 */
export function sendChannelProperties()
{
    if (!this.enableEventSystem)
    {
        return;
    }
    /**
     * @type {ChannelProperty[]}
     */
    const data = this.workletProcessorChannels.map(c =>
    {
        return {
            voicesAmount: c.voices.length,
            pitchBend: c.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel],
            pitchBendRangeSemitones: c.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] / 128,
            isMuted: c.isMuted,
            isDrum: c.drumChannel,
            transposition: c.channelTransposeKeyShift + c.customControllers[customControllers.channelTransposeFine] / 100
        };
    });
    this.post({
        messageType: returnMessageType.channelProperties,
        messageData: data
    });
}