import { getBankSelect } from "../../worklet_utilities/worklet_processor_channel.js";

/**
 * Toggles drums on a given channel
 * @param channel {number}
 * @param isDrum {boolean}
 * @this {SpessaSynthProcessor}
 */
export function setDrums(channel, isDrum)
{
    const channelObject = this.workletProcessorChannels[channel];
    if (channelObject.lockPreset)
    {
        return;
    }
    if (channelObject.drumChannel === isDrum)
    {
        return;
    }
    if (isDrum)
    {
        // clear transpose
        channelObject.channelTransposeKeyShift = 0;
        channelObject.drumChannel = true;
        this.setPreset(channel, this.getPreset(getBankSelect(channelObject), channelObject.preset.program));
    }
    else
    {
        channelObject.drumChannel = false;
        this.setPreset(
            channel,
            this.getPreset(
                getBankSelect(channelObject),
                channelObject.preset.program
            )
        );
    }
    channelObject.presetUsesOverride = false;
    this.callEvent("drumchange", {
        channel: channel,
        isDrumChannel: channelObject.drumChannel
    });
    this.sendChannelProperties();
}