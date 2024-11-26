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
    chorus: 0xdb,
    reverb: 0xdd,
    
    pitchWheelRange: 0x100,
    fineTune: 0x101,
    coarseTune: 0x102
};

export const DEFAULT_DLS_REVERB = new Modulator({
    srcEnum: 0x00DB,
    dest: generatorTypes.reverbEffectsSend,
    amt: 1000,
    secSrcEnum: 0x0,
    transform: 0
});

export const DEFAULT_DLS_CHORUS = new Modulator({
    srcEnum: 0x00DD,
    dest: generatorTypes.chorusEffectsSend,
    amt: 1000,
    secSrcEnum: 0x0,
    transform: 0
});

export const DLS_1_NO_VIBRATO_MOD = new Modulator({
    srcEnum: 0x0081,
    dest: generatorTypes.vibLfoToPitch,
    amt: 0,
    secSrcEnum: 0x0,
    transform: 0
});

export const DLS_1_NO_VIBRATO_PRESSURE = new Modulator({
    srcEnum: 0x000D,
    dest: generatorTypes.vibLfoToPitch,
    amt: 0,
    secSrcEnum: 0x0,
    transform: 0
});