/**
 * Sets the octave tuning for a given channel
 * @this {MidiAudioChannel}
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
    this.channelOctaveTuning = new Int8Array(128);
    for (let i = 0; i < 128; i++)
    {
        this.channelOctaveTuning[i] = tuning[i % 12];
    }
}