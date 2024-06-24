import { returnMessageType } from './worklet_message.js'
import { NON_CC_INDEX_OFFSET } from '../worklet_utilities/worklet_processor_channel.js'
import { modulatorSources } from '../../../soundfont/chunk/modulators.js'

/**
 * Calls synth event from the worklet side
 * @param eventName {EventTypes} the event name
 * @param eventData {any}
 * @this {SpessaSynthProcessor}
 */
export function callEvent(eventName, eventData)
{
    if(!this.enableEventSystem)
    {
        return;
    }
    this.post({
        messageType: returnMessageType.eventCall,
        messageData: {
            eventName: eventName,
            eventData: eventData
        }
    })
}

/**
 * @param data {WorkletReturnMessage}
 * @this {SpessaSynthProcessor}
 */
export function post(data)
{
    if(!this.enableEventSystem)
    {
        return;
    }
    this.port.postMessage(data);
}

/**
 * @typedef {Object} ChannelProperty
 * @property {number} voicesAmount
 * @property {number} pitchBend - from -8192 do 8192
 * @property {number} pitchBendRangeSemitones - in semitones
 * @property {boolean} isMuted
 * @property {boolean} isDrum
 */

/**
 * @this {SpessaSynthProcessor}
 */
export function sendChannelProperties()
{
    if(!this.enableEventSystem)
    {
        return;
    }
    /**
     * @type {ChannelProperty[]}
     */
    const data = this.workletProcessorChannels.map(c => {
        return {
            voicesAmount: c.voices.length,
            pitchBend: c.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel],
            pitchBendRangeSemitones: c.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] >> 7,
            isMuted: c.isMuted,
            isDrum: c.drumChannel
        }
    });
    this.post({
        messageType: returnMessageType.channelProperties,
        messageData: data
    });
}