#include <iostream>
#include <emscripten.h>
#include <cmath>
#include "main.h"
#include "cpessasynth_components/channel/Channel.h"

//
// Created by spessasus on 21.05.24.
// main audio rendering code
//

#ifdef __cplusplus
extern "C" {
    const float AMPLITUDE = 0.1f;
#endif

    // TEST FUNCTION
    EMSCRIPTEN_KEEPALIVE
    void processFloatArrays(float** arrays, int numArrays, int arrayLength) {
        for (int i = 0; i < numArrays; ++i) {
            for (int j = 0; j < arrayLength; ++j) {
                printf("Array %d, Element %d: %f\n", i, j, arrays[i][j]);
            }
        }
    }

    EMSCRIPTEN_KEEPALIVE
    void renderAudio(int bufferLength,
                     float currentTime,
                     int channelsAmount,
                     float** outputsLeft,
                     float** outputsRight) {
        // note: this is just a basic test to see if the communication wokrs
        // for every channel
        // plus two BECAUSE FIRST IS REVERB AND SECOND IS CHORUS!!!!
        for (int channelNumber = 2; channelNumber < channelsAmount + 2; ++channelNumber) {
            // for every sample
            for (int i = 0; i < bufferLength; ++i) {
                outputsLeft[channelNumber][i] = sinf(i * (M_PI * 2 / 128.0f)) * AMPLITUDE;
                outputsRight[channelNumber][i] = sinf(i * (M_PI * 2 / 128.0f)) * AMPLITUDE;
            }
        }
    }

#ifdef __cplusplus
}
#endif
