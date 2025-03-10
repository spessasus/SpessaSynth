/**
 * @param channel {number}
 * @param isMuted {boolean}
 * @this {SpessaSynthProcessor}
 */
export function muteChannel(channel, isMuted)
{
    if (isMuted)
    {
        this.stopAllOnChannel(channel, true);
    }
    this.workletProcessorChannels[channel].isMuted = isMuted;
    this.sendChannelProperties();
    this.callEvent("mutechannel", {
        channel: channel,
        isMuted: isMuted
    });
}