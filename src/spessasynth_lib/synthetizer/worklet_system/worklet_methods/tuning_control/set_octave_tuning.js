/**
 * Sets the octave tuning for a given channel
 * @this {WorkletProcessorChannel}
 * @param tuning {Int8Array} LENGTH of 12!
 * relative cent tuning.
 * min -128 max 127.
 */
export function setOctaveTuning(tuning)
{
    if (tuning.length !== 12)
    {
        throw new Error("Tuning is not the length of 12.");
    }
    this.channelOctaveTuning = tuning;
}