//
// Created by spessasus on 22.05.24.
//

#ifndef SPESSASYNTH_VOLUMEENVELOPE_H
#define SPESSASYNTH_VOLUMEENVELOPE_H


#include "../voice/Voice.h"

class VolumeEnvelope{
public:
    /**
 * Applies volume envelope gain to the given output buffer
 * @param voice the voice we're working on
 * @param outputBuffer the output buffer to modify
 * @param bufferLength the output buffer's length
 * @param currentTime the current audio time
 * @param centibelOffset the centibel offset of volume, for modLFOtoVolume
 * @param sampleTime single sample time in seconds, usually 1 / 44100 of a second
 */

    static void applyVolumeEnvelope(Voice* voice,
                             float* outputBuffer,
                             unsigned int bufferLength,
                             float currentTime,
                             int centibelOffset,
                             float sampleTime);

};

#endif //SPESSASYNTH_VOLUMEENVELOPE_H
