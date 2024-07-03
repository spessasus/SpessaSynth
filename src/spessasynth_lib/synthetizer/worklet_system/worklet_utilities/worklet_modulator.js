import { modulatorSources } from '../../../soundfont/chunk/modulators.js'
import { getModulatorCurveValue, MOD_PRECOMPUTED_LENGTH } from './modulator_curves.js'
import { NON_CC_INDEX_OFFSET } from './worklet_processor_channel.js'
import { recalculateVolumeEnvelope } from './volume_envelope.js'

/**
 * worklet_modulator.js
 * purpose: precomputes all curve types and computes modulators
 */

/**
 * Computes a given modulator
 * @param controllerTable {Int16Array} all midi controllers as 14bit values + the non controller indexes, starting at 128
 * @param modulator {Modulator} the modulator to compute
 * @param midiNote {number} the midiNote of the voice belonging to the modulator
 * @param velocity {number} the velocity of the voice belonging to the modulator
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
 * Computes all modulators of a given voice
 * @param voice {WorkletVoice} the voice to compute modulators for
 * @param controllerTable {Int16Array} all midi controllers as 14bit values + the non controller indexes, starting at 128
 */
export function computeModulators(voice, controllerTable)
{
    // reset generators to their initial state
    voice.modulatedGenerators.set(voice.generators);
    // add modulated values
    voice.modulators.forEach(mod => {
        voice.modulatedGenerators[mod.modulatorDestination] += computeWorkletModulator(controllerTable, mod, voice.midiNote, voice.velocity);
    });
    recalculateVolumeEnvelope(voice)
}

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
        transforms[curve][0][0][i] = getModulatorCurveValue(
            0,
            curve,
            i / MOD_PRECOMPUTED_LENGTH,
            0);
        if (isNaN(transforms[curve][0][0][i])) {
            transforms[curve][0][0][i] = 1;
        }

        // polarity 1 dir 0
        transforms[curve][1][0][i] = getModulatorCurveValue(
            0,
            curve,
            i / MOD_PRECOMPUTED_LENGTH,
            1);
        if (isNaN(transforms[curve][1][0][i])) {
            transforms[curve][1][0][i] = 1;
        }

        // polarity 0 dir 1
        transforms[curve][0][1][i] = getModulatorCurveValue(
            1,
            curve,
            i / MOD_PRECOMPUTED_LENGTH,
            0);
        if (isNaN(transforms[curve][0][1][i])) {
            transforms[curve][0][1][i] = 1;
        }

        // polarity 1 dir 1
        transforms[curve][1][1][i] = getModulatorCurveValue(
            1,
            curve,
            i / MOD_PRECOMPUTED_LENGTH,
            1);
        if (isNaN(transforms[curve][1][1][i])) {
            transforms[curve][1][1][i] = 1;
        }
    }
}