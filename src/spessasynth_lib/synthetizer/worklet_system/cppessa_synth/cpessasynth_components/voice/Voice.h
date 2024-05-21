//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_VOICE_H
#define SPESSASYNTH_VOICE_H

#include "VoiceSample.h"
#include "../lowpass_filter/LowpassFilter.h"
#include "../generatorTypes.h"

class Voice {
public:
    /**
     * generators modulated by modulators
     */
    int* modulatedGenerators;
private:
    VoiceSample sample;
    LowpassFilter filter;

    /**
     * the voice's generators
     */
    int* generators;

};


#endif //SPESSASYNTH_VOICE_H
