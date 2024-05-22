//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_MAIN_H
#define SPESSASYNTH_MAIN_H

extern "C"
/**
     * @param channelNumber number of the channel to render
     * @param bufferLength sample length of the output arrays
     * @param currentTime the current time
     * @param outputLeft left dry output buffer
     * @param outputRight right dry output buffer
     * @param reverbLeft left reverb wet output buffer
     * @param reverbRight right reverb wet output buffer
     * @param chorusLeft  left chorus output buffer
     * @param chorusRight right chorus output buffer
     */
EMSCRIPTEN_KEEPALIVE void renderAudio(int channelNumber, int bufferLength, float currentTime,

                 float* outputLeft,float* outputRight,
                 float* reverbLeft,float* reverbRight,
                 float* chorusLeft,float* chorusRight);

#endif //SPESSASYNTH_MAIN_H