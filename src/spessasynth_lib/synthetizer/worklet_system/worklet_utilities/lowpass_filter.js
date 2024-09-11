import { generatorTypes } from '../../../soundfont/read_sf2/generators.js'
import { absCentsToHz, decibelAttenuationToGain } from './unit_converter.js'

/**
 * lowpass_filter.js
 * purpose: applies a low pass filter to a voice
 * note to self: most of this is code is just javascript version of the C code from fluidsynth,
 * they are the real smart guys.
 * Shoutout to them!
 */

export class WorkletLowpassFilter
{
    /**
     * Filter coefficient 1
     * @type {number}
     */
    a0 = 0;

    /**
     * Filter coefficient 2
     * @type {number}
     */
    a1 = 0;

    /**
     * Filter coefficient 3
     * @type {number}
     */
    a2 = 0;

    /**
     * Filter coefficient 4
     * @type {number}
     */
    a3 = 0;

    /**
     * Filter coefficient 5
     * @type {number}
     */
    a4 = 0;

    /**
     * Input history 1
     * @type {number}
     */
    x1 = 0;

    /**
     * Input history 2
     * @type {number}
     */
    x2 = 0;

    /**
     * Output history 1
     * @type {number}
     */
    y1 = 0;

    /**
     * Output history 2
     * @type {number}
     */
    y2 = 0;

    /**
     * Resonance in centibels
     * @type {number}
     */
    reasonanceCb = 0;

    /**
     * Resonance gain
     * @type {number}
     */
    reasonanceGain = 1;

    /**
     * Cutoff frequency in cents
     * @type {number}
     */
    cutoffCents = 13500;

    /**
     * Cutoff frequency in Hz
     * @type {number}
     */
    cutoffHz = 20000;

    /**
     * Applies a low-pass filter to the given buffer
     * @param voice {WorkletVoice} the voice we're working on
     * @param outputBuffer {Float32Array} the buffer to apply the filter to
     * @param cutoffCents {number} cutoff frequency in cents
     */
    static apply(voice, outputBuffer, cutoffCents)
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
            WorkletLowpassFilter.calculateCoefficients(voice);
        }

        // filter the input
        for (let i = 0; i < outputBuffer.length; i++)
        {
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
    static calculateCoefficients(voice)
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


        // code is ported from https://github.com/sinshu/meltysynth/ to work with js.
        // I'm too dumb to understand the math behind this...
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
}