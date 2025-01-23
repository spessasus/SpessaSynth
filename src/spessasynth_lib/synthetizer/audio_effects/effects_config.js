import { DEFAULT_CHORUS_CONFIG } from "./fancy_chorus.js";

/**
 * @import {ChorusConfig} from "./fancy_chorus.js";
 */

/**
 * @typedef {function} workletCreatorFunction
 * @param {Object} context - the audio context
 * @param {string} name - the name of the worklet processor
 * @param {Object} options - the options for the worklet processor
 */

/**
 * @typedef {Object} SynthConfig
 * @property {boolean} chorusEnabled - indicates if the chorus effect is enabled.
 * @property {ChorusConfig?} chorusConfig - the configuration for chorus. Pass undefined to use defaults
 * @property {boolean} reverbEnabled - indicates if the reverb effect is enabled.
 * @property {AudioBuffer?} reverbImpulseResponse - the impulse response for the reverb. Pass undefined to use defaults
 * @property {{worklet: workletCreatorFunction}} audioNodeCreators -
 * custom audio node creation functions for Web Audio wrappers.
 */


/**
 * @type {SynthConfig}
 */
export const DEFAULT_SYNTH_CONFIG = {
    chorusEnabled: true,
    chorusConfig: DEFAULT_CHORUS_CONFIG,
    
    reverbEnabled: true,
    reverbImpulseResponse: undefined, // will load the integrated one
    audioNodeCreators: undefined
};