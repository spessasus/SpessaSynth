import { NON_CC_INDEX_OFFSET } from '../worklet_channel.js'
import { modulatorSources } from '../../../soundfont/chunk/modulators.js'
import { getModulatorValue, MOD_PRECOMPUTED_LENGTH } from './modulator_curves.js'

/**
 *
 * @param controllerTable {Int16Array} all midi controllers as 14bit values + the non controller indexes, starting at 128
 * @param modulator {Modulator}
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

    const sourceValue = transforms[modulator.sourceCurveType][modulator.sourcePolarity][modulator.sourceDirection][rawSourceValue];

    // mapped to 0-127
    let rawSecondSrcValue;
    if(modulator.secSrcUsesCC)
    {
        rawSecondSrcValue = controllerTable[modulator.secSrcIndex];
    }
    else
    {
        const index = modulator.secSrcIndex + NON_CC_INDEX_OFFSET;
        switch (modulator.secSrcIndex)
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
    const secondSrcValue = transforms[modulator.secSrcCurveType][modulator.secSrcPolarity][modulator.secSrcDirection][rawSecondSrcValue];


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
 * @param controllerTable {Int16Array}
 */
export function computeModulators(voice, controllerTable)
{
    voice.modulatedGenerators.set(voice.generators);
    voice.modulators.forEach(mod => {
        voice.modulatedGenerators[mod.modulatorDestination] += computeWorkletModulator(controllerTable, mod, voice.midiNote, voice.velocity);
    });
}

/**
 * @param voice {WorkletVoice}
 * @param generatorType {number}
 * @returns {number} the computed number
 */
// export function getModulated(voice, generatorType) {
//     return voice.modulatedGenerators[generatorType];
// }

/**
 * as follows: transforms[curveType][polarity][direction] is an array
 * @type {Float32Array[][][]}
 */
const transforms = [];

for(let curve = 0; curve < 4; curve++)
{
    transforms[curve] =
    [
        [
            new Float32Array(MOD_PRECOMPUTED_LENGTH),
            new Float32Array(MOD_PRECOMPUTED_LENGTH)
        ],
        [
            new Float32Array(MOD_PRECOMPUTED_LENGTH),
            new Float32Array(MOD_PRECOMPUTED_LENGTH)
        ]
    ];
    for (let i = 0; i < MOD_PRECOMPUTED_LENGTH; i++) {

        // polarity 0 dir 0
        transforms[curve][0][0][i] = getModulatorValue(
            0,
            curve,
            i / MOD_PRECOMPUTED_LENGTH,
            0);
        if (isNaN(transforms[curve][0][0][i])) {
            transforms[curve][0][0][i] = 1;
        }

        // polarity 1 dir 0
        transforms[curve][1][0][i] = getModulatorValue(
            0,
            curve,
            i / MOD_PRECOMPUTED_LENGTH,
            1);
        if (isNaN(transforms[curve][1][0][i])) {
            transforms[curve][1][0][i] = 1;
        }

        // polarity 0 dir 1
        transforms[curve][0][1][i] = getModulatorValue(
            1,
            curve,
            i / MOD_PRECOMPUTED_LENGTH,
            0);
        if (isNaN(transforms[curve][0][1][i])) {
            transforms[curve][0][1][i] = 1;
        }

        // polarity 1 dir 1
        transforms[curve][1][1][i] = getModulatorValue(
            1,
            curve,
            i / MOD_PRECOMPUTED_LENGTH,
            1);
        if (isNaN(transforms[curve][1][1][i])) {
            transforms[curve][1][1][i] = 1;
        }
    }
}