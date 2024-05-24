//
// Created by spessasus on 23.05.24.
//

#include "ModulationEnvelope.h"
#include "../unit_converter/UnitConverter.h"
#include <cmath>

float ModulationEnvelope::modulationConvexAttack[MODULATION_ENVELOPE_CONVEX_LENGTH];
bool ModulationEnvelope::isConvexPrecomputed = false;

float ModulationEnvelope::getModulationEnvelopeValue(Voice* voice, float currentTime) {
    if(!ModulationEnvelope::isConvexPrecomputed)
    {
        ModulationEnvelope::precomputeModulationConvex();
    }
    float attackDuration = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::attackModEnv]);
    float decayDuration = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::decayModEnv])
            + (float)((60 - voice->midiNote) * voice->modulatedGenerators[GeneratorTypes::keyNumToModEnvDecay]);
    float holdDuration = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::holdModEnv])
            + (float)((60 - voice->midiNote) * voice->modulatedGenerators[GeneratorTypes::keyNumToModEnvHold]);

    // delay logic
    if(voice->isInRelease)
    {
        float releaseDuration = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::releaseModEnv]);
        // if release is short, don't calculate anything
        if(voice->modulatedGenerators[GeneratorTypes::releaseModEnv] < -7199)
        {
            return voice->releaseStartModEnv;
        }
        return (1.0f - (currentTime - voice->releaseStartTime) / releaseDuration) * voice->releaseStartModEnv;
    }

    // calculate absolute start times
    float sustainValue = 1.0f - ((float)voice->modulatedGenerators[GeneratorTypes::sustainModEnv] / 1000.0f);
    float delayEnd = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::delayModEnv]) + voice->startTime;
    float attackEnd = attackDuration + delayEnd;
    float holdEnd = holdDuration + attackEnd;
    float decayEnd = decayDuration + holdEnd;

    float envelopeValue;
    if(currentTime < delayEnd)
    {
        // delay, value is 0
        envelopeValue = 0.0f;
    }
    else if(currentTime < attackEnd)
    {
        // attack, get value from convex tab
        envelopeValue = ModulationEnvelope::modulationConvexAttack[(int)floor((1 - (attackEnd - currentTime) / attackDuration) * 1000)];
    }
    else if(currentTime < holdEnd)
    {
        // hold, holding the value at max
        envelopeValue = MODULATION_ENVELOPE_PEAK;
    }
    else if(currentTime < decayEnd)
    {
        // decay, linearly ramp from peak to sustain level
        envelopeValue = (1.0f - (decayEnd - currentTime) / decayDuration) * (sustainValue - MODULATION_ENVELOPE_PEAK) + MODULATION_ENVELOPE_PEAK;
    }
    else
    {
        // susstain, stay at the sustain level
        envelopeValue = sustainValue;
    }
    voice->currentModEnvValue = envelopeValue;
    return envelopeValue;

}

void ModulationEnvelope::precomputeModulationConvex() {
    ModulationEnvelope::isConvexPrecomputed = true;
    // precompute convex positive unipolar
    ModulationEnvelope::modulationConvexAttack[0] = 0.0f;
    ModulationEnvelope::modulationConvexAttack[MODULATION_ENVELOPE_CONVEX_LENGTH - 1] = 1.0f;
    for(int i = 1; i < MODULATION_ENVELOPE_CONVEX_LENGTH - 1; i++)
    {
        float x = -200.0f * 2.0f / 960.0f * logf((float)i / (MODULATION_ENVELOPE_CONVEX_LENGTH - 1.0f)) / (float)M_LN10;
        ModulationEnvelope::modulationConvexAttack[i] = 1.0f - x;
    }
}
