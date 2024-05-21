//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_VOICE_H
#define SPESSASYNTH_VOICE_H

#include "VoiceSample.h"
#include "../lowpass_filter/LowpassFilter.h"
#include "../generatorTypes.h"

extern "C"

class Voice {
private:
    VoiceSample sample;
    LowpassFilter filter;

    /**
     * the voice's generators
     */
    int* generators;

    /**
     * generators modulated by modulators
     */
    int* modulatedGenerators;

};


#endif //SPESSASYNTH_VOICE_H
