import { modulatorCurveTypes } from "../../../soundfont/basic_soundfont/modulator.js";

/**
 * modulator_curves.js
 * precomputes modulator concave and conves curves and calculates a curve value for a given polarity, direction and type
 */

// the length of the precomputed curve tables
export const MOD_PRECOMPUTED_LENGTH = 16384;

// Precalculate lookup tables for concave and convex curves
const concave = new Float32Array(MOD_PRECOMPUTED_LENGTH + 1);
const convex = new Float32Array(MOD_PRECOMPUTED_LENGTH + 1);
// the equation is taken from FluidSynth as it's the standard for soundFonts
// more precisely, the gen_conv.c file
concave[0] = 0;
concave[concave.length - 1] = 1;

convex[0] = 0;
convex[convex.length - 1] = 1;
for (let i = 1; i < MOD_PRECOMPUTED_LENGTH - 1; i++)
{
    let x = (-200 * 2 / 960) * Math.log(i / (concave.length - 1)) / Math.LN10;
    convex[i] = 1 - x;
    concave[concave.length - 1 - i] = x;
}

/**
 * Transforms a value with a given curve type
 * @param polarity {number} 0 or 1
 * @param direction {number} 0 or 1
 * @param curveType {number} see modulatorCurveTypes in modulators.js
 * @param value {number} the linear value, 0 to 1
 * @returns {number} the transformed value, 0 to 1, or -1 to 1
 */
export function getModulatorCurveValue(direction, curveType, value, polarity)
{
    // inverse the value if needed
    if (direction)
    {
        value = 1 - value;
    }
    switch (curveType)
    {
        case modulatorCurveTypes.linear:
            if (polarity)
            {
                // bipolar curve
                return value * 2 - 1;
            }
            return value;
        
        case modulatorCurveTypes.switch:
            // switch
            value = value > 0.5 ? 1 : 0;
            if (polarity)
            {
                // multiply
                return value * 2 - 1;
            }
            return value;
        
        case modulatorCurveTypes.concave:
            // look up the value
            if (polarity)
            {
                value = value * 2 - 1;
                if (value < 0)
                {
                    return -concave[~~(value * -MOD_PRECOMPUTED_LENGTH)];
                }
                return concave[~~(value * MOD_PRECOMPUTED_LENGTH)];
            }
            return concave[~~(value * MOD_PRECOMPUTED_LENGTH)];
        
        case modulatorCurveTypes.convex:
            // look up the value
            if (polarity)
            {
                value = value * 2 - 1;
                if (value < 0)
                {
                    return -convex[~~(value * -MOD_PRECOMPUTED_LENGTH)];
                }
                return convex[~~(value * MOD_PRECOMPUTED_LENGTH)];
            }
            return convex[~~(value * MOD_PRECOMPUTED_LENGTH)];
    }
}
