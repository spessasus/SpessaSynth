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
    fourthOrder: 2
};


export class WavetableOscillator
{
    
    /**
     * Fills the output buffer with raw sample data using linear interpolation
     * @param voice {Voice} the voice we're working on
     * @param outputBuffer {Float32Array} the output buffer to write to
     */
    static getSampleLinear(voice, outputBuffer)
    {
        const sample = voice.sample;
        let cur = sample.cursor;
        const sampleData = sample.sampleData;
        
        if (sample.isLooping)
        {
            const loopLength = sample.loopEnd - sample.loopStart;
            for (let i = 0; i < outputBuffer.length; i++)
            {
                // check for loop
                while (cur >= sample.loopEnd)
                {
                    cur -= loopLength;
                }
                
                // grab the 2 nearest points
                const floor = ~~cur;
                let ceil = floor + 1;
                
                while (ceil >= sample.loopEnd)
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
            if (sample.loopingMode === 2 && !voice.isInRelease)
            {
                return;
            }
            for (let i = 0; i < outputBuffer.length; i++)
            {
                
                // linear interpolation
                const floor = ~~cur;
                const ceil = floor + 1;
                
                // flag the voice as finished if needed
                if (ceil >= sample.end)
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
     * @param voice {Voice} the voice we're working on
     * @param outputBuffer {Float32Array} the output buffer to write to
     */
    static getSampleNearest(voice, outputBuffer)
    {
        const sample = voice.sample;
        let cur = sample.cursor;
        const loopLength = sample.loopEnd - sample.loopStart;
        const sampleData = sample.sampleData;
        if (voice.sample.isLooping)
        {
            for (let i = 0; i < outputBuffer.length; i++)
            {
                // check for loop
                while (cur >= sample.loopEnd)
                {
                    cur -= loopLength;
                }
                
                // grab the nearest neighbor
                let ceil = ~~cur + 1;
                
                while (ceil >= sample.loopEnd)
                {
                    ceil -= loopLength;
                }
                
                outputBuffer[i] = sampleData[ceil];
                cur += sample.playbackStep * voice.currentTuningCalculated;
            }
        }
        else
        {
            if (sample.loopingMode === 2 && !voice.isInRelease)
            {
                return;
            }
            for (let i = 0; i < outputBuffer.length; i++)
            {
                
                // nearest neighbor
                const ceil = ~~cur + 1;
                
                // flag the voice as finished if needed
                if (ceil >= sample.end)
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
    
    
    /**
     * Fills the output buffer with raw sample data using cubic interpolation
     * @param voice {Voice} the voice we're working on
     * @param outputBuffer {Float32Array} the output buffer to write to
     */
    static getSampleCubic(voice, outputBuffer)
    {
        const sample = voice.sample;
        let cur = sample.cursor;
        const sampleData = sample.sampleData;
        
        if (sample.isLooping)
        {
            const loopLength = sample.loopEnd - sample.loopStart;
            for (let i = 0; i < outputBuffer.length; i++)
            {
                // check for loop
                while (cur >= sample.loopEnd)
                {
                    cur -= loopLength;
                }
                
                // math comes from
                // https://stackoverflow.com/questions/1125666/how-do-you-do-bicubic-or-other-non-linear-interpolation-of-re-sampled-audio-da
                
                // grab the 4 points
                const y0 = ~~cur;   // point before the cursor. twice bitwise not is just a faster Math.floor
                let y1 = y0 + 1;    // point after the cursor
                let y2 = y1 + 1;    // point 1 after the cursor
                let y3 = y2 + 1;    // point 2 after the cursor
                const t = cur - y0; // distance from y0 to cursor
                // y0 is not handled here
                // as it's math.floor of cur which is handled above
                if (y1 >= sample.loopEnd)
                {
                    y1 -= loopLength;
                }
                if (y2 >= sample.loopEnd)
                {
                    y2 -= loopLength;
                }
                if (y3 >= sample.loopEnd)
                {
                    y3 -= loopLength;
                }
                
                // grab the samples
                const x0 = sampleData[y0];
                const x1 = sampleData[y1];
                const x2 = sampleData[y2];
                const x3 = sampleData[y3];
                
                // interpolate
                // const c0 = x1
                const c1 = 0.5 * (x2 - x0);
                const c2 = x0 - (2.5 * x1) + (2 * x2) - (0.5 * x3);
                const c3 = (0.5 * (x3 - x0)) + (1.5 * (x1 - x2));
                outputBuffer[i] = (((((c3 * t) + c2) * t) + c1) * t) + x1;
                
                
                cur += sample.playbackStep * voice.currentTuningCalculated;
            }
        }
        else
        {
            if (sample.loopingMode === 2 && !voice.isInRelease)
            {
                return;
            }
            for (let i = 0; i < outputBuffer.length; i++)
            {
                
                // math comes from
                // https://stackoverflow.com/questions/1125666/how-do-you-do-bicubic-or-other-non-linear-interpolation-of-re-sampled-audio-da
                
                // grab the 4 points
                const y0 = ~~cur;   // point before the cursor. twice bitwise not is just a faster Math.floor
                let y1 = y0 + 1;    // point after the cursor
                let y2 = y1 + 1;    // point 1 after the cursor
                let y3 = y2 + 1;    // point 2 after the cursor
                const t = cur - y0; // distance from y0 to cursor
                
                // flag as finished if needed
                if (y1 >= sample.end ||
                    y2 >= sample.end ||
                    y3 >= sample.end)
                {
                    voice.finished = true;
                    return;
                }
                
                // grab the samples
                const x0 = sampleData[y0];
                const x1 = sampleData[y1];
                const x2 = sampleData[y2];
                const x3 = sampleData[y3];
                
                // interpolate
                const c1 = 0.5 * (x2 - x0);
                const c2 = x0 - (2.5 * x1) + (2 * x2) - (0.5 * x3);
                const c3 = (0.5 * (x3 - x0)) + (1.5 * (x1 - x2));
                outputBuffer[i] = (((((c3 * t) + c2) * t) + c1) * t) + x1;
                
                cur += sample.playbackStep * voice.currentTuningCalculated;
            }
        }
        voice.sample.cursor = cur;
    }
}