/**
 * @param voice {WorkletVoice}
 * @param sampleData {Float32Array}
 * @param playbackRate {number}
 * @returns {number}
 */
export function getOscillatorValue(voice, sampleData, playbackRate)
{
    const cur = voice.sample.cursor;

    // linear interpolation
    const floor = ~~cur;
    const ceil = floor + 1;
    const fraction = cur - floor;

    // grab the samples and interpolate
    const upper = sampleData[ceil];
    const lower = sampleData[floor];

    // advance the sample
    voice.sample.cursor += voice.sample.playbackStep * playbackRate;

    if((voice.sample.loopingMode === 1) || (voice.sample.loopingMode === 3 && !voice.isInRelease))
    {
        if (voice.sample.cursor > voice.sample.loopEnd) {
            voice.sample.cursor -= voice.sample.loopEnd - voice.sample.loopStart;
        }
    }
    else
    {
        // if not looping, flag the voice as finished
        if(ceil >= voice.sample.end)
        {
            voice.finished = true;
            return 0;
        }
    }

    return (lower + (upper - lower) * fraction);
}