//
// Created by spessasus on 24.05.24.
//

#include <emscripten/emscripten.h>
#include "CppessaSynth.h"
#include "unit_converter/UnitConverter.h"

EMSCRIPTEN_KEEPALIVE
CppessaSynth::CppessaSynth(
        int outputsAmount,
        float sampleRate,
        unsigned int totalSamplesAmount) : sampleDumpManager(SampleDumpManager(totalSamplesAmount)) {
    this->sampleRate = sampleRate;
    this->sampleTime = 1.0f / sampleRate;
    this->sampleRate = sampleRate;
    this->outputsAmount = outputsAmount;
    UnitConverter::initializeLookupTables();

    for (int i = 0; i < outputsAmount; ++i) {
        this->midiChannels.emplace_back();
    }

    printf("CppessaSynth succesfully initialized! with the following params:\n"
           "sample rate: %f\noutputs amount: %d\ntotal samples amount: %d\n", sampleRate, outputsAmount, totalSamplesAmount);

}

EMSCRIPTEN_KEEPALIVE
void CppessaSynth::addNewChannel() {
    this->midiChannels.emplace_back();
}

EMSCRIPTEN_KEEPALIVE
void CppessaSynth::controllerChange(int channel, unsigned char index, int value, float currentTime) {
    this->midiChannels[channel].controllerChange(index, value, currentTime);

}

EMSCRIPTEN_KEEPALIVE
void CppessaSynth::addVoice(int channel, Voice &voice) {
    this->midiChannels[channel].addVoice(voice);
}


EMSCRIPTEN_KEEPALIVE
void CppessaSynth::renderAudio(float **outputsLeft, float **outputsRight, int bufferLength, float currentTime) {
    auto channelsAmount = this->midiChannels.size();
    for (auto i = 0; i < channelsAmount; ++i) {
        // demo sine wave
//        for (int j = 0; j < bufferLength; ++j) {
//            outputsLeft[i % this->outputsAmount][j] = sinf((float)j / ((float)i + 1.0f)) * 0.05f;
//        }

        this->midiChannels[i].renderAudio(
                currentTime,
                bufferLength,
                outputsLeft[i % this->outputsAmount],
                outputsRight[i % this->outputsAmount],
                outputsLeft[0],
                outputsRight[0],
                outputsLeft[1],
                outputsRight[1],
                this->sampleDumpManager,
                this->sampleTime);

        //printf("%f\n", outputsLeft[i % this->outputsAmount][0]);
    }

}

void CppessaSynth::noteOff(int channel, unsigned char midiNote, float currentTime) {
    this->midiChannels[channel].noteOff(midiNote, currentTime);
}

void CppessaSynth::dumpSample(float *sampleData, unsigned int sampleLength, unsigned int sampleID) const {
    // TODO: cursor adjusting
    this->sampleDumpManager.DumpSample(sampleData, sampleLength, sampleID);
}
