//
// Created by spessasus on 21.05.24.
//

#include <cmath>
#include <cstdio>
#include "LowpassFilter.h"
#include "../generatorTypes.h"
#include "../unit_converter/UnitConverter.h"

LowpassFilter::LowpassFilter(unsigned int sampleRate) {
    this->a0 = 0;
    this->a1 = 0;
    this->a2 = 0;
    this->a3 = 0;
    this->a4 = 0;

    this->x1 = 0;
    this->x2 = 0;
    this->y1 = 0;
    this->y2 = 0;

    this->reasonanceCb = 0;
    this->reasonanceGain = 1;

    this->cutoffCents = 13500;
    this->cutoffHz = 2000;
    this->sampleRate = sampleRate;

}

void LowpassFilter::applyLowpassFilter(int filterQcBCurrent, int cutoffCentsCurrent, float *outputBuffer, int bufferLength) {
    if(cutoffCentsCurrent > 13490)
    {
        return; // filter is open
    }

    // check if the frequency has changed. if so, calculate new coefficients
    if(this->cutoffCents != cutoffCentsCurrent || this->reasonanceCb != filterQcBCurrent)
    {
        this->cutoffCents = cutoffCentsCurrent;
        this->reasonanceCb = filterQcBCurrent;
        this->cutoffHz = UnitConverter::absCentsToHz(cutoffCents);
                                                                                              //     \/ adjust the filterQ (fluid_iir_filter.h line 204)
        this->reasonanceGain = UnitConverter::decibelAttenuationToGain(-1 * (((float)this->reasonanceCb / 10.0f) - 3.01f)); // -1 because it's attenuation that we're inverting
        calculateCoefficients();
    }

    // filter the input
    for (int i = 0; i < bufferLength; i++) {
        float input = outputBuffer[i];
        float filtered = this->a0 * input
                       + this->a1 * this->x1
                       + this->a2 * this->x2
                       - this->a3 * this->y1
                       - this->a4 * this->y2;

        // set buffer
        this->x2 = this->x1;
        this->x1 = input;
        this->y2 = this->y1;
        this->y1 = filtered;

        outputBuffer[i] = filtered;
    }
}

void LowpassFilter::calculateCoefficients() {
    // code is ported from https://github.com/sinshu/meltysynth/ to work with js. I'm too dumb to understand the math behind this...
    float w = 2.0f * M_PI * this->cutoffHz / this->sampleRate; // we're in the audioworkletglobalscope so we can use sampleRate
    float cosw = cosf(w);
    float alpha = sinf(w) / (2.0f * this->reasonanceGain);

    float b0 = (1 - cosw) / 2;
    float b1 = 1 - cosw;
    float b2 = (1 - cosw) / 2;
    float a0 = 1 + alpha;
    float a1 = -2 * cosw;
    float a2 = 1 - alpha;

    // set coefficients
    this->a0 = b0 / a0;
    this->a1 = b1 / a0;
    this->a2 = b2 / a0;
    this->a3 = a1 / a0;
    this->a4 = a2 / a0;

}
