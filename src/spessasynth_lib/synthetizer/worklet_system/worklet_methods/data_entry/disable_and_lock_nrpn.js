/**
 * @param channel {number}
 * @this {SpessaSynthProcessor}
 */
export function disableAndLockGSNRPN(channel)
{
    this.workletProcessorChannels[channel].lockGSNRPNParams = true;
    this.workletProcessorChannels[channel].channelVibrato.rate = 0;
    this.workletProcessorChannels[channel].channelVibrato.delay = 0;
    this.workletProcessorChannels[channel].channelVibrato.depth = 0;
}