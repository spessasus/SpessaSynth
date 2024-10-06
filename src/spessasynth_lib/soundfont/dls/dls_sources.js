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