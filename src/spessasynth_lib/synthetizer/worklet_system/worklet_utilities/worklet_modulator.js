import { modulatorSources } from '../../../soundfont/read/modulators.js'
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
 * @param voice {WorkletVoice} the voice belonging to the modulator
 * @returns {number} the computed value
 */
export function computeWorkletModulator(controllerTable, modulator, voice)
{
    if(modulator.transformAmount === 0)
    {
        return 0;
    }
    // mapped to 0-16384
    let rawSourceValue;
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
                rawSourceValue = 16383; // equals to 1
                break;

            case modulatorSources.noteOnKeyNum:
                rawSourceValue = voice.midiNote << 7;
                break;

            case modulatorSources.noteOnVelocity:
                rawSourceValue = voice.velocity << 7;
                break;

            case modulatorSources.polyPressure:
                rawSourceValue = voice.pressure << 7;
                break;

            default:
                rawSourceValue = controllerTable[index]; // pitch bend and range are stored in the cc table
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
                rawSecondSrcValue = 16383; // equals to 1
                break;

            case modulatorSources.noteOnKeyNum:
                rawSecondSrcValue = voice.midiNote << 7;
                break;

            case modulatorSources.noteOnVelocity:
                rawSecondSrcValue = voice.velocity << 7;
                break;

            case modulatorSources.polyPressure:
                rawSecondSrcValue = voice.pressure << 7;
                break;

            default:
                rawSecondSrcValue = controllerTable[index]; // pitch bend and range are stored in the cc table
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
        voice.modulatedGenerators[mod.modulatorDestination] += computeWorkletModulator(controllerTable, mod, voice);
    });
    recalculateVolumeEnvelope(voice);
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