import { NON_CC_INDEX_OFFSET } from '../worklet_channel.js'
import { modulatorSources } from '../../../soundfont/chunk/modulators.js'
import { generatorLimits } from '../../../soundfont/chunk/generators.js'

/**
 * @typedef {{
 *     transformAmount: number,
 *     transformType: 0|2,
 *     destination: number,
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
    const computedValue = Math.floor(sourceValue * secondSrcValue * modulator.transformAmount);

    if(modulator.transformType === 2)
    {
        // abs value
        return Math.abs(computedValue);
    }
    return computedValue;
}

const emptyArr = new Int16Array(60);

/**
 * Here's how it works:
 * we compute all the modulators and put their results into an array filled with zeros
 * and if we want to get a generator, we sum the generators + modulatorResults
 * @param voice {WorkletVoice}
 * @param controllerTable {Int16Array}
 */
export function computeModulators(voice, controllerTable)
{
    voice.modulatorResults.set(emptyArr);
    voice.modulators.forEach(mod => {
        voice.modulatorResults[mod.destination] += computeWorkletModulator(controllerTable, mod, voice.midiNote, voice.velocity);
    });
}

/**
 * @param voice {WorkletVoice}
 * @param generatorType {number}
 * @returns {number} the computed number
 */
export function getModulated(voice, generatorType)
{
    return voice.generators[generatorType] + voice.modulatorResults[generatorType];
}