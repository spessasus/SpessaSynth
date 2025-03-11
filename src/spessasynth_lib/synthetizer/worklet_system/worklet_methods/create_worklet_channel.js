import { WorkletProcessorChannel } from "../worklet_utilities/worklet_processor_channel.js";
import { DEFAULT_PERCUSSION } from "../../synthetizer.js";

/**
 * @param sendEvent {boolean}
 * @this {SpessaSynthProcessor}
 */
export function createWorkletChannel(sendEvent = false)
{
    /**
     * @type {WorkletProcessorChannel}
     */
    const channel = new WorkletProcessorChannel(this, this.defaultPreset, this.workletProcessorChannels.length);
    this.workletProcessorChannels.push(channel);
    channel.resetControllers();
    this.sendChannelProperties();
    if (sendEvent)
    {
        this.callEvent("newchannel", undefined);
    }
    
    if (channel.channelNumber % 16 === DEFAULT_PERCUSSION)
    {
        this.workletProcessorChannels[this.workletProcessorChannels.length - 1].setDrums(true);
    }
}