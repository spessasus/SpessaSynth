//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_GENERATORTYPES_H
#define SPESSASYNTH_GENERATORTYPES_H
enum GeneratorTypes {
    startAddrsOffset = 0,               // Sample control - moves sample start point
    endAddrOffset = 1,                  // Sample control - moves sample end point
    startloopAddrsOffset = 2,           // Loop control - moves loop start point
    endloopAddrsOffset = 3,             // Loop control - moves loop end point
    startAddrsCoarseOffset = 4,         // Unknown purpose
    modLfoToPitch = 5,                  // Pitch modulation - modulation LFO pitch modulation in cents
    vibLfoToPitch = 6,                  // Pitch modulation - vibrato LFO pitch modulation in cents
    modEnvToPitch = 7,                  // Pitch modulation - modulation envelope pitch modulation in cents
    initialFilterFc = 8,                // Filter - low-pass filter cutoff in cents
    initialFilterQ = 9,                 // Filter - low-pass filter resonance
    modLfoToFilterFc = 10,              // Filter modulation - modulation LFO low-pass filter cutoff in cents
    modEnvToFilterFc = 11,              // Filter modulation - modulation envelope low-pass filter cutoff in cents
    endAddrsCoarseOffset = 12,          // Unknown purpose
    modLfoToVolume = 13,                // Modulation LFO - volume (tremolo), where 100 = 10dB
    unused1 = 14,                       // Unused
    chorusEffectsSend = 15,             // Effect send - how much is sent to chorus, range: 0 - 1000
    reverbEffectsSend = 16,             // Effect send - how much is sent to reverb, range: 0 - 1000
    pan = 17,                           // Panning - where -500 = left, 0 = center, 500 = right
    unused2 = 18,                       // Unused
    unused3 = 19,                       // Unused
    unused4 = 20,                       // Unused
    delayModLFO = 21,                   // Mod LFO - delay for mod LFO to start from zero (weird scale)
    freqModLFO = 22,                    // Mod LFO - frequency of mod LFO, 0 = 8.176Hz, unit: f => 1200log2(f/8.176)
    delayVibLFO = 23,                   // Vib LFO - delay for vibrato LFO to start from zero (weird scale)
    freqVibLFO = 24,                    // Vib LFO - frequency of vibrato LFO, 0 = 8.176Hz, unit: f => 1200log2(f/8.176)
    delayModEnv = 25,                   // Mod Env - 0 = 1s delay till mod env starts
    attackModEnv = 26,                  // Mod Env - attack of mod env
    holdModEnv = 27,                    // Mod Env - hold of mod env
    decayModEnv = 28,                   // Mod Env - decay of mod env
    sustainModEnv = 29,                 // Mod Env - sustain of mod env
    releaseModEnv = 30,                 // Mod Env - release of mod env
    keyNumToModEnvHold = 31,            // Mod Env - also modulating mod envelope hold with key number
    keyNumToModEnvDecay = 32,           // Mod Env - also modulating mod envelope decay with key number
    delayVolEnv = 33,                   // Vol Env - delay of envelope from zero (weird scale)
    attackVolEnv = 34,                  // Vol Env - attack of envelope
    holdVolEnv = 35,                    // Vol Env - hold of envelope
    decayVolEnv = 36,                   // Vol Env - decay of envelope
    sustainVolEnv = 37,                 // Vol Env - sustain of envelope
    releaseVolEnv = 38,                 // Vol Env - release of envelope
    keyNumToVolEnvHold = 39,            // Vol Env - key number to volume envelope hold
    keyNumToVolEnvDecay = 40,           // Vol Env - key number to volume envelope decay
    instrument = 41,                    // Zone - instrument index to use for preset zone
    reserved1 = 42,                     // Reserved
    keyRange = 43,                      // Zone - key range for which preset / instrument zone is active
    velRange = 44,                      // Zone - velocity range for which preset / instrument zone is active
    startloopAddrsCoarseOffset = 45,    // Unknown purpose
    keyNum = 46,                        // Zone - instrument only: always use this MIDI number (ignore what's pressed)
    velocity = 47,                      // Zone - instrument only: always use this velocity (ignore what's pressed)
    initialAttenuation = 48,            // Zone - allows turning down the volume, 10 = -1dB
    reserved2 = 49,                     // Reserved
    endloopAddrsCoarseOffset = 50,      // Unknown purpose
    coarseTune = 51,                    // Tune - pitch offset in semitones
    fineTune = 52,                      // Tune - pitch offset in cents
    sampleID = 53,                      // Sample - instrument zone only: which sample to use
    sampleModes = 54,                   // Sample - 0 = no loop, 1 = loop, 2 = reserved, 3 = loop and play till end in release phase
    reserved3 = 55,                     // Reserved
    scaleTuning = 56,                   // Sample - the degree to which MIDI key number influences pitch, 100 = default
    exclusiveClass = 57,                // Sample - = cut = choke group
    overridingRootKey = 58,             // Sample - can override the sample's original pitch
    unused5 = 59,                       // Unused
    endOper = 60                        // End marker
};

#endif //SPESSASYNTH_GENERATORTYPES_H
