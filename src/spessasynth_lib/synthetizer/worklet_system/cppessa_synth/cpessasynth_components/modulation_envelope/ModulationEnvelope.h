//
// Created by spessasus on 23.05.24.
//

#ifndef SPESSASYNTH_MODULATIONENVELOPE_H
#define SPESSASYNTH_MODULATIONENVELOPE_H

#include "../voice/Voice.h"
#include "../constants.h"

class ModulationEnvelope {
public:
    /**
     * Calculates the current modulation envelope value for the given time and voice
     * @param voice the voice we're working on
     * @param currentTime in seconds
     * @return the modulation envelope value, mapped from 0 to 1
     */
    static float getModulationEnvelopeValue(Voice* voice, float currentTime);

    static bool isConvexPrecomputed;

    /**
     * mapped from 0 to 1
     */
    static float modulationConvexAttack[MODULATION_ENVELOPE_CONVEX_LENGTH];

    static void precomputeModulationConvex();
};


#endif //SPESSASYNTH_MODULATIONENVELOPE_H
