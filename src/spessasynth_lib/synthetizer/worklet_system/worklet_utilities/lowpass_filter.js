import { generatorTypes } from '../../../soundfont/read/generators.js'
import { absCentsToHz, decibelAttenuationToGain } from './unit_converter.js'

/**
 * lowpass_filter.js
 * purpose: applies a low pass filter to a voice
 * note to self: most of this is code is just javascript version of the C code from fluidsynth,
 * they are the real smart guys.
 * Shoutout to them!
 */


/**
 * @typedef {Object} WorkletLowpassFilter
 * @property {number} a0 - filter coefficient 1
 * @property {number} a1 - filter coefficient 2
 * @property {number} a2 - filter coefficient 3
 * @property {number} a3 - filter coefficient 4
 * @property {number} a4 - filter coefficient 5
 * @property {number} x1 - input history 1
 * @property {number} x2 - input history 2
 * @property {number} y1 - output history 1
 * @property {number} y2 - output history 2
 * @property {number} reasonanceCb - reasonance in centibels
 * @property {number} reasonanceGain - resonance gain
 * @property {number} cutoffCents - cutoff frequency in cents
 * @property {number} cutoffHz - cutoff frequency in Hz
 */

/**
 * @type {WorkletLowpassFilter}
 */
export const DEFAULT_WORKLET_LOWPASS_FILTER = {
    a0: 0,
    a1: 0,
    a2: 0,
    a3: 0,
    a4: 0,

    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,

    reasonanceCb: 0,
    reasonanceGain: 1,
    cutoffCents: 13500,
    cutoffHz: 20000
}

/**
 * Applies a low-pass filter to the given buffer
 * @param voice {WorkletVoice} the voice we're working on
 * @param outputBuffer {Float32Array} the buffer to apply the filter to
 * @param cutoffCents {number} cutoff frequency in cents
 */
export function applyLowpassFilter(voice, outputBuffer, cutoffCents)
{
    if(cutoffCents > 13499)
    {
        return; // filter is open
    }

    // check if the frequency has changed. if so, calculate new coefficients
    if(voice.filter.cutoffCents !== cutoffCents || voice.filter.reasonanceCb !== voice.modulatedGenerators[generatorTypes.initialFilterQ])
    {
        voice.filter.cutoffCents = cutoffCents;
        voice.filter.reasonanceCb = voice.modulatedGenerators[generatorTypes.initialFilterQ];
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
    voice.filter.cutoffHz = absCentsToHz(voice.filter.cutoffCents);

    // fix cutoff on low frequencies (fluid_iir_filter.c line 392)
    if(voice.filter.cutoffHz > 0.45 * sampleRate)
    {
        voice.filter.cutoffHz = 0.45 * sampleRate;
    }

    // adjust the filterQ (fluid_iir_filter.c line 204)
    const qDb = (voice.filter.reasonanceCb / 10) - 3.01;
    voice.filter.reasonanceGain = decibelAttenuationToGain(-1 * qDb); // -1 because it's attenuation and we don't want attenuation

    // reduce the gain by the Q factor (fluid_iir_filter.c line 250)
    const qGain = 1 / Math.sqrt(voice.filter.reasonanceGain);


    // code is ported from https://github.com/sinshu/meltysynth/ to work with js. I'm too dumb to understand the math behind this...
    let w = 2 * Math.PI * voice.filter.cutoffHz / sampleRate; // we're in the audioworkletglobalscope so we can use sampleRate
    let cosw = Math.cos(w);
    let alpha = Math.sin(w) / (2 * voice.filter.reasonanceGain);

    let b1 = (1 - cosw) * qGain;
    let b0 = b1 / 2;
    let b2 = b0;
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