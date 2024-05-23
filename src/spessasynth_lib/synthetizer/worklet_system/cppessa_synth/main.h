//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_MAIN_H
#define SPESSASYNTH_MAIN_H

extern "C"
/**
     * @param channelsAmount number of channels amount for left and right each (2 more buffers are for reverb + chorus!!!!)
     * @param bufferLength sample length of the output arrays
     * @param currentTime the current time
     * @param outputsLeft left output buffers (2 dimensional array) FIRST IS REVERB THEN CHORUS then THE DRY CHANNELS!!!!
     * @param outputsRight right output buffers (2 dimensional array) FIRST IS REVERB THEN CHORUS THEN DRY CHANNELS!
     */
EMSCRIPTEN_KEEPALIVE void renderAudio(
        int bufferLength,
        float currentTime,
        int channelsAmount,
        float** outputsLeft,
        float** outputsRight);

#endif //SPESSASYNTH_MAIN_H