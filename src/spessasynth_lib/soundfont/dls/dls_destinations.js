/**
 *
 * @enum {number}
 */
export const DLSDestinations = {
    none: 0x0,                  // no destination
    gain: 0x1,                  // linear gain
    reserved: 0x2,              // reserved
    pitch: 0x3,                 // pitch in cents
    pan: 0x4,                   // pan 10ths of a percent
    keyNum: 0x5,                // MIDI key number
    // nuh uh, the channel controllers are not supported!
    chorusSend: 0x80,           // chorus send level 10ths of a percent
    reverbSend: 0x81,           // reverb send level 10ths of a percent
    
    modLfoFreq: 0x104,          // modulation LFO frequency
    modLfoDelay: 0x105,         // modulation LFO delay
    
    vibLfoFreq: 0x114,          // vibrato LFO frequency
    vibLfoDelay: 0x115,         // vibrato LFO delay
    
    volEnvAttack: 0x206,        // volume envelope attack
    volEnvDecay: 0x207,         // volume envelope decay
    volEnvRelease: 0x209,       // volume envelope release
    volEnvSustain: 0x20a,       // volume envelope sustain
    volEnvDelay: 0x20b,         // volume envelope delay
    volEnvHold: 0x20c,          // volume envelope hold
    
    modEnvAttack: 0x30a,        // modulation envelope attack
    modEnvDecay: 0x30b,         // modulation envelope decay
    modEnvRelease: 0x30d,       // modulation envelope release
    modEnvSustain: 0x30e,       // modulation envelope sustain
    modEnvDelay: 0x30f,         // modulation envelope delay
    modEnvHold: 0x310,          // modulation envelope hold
    
    filterCutoff: 0x500,        // low pass filter cutoff frequency
    filterQ: 0x501              // low pass filter resonance
};