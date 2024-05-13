/**
 * @typedef {{sampleID: number,
 * playbackStep: number,
 * cursor: number,
 * rootKey: number,
 * loopStart: number,
 * loopEnd: number,
 * end: number,
 * loopingMode: 0|1|2,
 * }} WorkletSample
 *
 *
 * @typedef {{
 *     a0: number,
 *     a1: number,
 *     a2: number,
 *     a3: number,
 *     a4: number,
 *
 *     x1: number,
 *     x2: number,
 *     y1: number,
 *     y2: number
 *
 *     reasonanceCb: number,
 *     reasonanceGain: number
 *
 *     cutoffCents: number,
 *     cutoffHz: number
 * }} WorkletLowpassFilter
 *
 * @typedef {{
 * sample: WorkletSample,
 * filter: WorkletLowpassFilter
 *
 * generators: Int16Array,
 * modulators: Modulator[],
 * modulatedGenerators: Int16Array,
 *
 * finished: boolean,
 * isInRelease: boolean,
 *
 * velocity: number,
 * midiNote: number,
 * targetKey: number,
 *
 * currentAttenuationDb: number,
 * currentModEnvValue: number,
 * startTime: number,
 *
 * releaseStartTime: number,
 * releaseStartModEnv: number,
 *
 * currentTuningCents: number,
 * currentTuningCalculated: number
 * }} WorkletVoice
 */