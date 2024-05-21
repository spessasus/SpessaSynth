#include <iostream>
#include <emscripten.h>
#include <cmath>
#include "main.h"
#include "cpessasynth_components/voice/Voice.h"

//
// Created by spessasus on 21.05.24.
// main audio rendering code
//

#ifdef __cplusplus
extern "C" {
#endif
    EMSCRIPTEN_KEEPALIVE
    void renderAudio(int channelNumber,
                     int bufferLength,

                     float* outputLeft,
                     float* outputRight,

                     float* reverbLeft,
                     float* reverbRight,

                     float* chorusLeft,
                     float* chorusRight) {
        for(int i = 0; i < bufferLength; i++)
        {
            // fill the arrays with a sine wave
            //float sample = i > 64 ? 1.0f : -1.0f;
            float sample = sinf(2.0f * M_PI * i / bufferLength);
            outputRight[i] = sample;
            chorusLeft[i] = sample;
        }
    }

#ifdef __cplusplus
}
#endif
