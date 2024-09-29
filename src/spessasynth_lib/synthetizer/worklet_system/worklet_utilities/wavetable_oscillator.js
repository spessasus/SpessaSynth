/**
 * wavetable_oscillator.js
 * purpose: plays back raw audio data at an arbitrary playback rate
 */

/**
 *
 * @enum {number}
 */
export const interpolationTypes = {
    linear: 0,
    nearestNeighbor: 1,
    fourthOrder: 2,
}


/**
 * Fills the output buffer with raw sample data using linear interpolation
 * @param voice {WorkletVoice} the voice we're working on
 * @param outputBuffer {Float32Array} the output buffer to write to
 */
export function getSampleLinear(voice, outputBuffer)
{
    const sample = voice.sample;
    let cur = sample.cursor;
    const sampleData = sample.sampleData;

    if(sample.isLooping)
    {
        const loopLength = sample.loopEnd - sample.loopStart;
        for (let i = 0; i < outputBuffer.length; i++)
        {
            // check for loop
            while(cur >= sample.loopEnd)
            {
                cur -= loopLength;
            }

            // grab the 2 nearest points
            const floor = ~~cur;
            let ceil = floor + 1;

            while(ceil >= sample.loopEnd)
            {
                ceil -= loopLength;
            }

            const fraction = cur - floor;

            // grab the samples and interpolate
            const upper = sampleData[ceil];
            const lower = sampleData[floor];
            outputBuffer[i] = (lower + (upper - lower) * fraction);

            cur += sample.playbackStep * voice.currentTuningCalculated;
        }
    }
    else
    {
        // check and correct end errors
        if(sample.end >= sampleData.length)
        {
            sample.end = sampleData.length - 1;
        }
        for (let i = 0; i < outputBuffer.length; i++)
        {

            // linear interpolation
            const floor = ~~cur;
            const ceil = floor + 1;

            // flag the voice as finished if needed
            if(ceil >= sample.end)
            {
                voice.finished = true;
                return;
            }

            const fraction = cur - floor;

            // grab the samples and interpolate
            const upper = sampleData[ceil];
            const lower = sampleData[floor];
            outputBuffer[i] = (lower + (upper - lower) * fraction);

            cur += sample.playbackStep * voice.currentTuningCalculated;
        }
    }
    voice.sample.cursor = cur;
}

/**
 * Fills the output buffer with raw sample data using no interpolation (nearest neighbor)
 * @param voice {WorkletVoice} the voice we're working on
 * @param outputBuffer {Float32Array} the output buffer to write to
 */
export function getSampleNearest(voice, outputBuffer)
{
    const sample = voice.sample;
    let cur = sample.cursor;
    const loopLength = sample.loopEnd - sample.loopStart;
    const sampleData = sample.sampleData;
    if(voice.sample.isLooping)
    {
        for (let i = 0; i < outputBuffer.length; i++)
        {
            // check for loop
            while(cur >= sample.loopEnd)
            {
                cur -= loopLength;
            }

            // grab the nearest neighbor
            let ceil = ~~cur + 1;

            while(ceil >= sample.loopEnd)
            {
                ceil -= loopLength;
            }

            outputBuffer[i] = sampleData[ceil];
            cur += sample.playbackStep * voice.currentTuningCalculated;
        }
    }
    else
    {
        // check and correct end errors
        if(sample.end >= sampleData.length)
        {
            sample.end = sampleData.length - 1;
        }
        for (let i = 0; i < outputBuffer.length; i++)
        {

            // nearest neighbor
            const ceil = ~~cur + 1;

            // flag the voice as finished if needed
            if(ceil >= sample.end)
            {
                voice.finished = true;
                return;
            }

            //nearest neighbor (uncomment to use)
            outputBuffer[i] = sampleData[ceil];
            cur += sample.playbackStep * voice.currentTuningCalculated;
        }
    }
    sample.cursor = cur;
}