import { ShiftableByteArray } from '../../utils/shiftable_array.js'
import { RiffChunk } from './riff_chunk.js'
import { readByte, signedInt16 } from '../../utils/byte_functions.js'

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