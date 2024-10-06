import { DEFAULT_CHORUS_CONFIG } from './fancy_chorus.js'

/**
 * @typedef {Object} EffectsConfig
 * @property {boolean} chorusEnabled - indicates if the chorus effect is enabled.
 * @property {ChorusConfig} chorusConfig - the configuration for chorus. Pass undefined to use defaults
 * @property {boolean} reverbEnabled - indicates if the reverb effect is enabled.
 * @property {AudioBuffer} reverbImpulseResponse - the impulse response for the reverb. Pass undefined to use defaults
 */


/**
 * @type {EffectsConfig}
 */
export const DEFAULT_EFFECTS_CONFIG = {
    chorusEnabled: true,
    chorusConfig: DEFAULT_CHORUS_CONFIG,

    reverbEnabled: true,
    reverbImpulseResponse: undefined // will load the integrated one
}