#include <iostream>
#include <emscripten.h>
#include "main.h"
#include "cpessasynth_components/CppessaSynth.h"

//
// Created by spessasus on 21.05.24.
// main javascript communication code
//

extern "C";
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
void dumpSample(float *sampleData, unsigned int sampleLength, unsigned int sampleID, float currentTime) {
    cppessaSynth->dumpSample(sampleData, sampleLength, sampleID, currentTime);
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
    cppessaSynth->addVoice(channel, voice, startTime);
}

EMSCRIPTEN_KEEPALIVE
void noteOff(int channel, unsigned char midiNote, float currentTime) {
    cppessaSynth->noteOff(channel, midiNote, currentTime);
}

EMSCRIPTEN_KEEPALIVE
void controllerChange(int channel, unsigned char index, int value, float currentTime) {
    cppessaSynth->controllerChange(channel, index, value, currentTime);
}

EMSCRIPTEN_KEEPALIVE
int getVoicesAmount(int channel) {
    return cppessaSynth->getVoicesAmount(channel);
}

EMSCRIPTEN_KEEPALIVE
void clearDumpedSamples(unsigned int totalSamplesAmount) {
    cppessaSynth->clearDumpedSamples(totalSamplesAmount);
}


EMSCRIPTEN_KEEPALIVE
void addNewChannel() {
    cppessaSynth->addNewChannel();
}

EMSCRIPTEN_KEEPALIVE
void setChannelMute(int channel, bool isMuted) {
    cppessaSynth->muteChannel(channel, isMuted);
}

EMSCRIPTEN_KEEPALIVE
void killVoices(int amount) {
    cppessaSynth->killVoices(amount);
}

EMSCRIPTEN_KEEPALIVE
void stopAll(bool force, float currentTime) {
    cppessaSynth->stopAll(force, currentTime);
}

void setChannelVibrato(int channel, float rate, float delay, int depth) {
    cppessaSynth->setChannelVibrato(channel, rate, delay, depth);
}


