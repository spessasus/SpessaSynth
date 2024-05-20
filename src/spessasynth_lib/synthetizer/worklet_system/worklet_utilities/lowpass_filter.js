import { generatorTypes } from '../../../soundfont/chunk/generators.js'
import { absCentsToHz, decibelAttenuationToGain } from './unit_converter.js'

/**
 * Applies a low-pass filter to the given buffer
 * @param voice {WorkletVoice} the voice we're working on
 * @param outputBuffer {Float32Array} the buffer to apply the filter to
 * @param cutoffCents {number} cutoff frequency in cents
 */
export function applyLowpassFilter(voice, outputBuffer, cutoffCents)
{
    if(cutoffCents > 13490)
    {
        return; // filter is open
    }
    // check if the frequency has changed. if so, calculate new coefficients
    if(voice.filter.cutoffCents !== cutoffCents || voice.filter.reasonanceCb !== voice.modulatedGenerators[generatorTypes.initialFilterQ])
    {
        voice.filter.cutoffCents = cutoffCents;
        voice.filter.reasonanceCb = voice.modulatedGenerators[generatorTypes.initialFilterQ];
        voice.filter.cutoffHz = absCentsToHz(cutoffCents);
        //                                                                                                      \/ adjust the filterQ (fluid_iir_filter.h line 204)
        voice.filter.reasonanceGain = decibelAttenuationToGain(-1 * ((voice.filter.reasonanceCb / 10) - 3.01)); // -1 because it's attenuation that we're inverting
        calculateCoefficients(voice);
    }

    // filter the input
    for (let i = 0; i < outputBuffer.length; i++) {
        let input = outputBuffer[i];
        let filtered = voice.filter.a0 * input
            + voice.filter.a1 * voice.filter.x1
            + voice.filter.a2 * voice.filter.x2
            - voice.filter.a3 * voice.filter.y1
            - voice.filter.a4 * voice.filter.y2;

        // set buffer
        voice.filter.x2 = voice.filter.x1;
        voice.filter.x1 = input;
        voice.filter.y2 = voice.filter.y1;
        voice.filter.y1 = filtered;

        outputBuffer[i] = filtered;
    }
}

/**
 * @param voice {WorkletVoice}
 */
function calculateCoefficients(voice)
{
    // code is ported from https://github.com/sinshu/meltysynth/ to work with js. I'm too dumb to understand the math behind this...
    let w = 2 * Math.PI * voice.filter.cutoffHz / sampleRate; // we're in the audioworkletglobalscope so we can use sampleRate
    let cosw = Math.cos(w);
    let alpha = Math.sin(w) / (2 * voice.filter.reasonanceGain);

    let b0 = (1 - cosw) / 2;
    let b1 = 1 - cosw;
    let b2 = (1 - cosw) / 2;
    let a0 = 1 + alpha;
    let a1 = -2 * cosw;
    let a2 = 1 - alpha;

    // set coefficients
    voice.filter.a0 = b0 / a0;
    voice.filter.a1 = b1 / a0;
    voice.filter.a2 = b2 / a0;
    voice.filter.a3 = a1 / a0;
    voice.filter.a4 = a2 / a0;
}