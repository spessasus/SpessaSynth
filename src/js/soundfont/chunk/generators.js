import {ShiftableUint8Array} from "../../utils/shiftable_array.js";
import {RiffChunk} from "./riff_chunk.js";
import {signedInt16, readByte} from "../../utils/byte_functions.js";

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


export class Generator{
    /**
     * Creates a generator
     * @param dataArray {ShiftableUint8Array}
     */
    constructor(dataArray) {
        // 4 bytes:
        // type, value, type, value
        let bytes = [readByte(dataArray), readByte(dataArray), readByte(dataArray), readByte(dataArray)];

        let generatorTypeNumber = (bytes[1] << 8) | bytes[0];
        this.generatorType = generators[generatorTypeNumber];

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