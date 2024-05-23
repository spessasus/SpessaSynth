//
// Created by spessasus on 24.05.24.
//

#include "CppessaSynth.h"

CppessaSynth::CppessaSynth(
        int outputsAmount,
        float sampleRate,
        unsigned int totalSamplesAmount) : sampleDumpManager(SampleDumpManager(totalSamplesAmount)) {
    this->sampleRate = sampleRate;
    this->sampleTime = 1.0f / sampleRate;
    this->outputsAmount = outputsAmount;

    printf("CppessaSynth succesfully initialized!\n");

}
