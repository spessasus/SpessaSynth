import { WorkletProcessorChannel } from "../worklet_utilities/worklet_processor_channel.js";

import { DEFAULT_PERCUSSION } from "../../synth_constants.js";

/**
 * @param sendEvent {boolean}
 * @this {SpessaSynthProcessor}
 */
export function createWorkletChannel(sendEvent = false)
{
    /**
     * @type {WorkletProcessorChannel}
     */
    const channel = new WorkletProcessorChannel(this, this.defaultPreset, this.midiAudioChannels.length);
    this.midiAudioChannels.push(channel);
    channel.resetControllers();
    channel.sendChannelProperty();
    if (sendEvent)
    {
        this.callEvent("newchannel", undefined);
    }
    
    if (channel.channelNumber % 16 === DEFAULT_PERCUSSION)
    {
        this.midiAudioChannels[this.midiAudioChannels.length - 1].setDrums(true);
    }
}