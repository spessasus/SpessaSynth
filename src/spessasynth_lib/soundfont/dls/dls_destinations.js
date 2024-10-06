/**
 *
 * @enum {number}
 */
export const DLSDestinations = {
    none: 0x0,
    gain: 0x1,
    reserved: 0x2,
    pitch: 0x3,
    pan: 0x4,
    keyNum: 0x5,
    // nuh uh, the channel controllers are not supported!!!!
    chorusSend: 0x80,
    reverbSend: 0x81,
    
    modLfoFreq: 0x104,
    modLfoDelay: 0x105,
    
    vibLfoFreq: 0x114,
    vibLfoDelay: 0x115,
    
    volEnvAttack: 0x206,
    volEnvDecay: 0x207,
    volEnvRelease: 0x209,
    volEnvSustain: 0x20a,
    volEnvDelay: 0x20b,
    volEnvHold: 0x20c,
    
    modEnvAttack: 0x30a,
    modEnvDecay: 0x30b,
    modEnvRelease: 0x30d,
    modEnvSustain: 0x30e,
    modEnvDelay: 0x30f,
    modEnvHold: 0x310,
    
    filterCutoff: 0x500,
    filterQ: 0x501
};