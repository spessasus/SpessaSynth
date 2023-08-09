import { ShiftableByteArray } from '../../utils/shiftable_array.js'
import { RiffChunk } from './riff_chunk.js'
import { readByte, signedInt16 } from '../../utils/byte_functions.js'

/**
 * @typedef {"startAddrsOffset"|"endAddrOffset"|"startloopAddrsOffset"|"endloopAddrsOffset"|"startAddrsCoarseOffset"|"modLfoToPitch"|"vibLfoToPitch"|"modEnvToPitch"|"initialFilterFc"|"initialFilterQ"|"modLfoToFilterFc"|"modEnvToFilterFc"|"endAddrsCoarseOffset"|"modLfoToVolume"|"unused1"|"chorusEffectsSend"|"reverbEffectsSend"|"pan"|"unused2"|"unused3"|"unused4"|"delayModLFO"|"freqModLFO"|"delayVibLFO"|"freqVibLFO"|"delayModEnv"|"attackModEnv"|"holdModEnv"|"decayModEnv"|"sustainModEnv"|"releaseModEnv"|"keyNumToModEnvHold"|"keyNumToModEnvDecay"|"delayVolEnv"|"attackVolEnv"|"holdVolEnv"|"decayVolEnv"|"sustainVolEnv"|"releaseVolEnv"|"keyNumToVolEnvHold"|"keyNumToVolEnvDecay"|"instrument"|"reserved1"|"keyRange"|"velRange"|"startloopAddrsCoarseOffset"|"keyNum"|"velocity"|"initialAttenuation"|"reserved2"|"endloopAddrsCoarseOffset"|"coarseTune"|"fineTune"|"sampleID"|"sampleModes"|"reserved3"|"scaleTuning"|"exclusiveClass"|"overridingRootKey"|"unused5"|"endOper"} generatorType
 */

/**
 * kindly stolen from https://loophole-letters.vercel.app/soundfonts ;)
 * @type {Object<string, generatorType>}
  */
export const generators = {
    // sample control
    0: 'startAddrsOffset', // moves sample start point
    1: 'endAddrOffset', // moves sample end point
    // loop control
    2: 'startloopAddrsOffset', // moves loop start point
    3: 'endloopAddrsOffset', // moves loop end point
    4: 'startAddrsCoarseOffset', // ?
    // pitch modulation
    5: 'modLfoToPitch', // modulation lfo pitch modulation in cents
    6: 'vibLfoToPitch', // vibrato lfo pitch modulation in cents
    7: 'modEnvToPitch', // modulation envelope pitch modulation in cents
    // filter
    8: 'initialFilterFc', // lowpass filter cutoff in cents
    9: 'initialFilterQ', // lowpass filter resonance
    // filter modulation
    10: 'modLfoToFilterFc', // modulation lfo lowpass filter cutoff in cents
    11: 'modEnvToFilterFc', // modulation envelope lowpass filter cutoff in cents
    //
    12: 'endAddrsCoarseOffset', // ?
    13: 'modLfoToVolume', // modulation lfo volume (tremolo), where 100 = 10dB
    14: 'unused1',
    15: 'chorusEffectsSend', // how much is sent to chorus 0 - 1000
    16: 'reverbEffectsSend', // how much is sent to reverb 0 - 1000
    17: 'pan', // panning, where -500 = left, 0 = center, 500 = right
    18: 'unused2',
    19: 'unused3',
    20: 'unused4',
    // mod lfo
    21: 'delayModLFO', // delay for mod lfo to start from zero (weird scale)
    22: 'freqModLFO', // frequency of mod lfo, 0 = 8.176Hz, unit: f => 1200log2(f/8.176)
    // vib lfo
    23: 'delayVibLFO', // delay for vibrato lfo to start from zero (weird scale)
    24: 'freqVibLFO', // frequency of vibrato lfo, 0 = 8.176Hz, unit: f => 1200log2(f/8.176)
    // mod env
    25: 'delayModEnv', // 0 = 1s declay till mod env starts
    26: 'attackModEnv', // attack of mod env
    27: 'holdModEnv', // hold of mod env
    28: 'decayModEnv', // decay of mod env
    29: 'sustainModEnv', // sustain of mod env
    30: 'releaseModEnv', // release of mod env
    31: 'keyNumToModEnvHold', // also modulating mod envelope hold with key number
    32: 'keyNumToModEnvDecay', // also modulating mod envelope decay with key number
    // vol env
    33: 'delayVolEnv', // delay of envelope from zero (weird scale)
    34: 'attackVolEnv', // attack of envelope
    35: 'holdVolEnv', // hold of envelope
    36: 'decayVolEnv', // decay of envelope
    37: 'sustainVolEnv', // sustain of envelope
    38: 'releaseVolEnv', // release of envelope
    39: 'keyNumToVolEnvHold',
    40: 'keyNumToVolEnvDecay',
    // zone
    41: 'instrument', // instrument index to use for preset zone
    42: 'reserved1',
    43: 'keyRange', // key range for which preset / instrument zone is active
    44: 'velRange', // velocity range for which preset / instrument zone is active
    45: 'startloopAddrsCoarseOffset', // ?
    46: 'keyNum', // instrument only: always use this midi number (ignore whats pressed)
    // gain
    47: 'velocity', // instrument only: always use this velocity (ignore whats pressed)
    48: 'initialAttenuation', // allows turning down the volume, 10 = -1dB
    49: 'reserved2',
    50: 'endloopAddrsCoarseOffset', // ?
    // tune
    51: 'coarseTune', // pitch offset in semitones
    52: 'fineTune', // pitch offset in cents
    // sample
    53: 'sampleID', // instrument zone only: which sample to use
    54: 'sampleModes', // 0 = no loop, 1 = loop, 2 = reserved, 3 = loop and play till end in release phase
    55: 'reserved3',
    56: 'scaleTuning', // the degree to which MIDI key number influences pitch, 100 = default
    57: 'exclusiveClass', // = cut = choke group
    58: 'overridingRootKey', // can override the sample's originalPitch
    59: 'unused5',
    60: 'endOper',
};

/**
 * @param generatortype {generatorType}
 * what the hell theres no substition gens bro
 * @returns {"index"|"range"|"sample"|"value"}
 */
export function getGeneratorValueType(generatortype)
{
    switch(generatortype)
    {
        default:
            return "value";

        case "instrument":
        case "sampleID":
            return "index";

        case "keyRange":
        case "velRange":
            return "range";

        case "startAddrsCoarseOffset":
        case "endAddrOffset":
        case "endAddrsCoarseOffset":
        case "endloopAddrsOffset":
        case "startloopAddrsOffset":
        case "startAddrsOffset":
        case "endloopAddrsCoarseOffset":
        case "startloopAddrsCoarseOffset":
        case "sampleModes":
        case "overridingRootKey":
        case "exclusiveClass":
            return "sample";
    }
}

export const generatorTypes = {
    startAddrsOffset: 0,                // sample control - moves sample start point
    endAddrOffset: 1,                   // sample control - moves sample end point
    startloopAddrsOffset: 2,            // loop control - moves loop start point
    endloopAddrsOffset: 3,              // loop control - moves loop end point
    startAddrsCoarseOffset: 4,          // ?
    modLfoToPitch: 5,                   // pitch modulation - modulation lfo pitch modulation in cents
    vibLfoToPitch: 6,                   // pitch modulation - vibrato lfo pitch modulation in cents
    modEnvToPitch: 7,                   // pitch modulation - modulation envelope pitch modulation in cents
    initialFilterFc: 8,                 // filter - lowpass filter cutoff in cents
    initialFilterQ: 9,                  // filter - lowpass filter resonance
    modLfoToFilterFc: 10,               // filter modulation - modulation lfo lowpass filter cutoff in cents
    modEnvToFilterFc: 11,               // filter modulation - modulation envelope lowpass filter cutoff in cents
    endAddrsCoarseOffset: 12,           // ?
    modLfoToVolume: 13,                 // modulation lfo - volume (tremolo), where 100 = 10dB
    unused1: 14,
    chorusEffectsSend: 15,              // effect send - how much is sent to chorus 0 - 1000
    reverbEffectsSend: 16,              // effect send - how much is sent to reverb 0 - 1000
    pan: 17,                            // panning - where -500 = left, 0 = center, 500 = right
    unused2: 18,
    unused3: 19,
    unused4: 20,
    delayModLFO: 21,                    // mod lfo - delay for mod lfo to start from zero (weird scale)
    freqModLFO: 22,                     // mod lfo - frequency of mod lfo, 0 = 8.176Hz, unit: f => 1200log2(f/8.176)
    delayVibLFO: 23,                    // vib lfo - delay for vibrato lfo to start from zero (weird scale)
    freqVibLFO: 24,                     // vib lfo - frequency of vibrato lfo, 0 = 8.176Hz, unit: f => 1200log2(f/8.176)
    delayModEnv: 25,                    // mod env - 0 = 1s declay till mod env starts
    attackModEnv: 26,                   // mod env - attack of mod env
    holdModEnv: 27,                     // mod env - hold of mod env
    decayModEnv: 28,                    // mod env - decay of mod env
    sustainModEnv: 29,                  // mod env - sustain of mod env
    releaseModEnv: 30,                  // mod env - release of mod env
    keyNumToModEnvHold: 31,             // mod env - also modulating mod envelope hold with key number
    keyNumToModEnvDecay: 32,            // mod env - also modulating mod envelope decay with key number
    delayVolEnv: 33,                    // vol env - delay of envelope from zero (weird scale)
    attackVolEnv: 34,                   // vol env - attack of envelope
    holdVolEnv: 35,                     // vol env - hold of envelope
    decayVolEnv: 36,                    // vol env - decay of envelope
    sustainVolEnv: 37,                  // vol env - sustain of envelope
    releaseVolEnv: 38,                  // vol env - release of envelope
    keyNumToVolEnvHold: 39,             // vol env - key number to volume envelope hold
    keyNumToVolEnvDecay: 40,            // vol env - key number to volume envelope decay
    instrument: 41,                     // zone - instrument index to use for preset zone
    reserved1: 42,
    keyRange: 43,                       // zone - key range for which preset / instrument zone is active
    velRange: 44,                       // zone - velocity range for which preset / instrument zone is active
    startloopAddrsCoarseOffset: 45,     // ?
    keyNum: 46,                         // zone - instrument only: always use this midi number (ignore what's pressed)
    velocity: 47,                       // zone - instrument only: always use this velocity (ignore what's pressed)
    initialAttenuation: 48,             // zone - allows turning down the volume, 10 = -1dB
    reserved2: 49,
    endloopAddrsCoarseOffset: 50,       // ?
    coarseTune: 51,                     // tune - pitch offset in semitones
    fineTune: 52,                       // tune - pitch offset in cents
    sampleID: 53,                       // sample - instrument zone only: which sample to use
    sampleModes: 54,                    // sample - 0 = no loop, 1 = loop, 2 = reserved, 3 = loop and play till end in release phase
    reserved3: 55,
    scaleTuning: 56,                    // sample - the degree to which MIDI key number influences pitch, 100 = default
    exclusiveClass: 57,                 // sample - = cut = choke group
    overridingRootKey: 58,              // sample - can override the sample's original pitch
    unused5: 59,
    endOper: 60                         // end marker
};



export class Generator{
    /**
     * Creates a generator
     * @param dataArray {ShiftableByteArray}
     */
    constructor(dataArray) {
        // 4 bytes:
        // type, value, type, value
        let bytes = [readByte(dataArray), readByte(dataArray), readByte(dataArray), readByte(dataArray)];

        /**
         * @type {number}
         **/
        this.generatorType = (bytes[1] << 8) | bytes[0];

        this.generatorValue = signedInt16(bytes[2], bytes[3]);
    }
}

/**
 * Reads the generator chunk
 * @param generatorChunk {RiffChunk}
 * @returns {Generator[]}
 */
export function readGenerators(generatorChunk)
{
    let gens = [];
    while(generatorChunk.chunkData.length > generatorChunk.chunkData.currentIndex)
    {
        gens.push(new Generator(generatorChunk.chunkData));
    }
    return gens;
}