import { Modulator } from "../basic_soundfont/modulator.js";
import { generatorTypes } from "../basic_soundfont/generator.js";

/**
 * @enum {number}
 */
export const DLSSources = {
    none: 0x0,
    modLfo: 0x1,
    velocity: 0x2,
    keyNum: 0x3,
    volEnv: 0x4,
    modEnv: 0x5,
    pitchWheel: 0x6,
    polyPressure: 0x7,
    channelPressure: 0x8,
    vibratoLfo: 0x9,
    
    modulationWheel: 0x81,
    volume: 0x87,
    pan: 0x8a,
    expression: 0x8b,
    // note: these are flipped unintentionally in DLS2 table 9. Argh!
    chorus: 0xdd,
    reverb: 0xdb,
    
    pitchWheelRange: 0x100,
    fineTune: 0x101,
    coarseTune: 0x102
};

export const DEFAULT_DLS_REVERB = new Modulator(
    0x00DB,
    0x0,
    generatorTypes.reverbEffectsSend,
    1000,
    0
);

export const DEFAULT_DLS_CHORUS = new Modulator(
    0x00DD,
    0x0,
    generatorTypes.chorusEffectsSend,
    1000,
    0
);

export const DLS_1_NO_VIBRATO_MOD = new Modulator(
    0x0081,
    0x0,
    generatorTypes.vibLfoToPitch,
    0,
    0
);

export const DLS_1_NO_VIBRATO_PRESSURE = new Modulator(
    0x000D,
    0x0,
    generatorTypes.vibLfoToPitch,
    0,
    0
);