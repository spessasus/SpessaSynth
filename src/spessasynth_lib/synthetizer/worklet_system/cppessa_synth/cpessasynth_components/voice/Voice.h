//
// Created by spessasus on 21.05.24.
//

#ifndef SPESSASYNTH_VOICE_H
#define SPESSASYNTH_VOICE_H

#include "VoiceSample.h"
#include "../lowpass_filter/LowpassFilter.h"
#include "../generatorTypes.h"
#include "../modulator/Modulator.h"
#include "../sample_dump_manager/SampleDumpManager.h"
#include "../channel/ChannelVibrato.h"

class Voice {
public:
    /**
     * generators modulated by modulators
     */
    int* modulatedGenerators;


    bool isInRelease;
    unsigned char midiNote;
    unsigned char velocity;
    unsigned char targetKey;

    enum VolumeEnvelopeState{
        delayPhase = 0,
        attackPhase = 1,
        holdPhase = 2,
        decayPhase = 3,
        sustainPhase = 4
    };

    char volumeEnvelopeState;
    float currentAttenuationDb;
    float currentModEnvValue;
    /**
     * the value of modenv when the voice was released
     */
    float releaseStartModEnv;
    bool finished;
    float startTime;
    float releaseStartTime;

    /**
     * Renders the voice's data out to the buffers
     * @param currentTime the current time in seconds
     * @param bufferLength the buffer length
     * @param outputLeft left dry buffer
     * @param outputRight right dry buffer
     * @param reverbLeft left reverb wet
     * @param reverbRight right reverb wet
     * @param chorusLeft left chorus wet
     * @param chorusRight right chorus wet
     * @param sampleTime the time of a single sample, for example a sample rate of 44100Hz would be 1 / 44100
     */
    void renderAudio(float currentTime, int bufferLength,
                     float *outputLeft, float* outputRight,
                     float *reverbLeft, float* reverbRight,
                     float *chorusLeft, float* chorusRight,
                     SampleDumpManager* sampleDumpManager,
                     int *channelControllerTable,
                     ChannelVibrato& channelVibrato,
                     float sampleTime);

    void computeModulators(int* channelControllerArray);

private:
    VoiceSample sample;
    LowpassFilter filter;

    /**
     * the voice's generators
     */
    int* generators;
    /**
     * the voice's modulators
     */
    Modulator* modulators;
    int modulatorsAmount;
    int currentTuningCents;
    float currentTuningCalculated;

};


#endif //SPESSASYNTH_VOICE_H
