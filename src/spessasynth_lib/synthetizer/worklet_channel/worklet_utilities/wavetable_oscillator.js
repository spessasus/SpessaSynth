/**
 * @param voice {WorkletVoice}
 * @param sampleData {Float32Array}
 * @param playbackRate {number}
 * @param startI {number} index
 * @param endI {number} index
 * @param loop {boolean}
 * @param loopStart {number} index
 * @param loopEnd {number} index
 * @returns {number}
 */
export function getOscillatorValue(voice, sampleData, playbackRate, startI, endI, loop, loopStart, loopEnd)
{
    const cur = voice.sample.cursor + startI;

    // linear interpolation
    const ceiling = Math.ceil(cur);
    const floor = ~~cur;
    const fraction = cur - floor;

    // grab the samples and interpolate
    const upper = sampleData[ceiling];
    const lower = sampleData[floor];

    // advance the sample
    voice.sample.cursor += voice.sample.playbackStep * playbackRate;

    if(!loop)
    {
        // if not looping, flag the voice as finished
        if(ceiling >= endI)
        {
            voice.finished = true;
            return 0;
        }
    }
    else
    {
        if(voice.sample.cursor >= loopEnd)
        {
            voice.sample.cursor -= loopEnd - loopStart;
        }
    }

    return (lower + (upper - lower) * fraction);
}