/**
 * @typedef {{
 *   keyboard: {
 *     keyRange: {
 *       min: number,
 *       max: number
 *     },
 *     mode: ("light" | "dark"),
 *     selectedChannel: number,
 *     autoRange: boolean,
 *     show: boolean
 *   },
 *   renderer: {
 *     renderNotes: boolean,
 *     renderingMode: rendererModes
 *     keyRange: {
 *       min: number,
 *       max: number
 *     },
 *     noteFallingTimeMs: number,
 *     noteAfterTriggerTimeMs: number,
 *     renderWaveforms: boolean,
 *     drawActiveNotes: boolean,
 *     stabilizeWaveforms: boolean,
 *     amplifier: number,
 *     showVisualPitch: boolean,
 *     sampleSize: number,
 *     waveformThickness: number
 *     dynamicGain: boolean,
 *     exponentialGain: boolean,
 *     logarithmicFrequency: boolean
 *   },
 *   midi: {
 *     output: (null | string),
 *     input: (null | string)
 *   },
 *   interface: {
 *     mode: ("light" | "dark"),
 *     language: string,
 *     layout: string
 *   }
 * }} SavedSettings
 */