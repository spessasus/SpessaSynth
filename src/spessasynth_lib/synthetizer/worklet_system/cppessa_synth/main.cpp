#include <iostream>
#include <emscripten.h>
#include <cmath>
#include "main.h"
#include "cpessasynth_components/CppessaSynth.h"

//
// Created by spessasus on 21.05.24.
// main audio rendering code and javascript communication code
//

EXTERN_C_BEGIN
    const float AMPLITUDE = 0.1f;
    CppessaSynth* cppessaSynth;

    EMSCRIPTEN_KEEPALIVE
    void renderAudio(
            int bufferLength,
            float currentTime,
            int channelsAmount,
            float** outputsLeft,
            float** outputsRight) {
    // note: this is just a basic test to see if the communication wokrs
    // for every channel
    // plus two BECAUSE FIRST IS REVERB AND SECOND IS CHORUS!!!!
    cppessaSynth->renderAudio(outputsLeft, outputsRight, bufferLength, currentTime);
    }


EMSCRIPTEN_KEEPALIVE
void initializeCppessaSynth(int outputsAmount, float sampleRate, unsigned int totalSamplesAmount) {
    cppessaSynth = new CppessaSynth(outputsAmount, sampleRate, totalSamplesAmount);
}

EMSCRIPTEN_KEEPALIVE
void dumpSample(float *sampleData, unsigned int sampleLength, unsigned int sampleID) {
    cppessaSynth->dumpSample(sampleData, sampleLength, sampleID);
}

EMSCRIPTEN_KEEPALIVE
void createVoice(
        int channel,
        unsigned char midiNote,
        unsigned char velocity,
        unsigned char targetKey,
        unsigned int rootKey,
        float startTime,
        unsigned int sampleID,
        float playbackRate,
        unsigned int loopStart,
        unsigned int loopEnd,
        unsigned int sampleStart,
        unsigned int sampleEnd,
        char loopingMode,
        int *generators,
        int* serializedModulators,
        int modulatorsAmount) {
    // decode modulators
    std::vector<Modulator> decodedModulators;
    int modulatorArrayIndex = 0;
    for (int i = 0; i < modulatorsAmount; ++i) {
        decodedModulators.emplace_back(
                serializedModulators[modulatorArrayIndex],
                serializedModulators[modulatorArrayIndex + 1],
                serializedModulators[modulatorArrayIndex + 2],
                serializedModulators[modulatorArrayIndex + 3],
                serializedModulators[modulatorArrayIndex + 4]);
        modulatorArrayIndex += 5;

        decodedModulators[decodedModulators.size() - 1].debugString();
    }
    for (int i = 0; i < GENERATORS_AMOUNT_TOTAL; ++i) {
        printf("generator %d: %d\n", i, generators[i]);
    }

    VoiceSample voiceSample = VoiceSample(
            sampleID,
            playbackRate,
            rootKey,
            loopStart,
            loopEnd,
            sampleStart,
            sampleEnd,
            loopingMode);

    Voice voice = Voice(
            voiceSample,
            decodedModulators,
            generators,
            midiNote,
            velocity,
            targetKey,
            (unsigned int)cppessaSynth->sampleRate,
            startTime);
    cppessaSynth->addVoice(channel, voice);
}

EXTERN_C_END