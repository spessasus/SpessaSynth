import { absCentsToHz, decibelAttenuationToGain } from "./unit_converter.js";
import { generatorTypes } from "../../../soundfont/basic_soundfont/generator.js";

/**
 * lowpass_filter.js
 * purpose: applies a low pass filter to a voice
 * note to self: a lot of tricks and fixes come from fluidsynth.
 * They are the real smart guys.
 * Shoutout to them!
 */

export const FILTER_SMOOTHING_FACTOR = 0.1;

/**
 * @typedef {Object} CachedCoefficient
 * @property {number} a0 - Filter coefficient 1
 * @property {number} a1 - Filter coefficient 2
 * @property {number} a2 - Filter coefficient 3
 * @property {number} a3 - Filter coefficient 4
 * @property {number} a4 - Filter coefficient 5
 */

export class WorkletLowpassFilter
{
    /**
     * Cached coefficient calculations
     * stored as cachedCoefficients[resonanceCb][currentInitialFc]
     * @type {CachedCoefficient[][]}
     * @private
     */
    static cachedCoefficients = [];
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
    resonanceCb = 0;
    
    /**
     * Cutoff frequency in absolute cents
     * @type {number}
     */
    currentInitialFc = 13500;
    
    /**
     * For tracking the last cutoff frequency in the apply method, absolute cents
     * Set to infinity to force recalculation
     * @type {number}
     */
    lastTargetCutoff = Infinity;
    
    /**
     * used for tracking if the filter has been initialized
     * @type {boolean}
     */
    initialized = false;
    
    /**
     * Applies a low-pass filter to the given buffer
     * @param voice {WorkletVoice} the voice we're working on
     * @param outputBuffer {Float32Array} the buffer to apply the filter to
     * @param fcExcursion {number} the addition of modenv and mod lfo in cents to the filter
     * @param smoothingFactor {number} filter's cutoff frequency smoothing factor
     */
    static apply(voice, outputBuffer, fcExcursion, smoothingFactor)
    {
        const initialFc = voice.modulatedGenerators[generatorTypes.initialFilterFc];
        const filter = voice.filter;
        
        
        if (!filter.initialized)
        {
            // filter initialization
            filter.initialized = true;
            // don't smooth, override
            filter.currentInitialFc = initialFc;
        }
        else
        {
            /* Note:
             * We only smooth out the initialFc part,
             * the modulation envelope and LFO excursions are not smoothed.
             */
            filter.currentInitialFc += (initialFc - filter.currentInitialFc) * smoothingFactor;
        }
        
        // the final cutoff for this calculation
        const targetCutoff = filter.currentInitialFc + fcExcursion;
        
        /* note:
         * the check for initialFC is because of the filter optimization
         * (if cents are the maximum then the filter is open)
         * filter cannot use this optimization if it's dynamic (see #53), and
         * the filter can only be dynamic if the initial filter is not open
         */
        if (filter.currentInitialFc > 13499 && targetCutoff > 13499 && filter.resonanceCb === 0)
        {
            filter.currentInitialFc = 13500;
            return; // filter is open
        }
        
        const modulatedResonance = voice.modulatedGenerators[generatorTypes.initialFilterQ];
        // check if the frequency has changed. if so, calculate new coefficients
        if (Math.abs(filter.lastTargetCutoff - targetCutoff) > 1 || filter.resonanceCb !== modulatedResonance)
        {
            filter.lastTargetCutoff = targetCutoff;
            filter.resonanceCb = modulatedResonance;
            WorkletLowpassFilter.calculateCoefficients(filter, targetCutoff);
        }
        
        // filter the input
        for (let i = 0; i < outputBuffer.length; i++)
        {
            let input = outputBuffer[i];
            let filtered = filter.a0 * input
                + filter.a1 * filter.x1
                + filter.a2 * filter.x2
                - filter.a3 * filter.y1
                - filter.a4 * filter.y2;
            
            // set buffer
            filter.x2 = filter.x1;
            filter.x1 = input;
            filter.y2 = filter.y1;
            filter.y1 = filtered;
            
            outputBuffer[i] = filtered;
        }
    }
    
    /**
     * @param filter {WorkletLowpassFilter}
     * @param cutoffCents {number}
     */
    static calculateCoefficients(filter, cutoffCents)
    {
        cutoffCents = ~~cutoffCents; // Math.floor
        const qCb = filter.resonanceCb;
        // check if these coefficients were already cached
        const cached = WorkletLowpassFilter.cachedCoefficients?.[qCb]?.[cutoffCents];
        if (cached !== undefined)
        {
            filter.a0 = cached.a0;
            filter.a1 = cached.a1;
            filter.a2 = cached.a2;
            filter.a3 = cached.a3;
            filter.a4 = cached.a4;
            return;
        }
        let cutoffHz = absCentsToHz(cutoffCents);
        
        // fix cutoff on low frequencies (fluid_iir_filter.c line 392)
        cutoffHz = Math.min(cutoffHz, 0.45 * sampleRate);
        
        const qDb = qCb / 10;
        // correct the filter gain, like fluid does
        const resonanceGain = decibelAttenuationToGain(-1 * (qDb - 3.01)); // -1 because it's attenuation, and we don't want attenuation
        
        // reduce the gain by the Q factor (fluid_iir_filter.c line 250)
        const qGain = 1 / Math.sqrt(decibelAttenuationToGain(-qDb));
        
        
        // initial filtering code was ported from meltysynth created by sinshu.
        let w = 2 * Math.PI * cutoffHz / sampleRate; // we're in the AudioWorkletGlobalScope so we can use sampleRate
        let cosw = Math.cos(w);
        let alpha = Math.sin(w) / (2 * resonanceGain);
        
        let b1 = (1 - cosw) * qGain;
        let b0 = b1 / 2;
        let b2 = b0;
        let a0 = 1 + alpha;
        let a1 = -2 * cosw;
        let a2 = 1 - alpha;
        
        /**
         * set coefficients
         * @type {CachedCoefficient}
         */
        const toCache = {};
        toCache.a0 = b0 / a0;
        toCache.a1 = b1 / a0;
        toCache.a2 = b2 / a0;
        toCache.a3 = a1 / a0;
        toCache.a4 = a2 / a0;
        filter.a0 = toCache.a0;
        filter.a1 = toCache.a1;
        filter.a2 = toCache.a2;
        filter.a3 = toCache.a3;
        filter.a4 = toCache.a4;
        
        if (WorkletLowpassFilter.cachedCoefficients[qCb] === undefined)
        {
            WorkletLowpassFilter.cachedCoefficients[qCb] = [];
        }
        WorkletLowpassFilter.cachedCoefficients[qCb][cutoffCents] = toCache;
    }
}

// precompute all the cutoffs for 0q
const dummy = new WorkletLowpassFilter();
dummy.resonanceCb = 0;
// sfspec section 8.1.3: initialFilterFc ranges from 1500 to 13,500 cents
for (let i = 1500; i < 13500; i++)
{
    dummy.currentInitialFc = i;
    WorkletLowpassFilter.calculateCoefficients(dummy, i);
}
