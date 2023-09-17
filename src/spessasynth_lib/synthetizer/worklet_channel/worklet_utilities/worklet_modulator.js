import { NON_CC_INDEX_OFFSET } from '../worklet_channel.js'
import { modulatorSources } from '../../../soundfont/chunk/modulators.js'

/**
 * @typedef {{
 *     transformAmount: number,
 *     transformType: 0|2,
 *
 *     sourceTransformed: Float32Array
 *     sourceIndex: number,
 *     sourceUsesCC: number,
 *
 *     secondarySrcTransformed: Float32Array,
 *     secondarySrcIndex: number,
 *     secondarySrcUsesCC: number
 * }} WorkletModulator
 */

/**
 *
 * @param controllerTable {Int16Array} all midi controllers as 14bit values + the non controller indexes, starting at 128
 * @param modulator {WorkletModulator}
 * @param midiNote {number}
 * @param velocity {number}
 * @returns {number} the computed value
 */
export function computeWorkletModulator(controllerTable, modulator, midiNote, velocity)
{
    if(modulator.transformAmount === 0)
    {
        return 0;
    }
    // mapped to 0-16384
    let rawSourceValue = 0;
    if(modulator.sourceUsesCC)
    {
        rawSourceValue = controllerTable[modulator.sourceIndex];
    }
    else
    {
        const index = modulator.sourceIndex + NON_CC_INDEX_OFFSET;
        switch (modulator.sourceIndex)
        {
            case modulatorSources.noController:
                return 0;// fluid_mod.c line 374 (0 times secondary times amount is still zero)

            case modulatorSources.noteOnKeyNum:
                rawSourceValue = midiNote << 7;
                break;

            case modulatorSources.noteOnVelocity:
            case modulatorSources.polyPressure:
                rawSourceValue = velocity << 7;
                break;

            default:
                rawSourceValue = controllerTable[index]; // use the 7 bit value
                break;
        }

    }

    const sourceValue = modulator.sourceTransformed[rawSourceValue];

    // mapped to 0-127
    let rawSecondSrcValue;
    if(modulator.secondarySrcUsesCC)
    {
        rawSecondSrcValue = controllerTable[modulator.secondarySrcTransformed];
    }
    else
    {
        const index = modulator.secondarySrcIndex + NON_CC_INDEX_OFFSET;
        switch (modulator.secondarySrcIndex)
        {
            case modulatorSources.noController:
                rawSecondSrcValue = 16383;// fluid_mod.c line 376
                break;

            case modulatorSources.noteOnKeyNum:
                rawSecondSrcValue = midiNote << 7;
                break;

            case modulatorSources.noteOnVelocity:
            case modulatorSources.polyPressure:
                rawSecondSrcValue = velocity << 7;
                break;

            default:
                rawSecondSrcValue = controllerTable[index];
        }

    }
    const secondSrcValue = modulator.secondarySrcTransformed[rawSecondSrcValue];


    // compute the modulator
    const computedValue = sourceValue * secondSrcValue * modulator.transformAmount;

    if(modulator.transformType === 2)
    {
        // abs value
        return Math.abs(computedValue);
    }
    return computedValue;
}

/**
 * @param voice {WorkletVoice}
 * @param generatorType {number}
 * @param controllerTable {Int16Array}
 * @returns {number} the computed number
 */
export function getModulated(voice, generatorType, controllerTable) {
    const modLen = voice.modulators[generatorType].length;
    if (modLen < 1) {
        // if no mods, just return gen
        return voice.generators[generatorType];
    }
    else if(modLen === 1)
    {
        return voice.generators[generatorType] + computeWorkletModulator(controllerTable, voice.modulators[generatorType][0], voice.midiNote, voice.velocity)
    }
    else {
        // if mods, sum them
        let sum = voice.generators[generatorType];
        for (let i = 0; i < modLen; i++) {
            sum += computeWorkletModulator(controllerTable, voice.modulators[generatorType][i], voice.midiNote, voice.velocity);
        }
        return sum;
    }
}