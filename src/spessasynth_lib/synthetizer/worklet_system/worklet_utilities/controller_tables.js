import { midiControllers } from "../../../midi_parser/midi_message.js";
import { modulatorSources } from "../../../soundfont/basic_soundfont/modulator.js";

/*
 * A bit of explanation:
 * The controller table is stored as an int16 array, it stores 14-bit values.
 * This controller table is then extended with the modulatorSources section,
 * for example, pitch range and pitch range depth.
 * This allows us for precise control range and supports full pitch-wheel resolution.
 */
export const NON_CC_INDEX_OFFSET = 128;
export const CONTROLLER_TABLE_SIZE = 147;


// an array with preset default values, so we can quickly use set() to reset the controllers
export const resetArray = new Int16Array(CONTROLLER_TABLE_SIZE).fill(0);
export const setResetValue = (i, v) => resetArray[i] = v << 7;

// values come from Falcosoft MidiPlayer 6
setResetValue(midiControllers.mainVolume, 100);
setResetValue(midiControllers.balance, 64);
setResetValue(midiControllers.expressionController, 127);
setResetValue(midiControllers.pan, 64);

setResetValue(midiControllers.timbreHarmonicContent, 64);
setResetValue(midiControllers.releaseTime, 64);
setResetValue(midiControllers.attackTime, 64);
setResetValue(midiControllers.brightness, 64);

setResetValue(midiControllers.soundController6, 64);
setResetValue(midiControllers.soundController7, 64);
setResetValue(midiControllers.soundController8, 64);
setResetValue(midiControllers.soundController9, 64);
setResetValue(midiControllers.generalPurposeController6, 64);
setResetValue(midiControllers.generalPurposeController8, 64);
setResetValue(midiControllers.portamentoControl, 64);

// pitch wheel
setResetValue(NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel, 64);
setResetValue(NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange, 2);

export const customControllers = {
    channelTuning: 0,           // cents, RPN for fine tuning
    channelTransposeFine: 1,    // cents, only the decimal tuning, (e.g., transpose is 4.5,
    // then shift by 4 keys + tune by 50 cents)
    modulationMultiplier: 2,    // cents, set by modulation depth RPN
    masterTuning: 3,            // cents, set by system exclusive
    channelTuningSemitones: 4   // semitones, for RPN coarse tuning
};
export const CUSTOM_CONTROLLER_TABLE_SIZE = Object.keys(customControllers).length;
export const customResetArray = new Float32Array(CUSTOM_CONTROLLER_TABLE_SIZE);
customResetArray[customControllers.modulationMultiplier] = 1;
/**
 * @enum {number}
 */
export const dataEntryStates = {
    Idle: 0,
    RPCoarse: 1,
    RPFine: 2,
    NRPCoarse: 3,
    NRPFine: 4,
    DataCoarse: 5,
    DataFine: 6
};