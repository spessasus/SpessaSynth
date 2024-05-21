//
// Created by spessasus on 21.05.24.
//

#include "Modulator.h"
#include <iostream>
#include <cmath>

// initialize lookup tables
const int MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH = 16384;
const char CURVE_TYPES_AMOUNT = 4;
const char DIRECTIONS_AMOUNT = 2;
const char POLARITIES_AMOUNT = 2;

float concavePositiveUnipolar[MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH] = {};
float convexPositiveUnipolar[MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH] = {};
/**
 * as follows: transforms[curveType][polarity][direction] is an array
 * 4 curve types, 2 polarities, 2 directions
 */
float modulatorTransforms[CURVE_TYPES_AMOUNT][POLARITIES_AMOUNT][DIRECTIONS_AMOUNT][MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH];

float getModulatorCurveValue(bool direction, char curveType, int initialValue, bool polarity) {
    // inverse the value if needed
    auto value = (float)initialValue;
    if(direction)
    {
        value = 1.0f - value;
    }
    switch (curveType) {
        case Modulator::CurveTypes::linearCurve:
            if (polarity) {
                // bipolar
                return value * 2.0f - 1.0f;
            }
            return value;

        case Modulator::CurveTypes::switchCurve:
            // switch
            value = value > 0.5f ? 1.0f : 0.0f;
            if (polarity) {
                // multiply
                return value * 2.0f - 1.0f;
            }
            return value;

        case Modulator::CurveTypes::concaveCurve:
            // concave curve
            // look up the value
            if(polarity)
            {
                value = value * 2.0f - 1.0f;
                if(value < 0.0f)
                {
                    return 1.0f - concavePositiveUnipolar[(int)(value * -MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH)] - 1.0f;
                }
                return concavePositiveUnipolar[(int)(value * MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH)];
            }
            return concavePositiveUnipolar[(int)(value * MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH)];

        case Modulator::CurveTypes::convexCurve:
            // convex curve
            // look up the value
            if(polarity)
            {
                value = value * 2.0f - 1.0f;
                if(value < 0.0f)
                {
                    return 1.0f - convexPositiveUnipolar[(int)(value * -MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH)] - 1.0f;
                }
                return convexPositiveUnipolar[(int)(value * MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH)];
            }
            return convexPositiveUnipolar[(int)(value * MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH)];

        default:
            return 0.0f;
    }
}

void precomputeTransforms()
{
    // the equation is taken from FluidSynth as it's the standard for soundFonts
    // more precisely, this:
    // https://github.com/FluidSynth/fluidsynth/blob/cb8da1e1e2c0a5cff2bab6a419755b598b793384/src/gentables/gen_conv.c#L55
    concavePositiveUnipolar[0] = 0.0f;
    concavePositiveUnipolar[MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH - 1] = 1.0f;

    convexPositiveUnipolar[0] = 0.0f;
    convexPositiveUnipolar[MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH - 1] = 1.0f;
    for(int i = 1; i < MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH - 1; i++)
    {
        float x = -200.0f * 2.0f / 960.0f * logf((float)i / (MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH - 1.0f)) / M_LN10;
        convexPositiveUnipolar[i] = 1 - x;
        concavePositiveUnipolar[MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH - 1 - i] = x;
    }

    // precompute ALL possible transforms

    // for every curve type
    for(char curveType = 0; curveType < CURVE_TYPES_AMOUNT; curveType++)
    {
        // for every polarity
        for(char polarity = 0; polarity < POLARITIES_AMOUNT; polarity++)
        {
            // for every direction!
            for(char direction = 0; direction < DIRECTIONS_AMOUNT; direction++)
            {
                for(int i = 0; i < MODULATOR_TRANSFORM_PRECOMPUTED_LENGTH; i++)
                {
                    modulatorTransforms[curveType][polarity][direction][i] = getModulatorCurveValue(direction, curveType, i, polarity);
                }
            }
        }
    }
}


// the index offset for non-controller values (pitch bend, etc)
const unsigned char NON_CC_INDEX_OFFSET = 128;

Modulator::Modulator(int sourceEnum, int secSourceEnum, char destination, int transformAmount, char transformType) {
    this->sourceEnum = sourceEnum;
    this->secSourceEnum = secSourceEnum;
    this->destination = destination;
    this->transformAmount = transformAmount;
    this->transformType = transformType;

    // decode the source
    this->sourcePolarity = this->sourceEnum >> 9 & 1;
    this->sourceDirection = this->sourceEnum >> 8 & 1;
    this->sourceUsesCC = this->sourceEnum >> 7 & 1;
    this->sourceIndex = (char)(this->sourceEnum & 127);
    this->sourceCurveType = (char)(this->sourceEnum >> 10 & 3);

    // decode the secondary source
    this->secSourcePolarity = this->secSourceEnum >> 9 & 1;
    this->secSourceDirection = this->secSourceEnum >> 8 & 1;
    this->secSourceUsesCC = this->secSourceEnum >> 7 & 1;
    this->secSourceIndex = (char)(this->secSourceEnum & 127);
    this->secSourceCurveType = (char)(this->secSourceEnum >> 10 & 3);
}

void Modulator::debugString() {
    std::cout << "Source:\nPolarity: " << this->sourcePolarity
    << "\nDirection: " << this->sourceDirection
    << "\nUses CC: " << this->sourceUsesCC
    << "\nIndex: " << this->sourceIndex
    << "\nCurve type:" << this->sourceCurveType
    << "\n"
    << "\nSecondary source:\nPolarity: " << this->secSourcePolarity
    << "\nDirection: " << this->secSourceDirection
    << "\nUses CC: " << this->secSourceUsesCC
    << "\nIndex: " << this->secSourceIndex
    << "\nCurve type:" << this->secSourceCurveType
    << "\n"
    << "\nTransform amount: " << this->transformAmount
    << "\nDestination: " << this->destination << "\n";

}

void Modulator::computeModulator(const int *channelControllerTable,
                                 int *generators,
                                 int *modulatedGenerators,
                                 unsigned char midiNote,
                                 unsigned char velocity) {
    if(this->transformAmount == 0)
    {
        // no need to do anything;
        return;
    }

    // mapped to 0-16384
    int rawSourceValue = 0;
    if(this->sourceUsesCC)
    {
        // if we use cc, simply grab it from the controller table
        rawSourceValue = channelControllerTable[this->sourceIndex];
    }
    else
    {
        int index = this->sourceIndex + NON_CC_INDEX_OFFSET;
        switch (this->sourceIndex)
        {
            case SourceEnums::noController:
                return;// fluid_mod.c line 374 (0 times secondary times amount is still zero)

            case SourceEnums::noteOnKeyNum:
                // midi note: convert to 14 bits
                rawSourceValue = midiNote << 7;
                break;

            case SourceEnums::noteOnVelocity:
            case SourceEnums::polyPressure:
                rawSourceValue = velocity << 7;
                break;

            case SourceEnums::link:
                return; // linked modulators are not supported

            default:
                // not found, look it up in the controller table
                rawSourceValue = channelControllerTable[index];
                break;
        }

    }

    float sourceValue = modulatorTransforms[this->sourceCurveType][this->sourcePolarity][this->sourceDirection][rawSourceValue];

    // the same as first source
    int rawSecondSrcValue;
    if(this->secSourceUsesCC)
    {
        rawSecondSrcValue = channelControllerTable[this->secSourceIndex];
    }
    else
    {
        int index = this->secSourceIndex + NON_CC_INDEX_OFFSET;
        switch (this->secSourceIndex)
        {
            case SourceEnums::noController:
                rawSecondSrcValue = 16383;// fluid_mod.c line 376
                break;

            case SourceEnums::noteOnKeyNum:
                rawSecondSrcValue = midiNote << 7;
                break;

            case SourceEnums::noteOnVelocity:
            case SourceEnums::polyPressure:
                rawSecondSrcValue = velocity << 7;
                break;

            default:
                rawSecondSrcValue = channelControllerTable[index];
        }

    }
    float secondSrcValue = modulatorTransforms[this->secSourceCurveType][this->secSourcePolarity][this->secSourceDirection][rawSecondSrcValue];


    // compute the modulator
    int computedValue = (int)sourceValue * (int)secondSrcValue * this->transformAmount;

    if(this->transformType == 2)
    {
        // abs value
        computedValue = abs(computedValue);
    }

    // add to generator
    modulatedGenerators[this->destination] += computedValue;
}
