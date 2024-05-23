//
// Created by spessasus on 23.05.24.
//

#include <cmath>
#include "LowFrequencyOscillator.h"

float LowFrequencyOscillator::getOscillatorValue(float startTime, float frequencyHz, float currentTime) {
    if(currentTime < startTime)
    {
        return 0.0f;
    }

    float xValue = (currentTime - startTime) / (1.0f / frequencyHz) - 0.25f;
    // offset by -0.25, otherwise we start at -1 and can have unexpected jump in pitch or lowpass (happened with Synth Strings 2)

    return abs(xValue - (floorf(xValue + 0.5f))) * 4.0f - 1.0f;

}
