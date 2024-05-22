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
    const float AMPLITUDE = 0.3f;
    int freq = 240;
    float phase = 0;
#endif
    EMSCRIPTEN_KEEPALIVE
    void renderAudio(int channelNumber,
                     int bufferLength,
                     float currentTime,

                     float* outputLeft,
                     float* outputRight,

                     float* reverbLeft,
                     float* reverbRight,

                     float* chorusLeft,
                     float* chorusRight) {
        for(int i = 0; i < bufferLength; i++)
        {
            // THIS IS THE BEST SOUND EVER WHAT
            float sample = phase < 0.5 ? AMPLITUDE : -AMPLITUDE;
            chorusRight[i] = sample;
            chorusLeft[i] = sample;
            reverbRight[i] = sample;
            reverbLeft[i] = sample;
            outputRight[i] = sample;
            phase += (float)freq / 44100.0f;
            if (phase >= 1.0) {
                phase -= 1.0;
            }

            freq = currentTime * 440;
        }
    }

#ifdef __cplusplus
}
#endif
