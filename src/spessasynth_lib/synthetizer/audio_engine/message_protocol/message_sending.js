import { returnMessageType } from "./worklet_message.js";

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