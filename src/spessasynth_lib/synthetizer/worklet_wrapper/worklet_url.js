/**
 * The absolute path (from the spessasynth_lib folder) to the worklet module
 * @type {string}
 */
export const WORKLET_URL_ABSOLUTE = "synthetizer/worklet_processor.min.js";
/**
 * @typedef {Object} StartRenderingDataConfig
 * @property {BasicMIDI} parsedMIDI - the MIDI to render
 * @property {SynthesizerSnapshot?} snapshot - the snapshot to apply
 * @property {boolean?} oneOutput - if synth should use one output with 32 channels (2 audio channels for each midi channel).
 * this disabled chorus and reverb.
 * @property {number?} loopCount - the times to loop the song
 * @property {SequencerOptions?} sequencerOptions - the options to pass to the sequencer
 */

export const WORKLET_PROCESSOR_NAME = "spessasynth-worklet-processor";