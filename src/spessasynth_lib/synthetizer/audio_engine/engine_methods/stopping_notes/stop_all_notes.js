/**
 * stops all notes on a given channel
 * @param force {boolean}
 * @this {MidiAudioChannel}
 */
export function stopAllNotes(force = false)
{
    if (force)
    {
        // force stop all
        this.voices.length = 0;
        this.sustainedVoices.length = 0;
        this.sendChannelProperty();
    }
    else
    {
        this.voices.forEach(v =>
        {
            if (v.isInRelease)
            {
                return;
            }
            v.release(this.synth.currentSynthTime);
        });
        this.sustainedVoices.forEach(v =>
        {
            v.release(this.synth.currentSynthTime);
        });
    }
}