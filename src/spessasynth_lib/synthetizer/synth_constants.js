/**
 * @typedef {Object} StartRenderingDataConfig
 * @property {BasicMIDI} parsedMIDI - the MIDI to render
 * @property {SynthesizerSnapshot} snapshot - the snapshot to apply
 * @property {boolean|undefined} oneOutput - if synth should use one output with 32 channels (2 audio channels for each midi channel).
 * this disabled chorus and reverb.
 * @property {number|undefined} loopCount - the times to loop the song
 * @property {SequencerOptions} sequencerOptions - the options to pass to the sequencer
 */

export const WORKLET_PROCESSOR_NAME = "spessasynth-worklet-system";
export const VOICE_CAP = 350;
export const DEFAULT_PERCUSSION = 9;
export const MIDI_CHANNEL_COUNT = 16;
export const DEFAULT_SYNTH_MODE = "gs";