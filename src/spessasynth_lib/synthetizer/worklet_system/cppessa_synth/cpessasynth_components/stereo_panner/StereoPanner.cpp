//
// Created by spessasus on 23.05.24.
//
#include <cmath>
#include "StereoPanner.h"
#include "../constants.h"

void StereoPanner::panVoice(float pan, const float *inputBuffer, float *outputLeft, float *outputRight, float *reverbLeft,
                            float *reverbRight, float *chorusLeft, float *chorusRight, int chorusLevel, int reverbLevel,
                            int bufferLength) {
    float panLeft = cosf(M_PI_2 * pan);
    float panRight = sinf(M_PI_2 * pan);

    if(reverbLevel > 0)
    {
        float reverbGain = (float)reverbLevel / GENERATORS_REVERB_DIVIDER;
        float reverbLeftGain = reverbGain * panLeft;
        float reverbRightGain = reverbGain * panRight;
        for (int i = 0; i < bufferLength; ++i) {
            reverbLeft[i] += reverbLeftGain * inputBuffer[i];
            reverbRight[i] += reverbRightGain * inputBuffer[i];
        }
    }

    if(chorusLevel > 0)
    {
        float chorusGain = (float)chorusLevel / GENERATORS_CHORUS_DIVIDER;
        float chorusLeftGain = chorusGain * panLeft;
        float chorusRightGain = chorusGain * panRight;
        for (int i = 0; i < bufferLength; ++i) {
            chorusLeft[i] += chorusLeftGain * inputBuffer[i];
            chorusRight[i] += chorusRightGain * inputBuffer[i];
        }
    }

    for (int i = 0; i < bufferLength; ++i) {
        outputLeft[i] += inputBuffer[i] * panLeft;
        outputRight[i] += inputBuffer[i] * panRight;
    }


}
