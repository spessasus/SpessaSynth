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
 *     keyRange: {
 *       min: number,
 *       max: number
 *     },
 *     noteFallingTimeMs: number,
 *     renderWaveforms: boolean,
 *     drawActiveNotes: boolean,
 *     stabilizeWaveforms: boolean,
 *     amplifier: number,
 *     showVisualPitch: boolean,
 *     sampleSize: number,
 *     waveformThickness: number
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