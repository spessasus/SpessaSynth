import {signedInt16, readByte, readBytesAsUintLittleEndian} from "../../utils/byte_functions.js";
import { ShiftableByteArray } from '../../utils/shiftable_array.js';
import {
    getModulatorValue,
    MOD_PRECOMPUTED_LENGTH,
} from '../../synthetizer/worklet_channel/worklet_utilities/modulator_curves.js'
import { generatorTypes } from './generators.js'
import { consoleColors } from '../../utils/other.js'

export const modulatorSources = {
    noController: 0,
    noteOnVelocity: 2,
    noteOnKeyNum: 3,
    polyPressure: 10,
    channelPressure: 13,
    pitchWheel: 14,
    pitchWheelRange: 16,
    channelTuning: 17,
    link: 127
}

export const modulatorCurveTypes = {
    linear: 0,
    concave: 1,
    convex: 2,
    switch: 3
}

/**
 *
 * type, polarity, direction
 * @type {Float32Array[][][]}
 */
export const precomputedTransforms = [];
for (let i = 0; i < 4; i++) {
    precomputedTransforms.push([[], []]);
}

export class Modulator{
    /**
     * Creates a modulator
     * @param dataArray {ShiftableByteArray|{srcEnum: number, secSrcEnum: number, dest:number, amt: number, transform: number}}
     */
    constructor(dataArray) {
        if(dataArray.srcEnum)
        {
            this.modulatorSource = dataArray.srcEnum;
            this.modulatorDestination = dataArray.dest;
            this.modulationSecondarySrc = dataArray.secSrcEnum;
            this.modulationAmount = dataArray.amt;
            this.transformType = dataArray.transform;
        }
        else {
            this.modulatorSource = readBytesAsUintLittleEndian(dataArray, 2);
            this.modulatorDestination = readBytesAsUintLittleEndian(dataArray, 2);
            this.modulationAmount = signedInt16(readByte(dataArray), readByte(dataArray));
            this.modulationSecondarySrc = readBytesAsUintLittleEndian(dataArray, 2);
            this.transformType = readBytesAsUintLittleEndian(dataArray, 2);
        }

        if(this.modulatorDestination > 58)
        {
            this.modulatorDestination = -1; // flag as invalid (for linked ones)
        }

        // decode the source
        this.sourceIsBipolar = this.modulatorSource >> 9 & 1;
        this.sourceDirection = this.modulatorSource >> 8 & 1;
        this.sourceUsesCC = this.modulatorSource >> 7 & 1;
        this.sourceIndex = this.modulatorSource & 127;
        this.sourceCurveType = this.modulatorSource >> 10 & 3;

        // decode the secondary source
        this.secSrcIsBipolar = this.modulationSecondarySrc >> 9 & 1;
        this.secSrcDirection = this.modulationSecondarySrc >> 8 & 1;
        this.secSrcUsesCC = this.modulationSecondarySrc >> 7 & 1;
        this.secSrcIndex = this.modulationSecondarySrc & 127;
        this.secSrcCurveType = this.modulationSecondarySrc >> 10 & 3;

        this.precomputeModulatorTransform();
    }

    // precompute the values on sf load
    precomputeModulatorTransform()
    {
        this.sourceTransformed = new Float32Array(MOD_PRECOMPUTED_LENGTH);
        this.secondarySrcTransformed = new Float32Array(MOD_PRECOMPUTED_LENGTH);

        if(this.modulationAmount < 1)
        {
            return;
        }


        // read the cached table
        let sourceCached = false;
        if(precomputedTransforms[this.sourceCurveType][this.sourceIsBipolar][this.sourceDirection])
        {
            this.sourceTransformed = new Float32Array(precomputedTransforms[this.sourceCurveType][this.sourceIsBipolar][this.sourceDirection]);
            sourceCached = true;
        }

        let secondarySourceCached = false;
        if(precomputedTransforms[this.secSrcCurveType][this.secSrcIsBipolar][this.secSrcDirection])
        {
            this.secondarySrcTransformed = new Float32Array(precomputedTransforms[this.secSrcCurveType][this.secSrcIsBipolar][this.secSrcDirection]);
            secondarySourceCached = true;
        }

        if(!secondarySourceCached || !sourceCached) {
            for (let i = 0; i < MOD_PRECOMPUTED_LENGTH; i++) {
                if (!sourceCached) {
                    this.sourceTransformed[i] = getModulatorValue(
                        this.sourceDirection,
                        this.sourceCurveType,
                        i / MOD_PRECOMPUTED_LENGTH,
                        this.sourceIsBipolar);
                    if (isNaN(this.sourceTransformed[i])) {
                        this.sourceTransformed[i] = 1;
                    }
                }

                if (!secondarySourceCached) {
                    this.secondarySrcTransformed[i] = getModulatorValue(
                        this.secSrcDirection,
                        this.secSrcCurveType,
                        i / MOD_PRECOMPUTED_LENGTH,
                        this.secSrcIsBipolar);
                    if (isNaN(this.secondarySrcTransformed[i])) {
                        this.secondarySrcTransformed[i] = 1;
                    }
                }
            }
        }

        if(!sourceCached)
        {
            precomputedTransforms[this.sourceCurveType][this.sourceIsBipolar][this.sourceDirection] = this.sourceTransformed;
        }

        if(!secondarySourceCached)
        {
            precomputedTransforms[this.secSrcCurveType][this.secSrcIsBipolar][this.secSrcDirection] = this.secondarySrcTransformed;
        }
    }
}

export const defaultModulators = [
    new Modulator({srcEnum: 0x0502, dest: generatorTypes.initialAttenuation, amt: 960, secSrcEnum: 0x0, transform: 0}), // vel to attenuation
    new Modulator({srcEnum: 0x0081, dest: generatorTypes.vibLfoToPitch, amt: 50, secSrcEnum: 0x0, transform: 0}), // mod to vibrato
    new Modulator({srcEnum: 0x0587, dest: generatorTypes.initialAttenuation, amt: 960, secSrcEnum: 0x0, transform: 0}), // vol to attenuation
    new Modulator({srcEnum: 0x020E, dest: generatorTypes.fineTune, amt: 12700, secSrcEnum: 0x0010, transform: 0}), // pitch to tuning
    new Modulator({srcEnum: 0x028A, dest: generatorTypes.pan, amt: 1000, secSrcEnum: 0x0, transform: 0}), // pan to uhh, pan
    new Modulator({srcEnum: 0x058B, dest: generatorTypes.initialAttenuation, amt: 960, secSrcEnum: 0x0, transform: 0}) // expression to attenuation
]

console.log("%cDefault Modulators:", consoleColors.recognized, defaultModulators)

/**
 * Reads the modulator chunk
 * @param modulatorChunk {RiffChunk}
 * @returns {Modulator[]}
 */
export function readModulators(modulatorChunk)
{
    let gens = [];
    while(modulatorChunk.chunkData.length > modulatorChunk.chunkData.currentIndex)
    {
        gens.push(new Modulator(modulatorChunk.chunkData));
    }
    return gens;
}