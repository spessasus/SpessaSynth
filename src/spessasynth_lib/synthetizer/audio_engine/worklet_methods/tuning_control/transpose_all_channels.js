/**
 * Transposes all channels by given amount of semitones
 * @this {SpessaSynthProcessor}
 * @param semitones {number} Can be float
 * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
 */
export function transposeAllChannels(semitones, force = false)
{
    this.transposition = 0;
    for (let i = 0; i < this.midiAudioChannels.length; i++)
    {
        this.midiAudioChannels[i].transposeChannel(semitones, force);
    }
    this.transposition = semitones;
}