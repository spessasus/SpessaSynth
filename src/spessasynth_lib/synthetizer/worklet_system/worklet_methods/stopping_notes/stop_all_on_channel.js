/**
 * stops all notes on a given channel
 * @param channel {number}
 * @param force {boolean}
 * @this {SpessaSynthProcessor}
 */
export function stopAllOnChannel(channel, force = false)
{
    const channelVoices = this.workletProcessorChannels[channel].voices;
    if (force)
    {
        // force stop all
        channelVoices.length = 0;
        this.workletProcessorChannels[channel].sustainedVoices.length = 0;
        this.sendChannelProperties();
    }
    else
    {
        channelVoices.forEach(v =>
        {
            if (v.isInRelease)
            {
                return;
            }
            this.releaseVoice(v);
        });
        this.workletProcessorChannels[channel].sustainedVoices.forEach(v =>
        {
            this.releaseVoice(v);
        });
    }
}