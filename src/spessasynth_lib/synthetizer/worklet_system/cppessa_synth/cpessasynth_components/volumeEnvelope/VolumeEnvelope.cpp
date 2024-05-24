//
// Created by spessasus on 22.05.24.
//

#include <cmath>
#include <emscripten/emscripten.h>
#include "VolumeEnvelope.h"
#include "../unit_converter/UnitConverter.h"
#include "../constants.h"

EMSCRIPTEN_KEEPALIVE
void
VolumeEnvelope::applyVolumeEnvelope(Voice* voice, float *outputBuffer, unsigned int bufferLength, float currentTime,
                                    int centibelOffset, float sampleTime) {
    float decibelOffset = (float)centibelOffset / 10.0f;

    float attackDuration = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::attackVolEnv]);

    // include keyNum modifier
    float decayDuration = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::decayVolEnv]
            + ((60 - voice->midiNote) * voice->modulatedGenerators[GeneratorTypes::keyNumToVolEnvDecay]));
    float releaseDuration = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::releaseVolEnv]);


    // divide by ten to get decibels
    float attenuation = (float)voice->modulatedGenerators[GeneratorTypes::initialAttenuation] / 10.0f;

    float sustain = attenuation + (float)voice->modulatedGenerators[GeneratorTypes::sustainVolEnv] / 10.0f;

    float delayEnd = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::delayVolEnv]) + voice->startTime;
    float attackEnd = delayEnd + attackDuration;
    float holdEnd = UnitConverter::timecentsToSeconds(voice->modulatedGenerators[GeneratorTypes::holdVolEnv])
            + ((60.0f - (float)voice->midiNote) * (float)voice->modulatedGenerators[GeneratorTypes::keyNumToVolEnvHold]) + attackEnd;
    float decayEnd = decayDuration + holdEnd;

    if(voice->isInRelease)
    {
        // calculate the db attenuation at the time of release (not a constant because it can change (ex, volume set to 0, the sound should cut off)
        float releaseStartDb;
        switch (voice->volumeEnvelopeState)
        {
            case Voice::VolumeEnvelopeState::delayPhase:
                // delay phase, this shouldn't happen so skip to hold
                releaseStartDb = attenuation;
                break;

            case Voice::VolumeEnvelopeState::attackPhase: {
                // attack phase
                // attack is linear (in gain) so we need to do get db from that
                float elapsed = 1.0f - ((attackEnd - voice->releaseStartTime) / attackDuration);
                // calculate the gain that the attack would have
                float attackGain = elapsed * UnitConverter::decibelAttenuationToGain(attenuation + decibelOffset);

                // turn that into db
                releaseStartDb = 20.0f * log10(attackGain) * -1.0f;
                break;
            }

            case Voice::VolumeEnvelopeState::holdPhase:
                // hold
                releaseStartDb = attenuation;
                break;

            case Voice::VolumeEnvelopeState::decayPhase:
                // decay
                releaseStartDb = (1.0f - (decayEnd - voice->releaseStartTime) / decayDuration) * (sustain - attenuation) + attenuation;
                break;

            case Voice::VolumeEnvelopeState::sustainPhase:
                // sustain
                releaseStartDb = sustain;
        }
        float elapsedRelease = currentTime - voice->releaseStartTime;
        float dbDifference = DB_SILENCE - releaseStartDb;
        float gain;
        for (int i = 0; i < bufferLength; ++i) {
            float decibels = (elapsedRelease / releaseDuration) * dbDifference + releaseStartDb;
            gain = UnitConverter::decibelAttenuationToGain(decibels + decibelOffset);
            outputBuffer[i] *= gain;
            elapsedRelease += sampleTime;
        }

        // check if voice has gone silent
        if(gain <= GAIN_SILENCE)
        {
            voice->finished = true;
        }
        return;
    }
    float currentFrameTime = currentTime;
    float decibelAttenuation = DB_SILENCE;
    for (int i = 0; i < bufferLength; ++i) {
        switch (voice->volumeEnvelopeState) {
            case Voice::VolumeEnvelopeState::delayPhase:
                // delay phase, no sound is produced
                if(currentFrameTime >= delayEnd)
                {
                    // advance to the next phase
                    voice->volumeEnvelopeState++;
                }
                else
                {
                    decibelAttenuation = DB_SILENCE;
                    outputBuffer[i] = 0.0f;

                    // no need to continue;
                    currentFrameTime += sampleTime;
                    continue;
                }
                // fallthrough
            case Voice::VolumeEnvelopeState::attackPhase:
                // attack phase, ramp from 0 to attenuation
                if(currentFrameTime >= attackEnd)
                {
                    // advance to the next phase
                    voice->volumeEnvelopeState++;
                }
                else
                {
                    // Special case: linear gain ramp instead of linear db ramp
                    float elapsed = (attackEnd - currentFrameTime) / attackDuration;
                    decibelAttenuation = 10.0f * log10((elapsed * (attenuation - DB_SILENCE) + DB_SILENCE) * -1.0f);
                    outputBuffer[i] *= (1.0f - elapsed) * UnitConverter::decibelAttenuationToGain(attenuation + decibelOffset);
                    currentFrameTime += sampleTime;
                    continue;
                }
                // fallthrough

            case Voice::VolumeEnvelopeState::holdPhase:
                // hold/peak phase: stay at attenuation
                if(currentFrameTime >= holdEnd)
                {
                    voice->volumeEnvelopeState++;
                }
                else
                {
                    decibelAttenuation = attenuation;
                    break;
                }
                // fallthrough

            case Voice::VolumeEnvelopeState::decayPhase:
                // decay phase: linear ramp from attenuation to sustain
                if(currentFrameTime >= decayEnd)
                {
                    voice->volumeEnvelopeState++;
                }
                else
                {
                    decibelAttenuation = (1.0f - (decayEnd - currentFrameTime) / decayDuration) * (sustain - attenuation) + attenuation;
                    break;
                }
                // fallthrough

            case Voice::VolumeEnvelopeState::sustainPhase:
                // sustain phase: stay at sustain
                decibelAttenuation = sustain;

        }
        // apply gain and advance the time
        float gain = UnitConverter::decibelAttenuationToGain(decibelAttenuation + decibelOffset);
        outputBuffer[i] *= gain;
        currentFrameTime += sampleTime;
    }
    voice->currentAttenuationDb = decibelAttenuation;
    printf("attenuation level: %f sustain: %f attenuation %f calculated %f"
           "modulatedAttenuation: %d\n",
           decibelAttenuation, sustain, attenuation, UnitConverter::decibelAttenuationToGain(decibelAttenuation),
           voice->modulatedGenerators[GeneratorTypes::initialAttenuation]);
}
