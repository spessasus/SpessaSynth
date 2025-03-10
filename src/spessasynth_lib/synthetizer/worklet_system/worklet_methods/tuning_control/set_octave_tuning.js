/**
 * Sets the octave tuning for a given channel
 * @this {SpessaSynthProcessor}
 * @param channel {number} usually 0-15: the channel to use
 * @param tuning {Int8Array} LENGTH of 12!
 * relative cent tuning.
 * min -128 max 127.
 */
export function setOctaveTuning(channel, tuning)
{
    if (tuning.length !== 12)
    {
        throw new Error("Tuning is not the length of 12.");
    }
    this.workletProcessorChannels[channel].channelOctaveTuning = tuning;
}