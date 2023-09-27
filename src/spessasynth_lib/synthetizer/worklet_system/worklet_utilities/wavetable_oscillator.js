/**
 * @param voice {WorkletVoice}
 * @param sampleData {Float32Array}
 * @param playbackRate {number}
 * @param outputBuffer {Float32Array}
 */
export function getOscillatorData(voice, sampleData, playbackRate, outputBuffer)
{
    let cur = voice.sample.cursor;
    const loop = (voice.sample.loopingMode === 1) || (voice.sample.loopingMode === 3 && !voice.isInRelease);
    const loopLength = voice.sample.loopEnd - voice.sample.loopStart;

    if(loop)
    {
        for (let i = 0; i < outputBuffer.length; i++) {
            // check for loop
            if (cur > voice.sample.loopEnd) {
                cur -= loopLength;
            }

            // grab the 2 nearest points
            const floor = ~~cur;
            let ceil = floor + 1;

            if(ceil > voice.sample.loopEnd)
            {
                ceil -= loopLength;
            }

            const fraction = cur - floor;

            // grab the samples and interpolate
            const upper = sampleData[ceil];
            const lower = sampleData[floor];
            outputBuffer[i] = (lower + (upper - lower) * fraction);

            cur += voice.sample.playbackStep * playbackRate;
        }
    }
    else
    {
        for (let i = 0; i < outputBuffer.length; i++) {

            // linear interpolation
            const floor = ~~cur;
            const ceil = floor + 1;

            // flag the voice as finished if needed
            if(ceil >= voice.sample.end)
            {
                voice.finished = true;
                return;
            }

            const fraction = cur - floor;

            // grab the samples and interpolate
            const upper = sampleData[ceil];
            const lower = sampleData[floor];
            outputBuffer[i] = (lower + (upper - lower) * fraction);

            cur += voice.sample.playbackStep * playbackRate;
        }
    }
    voice.sample.cursor = cur;
}