import { midiControllers } from '../../../midi_parser/midi_message.js'
import { modulatorSources } from '../../../soundfont/chunk/modulators.js'
/**
 * @typedef {Object} WorkletProcessorChannel
 * @property {Int16Array} midiControllers - array of MIDI controller values
 * @property {boolean[]} lockedControllers - array indicating if a controller is locked
 * @property {Float32Array} customControllers - array of custom (not sf2) control values such as RPN pitch tuning, transpose, modulation depth, etc.
 * @property {boolean} holdPedal - indicates whether the hold pedal is active
 * @property {boolean} drumChannel - indicates whether the channel is a drum channel
 * @property {number} program - the channel's program number
 * @property {Preset} preset - the channel's preset
 * @property {Object} channelVibrato - vibrato settings for the channel
 * @property {number} channelVibrato.depth - depth of the vibrato effect (cents)
 * @property {number} channelVibrato.delay - delay before the vibrato effect starts (seconds)
 * @property {number} channelVibrato.rate - rate of the vibrato oscillation (Hz)
 * @property {boolean} isMuted - indicates whether the channel is muted
 * @property {WorkletVoice[]} voices - array of voices currently active on the channel
 * @property {WorkletVoice[]} sustainedVoices - array of voices that are sustained on the channel
 */

export const NON_CC_INDEX_OFFSET = 128;
export const CONTROLLER_TABLE_SIZE = 147;
// an array with preset default values so we can quickly use set() to reset the controllers
export const resetArray = new Int16Array(CONTROLLER_TABLE_SIZE);
// default values (the array is 14 bit so shift the 7 bit values by 7 bits)
resetArray[midiControllers.mainVolume] = 100 << 7;
resetArray[midiControllers.expressionController] = 127 << 7;
resetArray[midiControllers.pan] = 64 << 7;
resetArray[midiControllers.releaseTime] = 64 << 7;
resetArray[midiControllers.brightness] = 64 << 7;
resetArray[midiControllers.effects1Depth] = 40 << 7;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = 8192;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] = 2 << 7;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.channelPressure] = 127 << 7;


export const customControllers = {
    channelTuning: 0, // cents
    channelTranspose: 1, // cents
    modulationMultiplier: 2, // cents
    masterTuning: 3, // cents
}
export const CUSTOM_CONTROLLER_TABLE_SIZE = Object.keys(customControllers).length;
export const customResetArray = new Float32Array(CUSTOM_CONTROLLER_TABLE_SIZE);
customResetArray[customControllers.modulationMultiplier] = 1;
