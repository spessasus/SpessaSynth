/**
 * stops all notes on a given channel
 * @param force {boolean}
 * @this {WorkletProcessorChannel}
 */
export function stopAllNotes(force = false)
{
    if (force)
    {
        // force stop all
        this.voices.length = 0;
        this.sustainedVoices.length = 0;
        this.synth.sendChannelProperties();
    }
    else
    {
        this.voices.forEach(v =>
        {
            if (v.isInRelease)
            {
                return;
            }
            v.release();
        });
        this.sustainedVoices.forEach(v =>
        {
            v.release();
        });
    }
}