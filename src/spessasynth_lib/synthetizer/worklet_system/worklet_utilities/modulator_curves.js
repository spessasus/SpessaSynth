import { modulatorCurveTypes } from '../../../soundfont/chunk/modulators.js'

export const MOD_PRECOMPUTED_LENGTH = 16384;

// Precalculate lookup tables
const concave = new Float32Array(MOD_PRECOMPUTED_LENGTH);
for (let i = 0; i < MOD_PRECOMPUTED_LENGTH; i++) {
    concave[i] = Math.pow(i / MOD_PRECOMPUTED_LENGTH, Math.E);
    if(isNaN(concave[i]))
    {
        concave[i] = 1;
        console.warn("Concave was NaN, replaced with 1");
    }
}

const convex = new Float32Array(MOD_PRECOMPUTED_LENGTH);
for (let i = 0; i < MOD_PRECOMPUTED_LENGTH; i++) {
    convex[i] = 1 - Math.pow(1 - (i / MOD_PRECOMPUTED_LENGTH), Math.E);
    if(isNaN(convex[i]))
    {
        convex[i] = 1;
        console.warn("Convex was NaN, replaced with 1");
    }
}

/**
 * @param polarity {number}
 * @param direction {number}
 * @param curveType {number}
 * @param value {number} 0 to 1
 * @returns {number} 0 to 1 or -1 to 0
 */
export function getModulatorCurveValue(direction, curveType, value, polarity) {
    // inverse the value if needed
    if(direction)
    {
        value = 1 - value
    }
    switch (curveType) {
        case modulatorCurveTypes.linear:
            if (polarity) {
                // bipolar
                return value * 2 - 1;
            }
            return value;

        case modulatorCurveTypes.switch:
            // switch
            value = value > 0.5 ? 1 : 0;
            if (polarity) {
                // multiply
                return value * 2 - 1;
            }
            return value;

        case modulatorCurveTypes.concave:
            // look up the value
            if(polarity)
            {
                value = value * 2 - 1;
                if(value < 0)
                {
                    return 1 - concave[~~(value * -MOD_PRECOMPUTED_LENGTH)] - 1;
                }
                return concave[~~value * MOD_PRECOMPUTED_LENGTH];
            }
            return concave[~~(value * MOD_PRECOMPUTED_LENGTH)]

        case modulatorCurveTypes.convex:
            // look up the value
            if(polarity)
            {
                value = value * 2 - 1;
                if(value < 0)
                {
                    return 1 - convex[~~(value * -MOD_PRECOMPUTED_LENGTH)] - 1;
                }
                return convex[~~(value * MOD_PRECOMPUTED_LENGTH)];
            }
            return convex[~~(value * MOD_PRECOMPUTED_LENGTH)];
    }
}
