//
// Created by spessasus on 24.05.24.
//

#ifndef SPESSASYNTH_CPPESSASYNTH_H
#define SPESSASYNTH_CPPESSASYNTH_H

#include "sample_dump_manager/SampleDumpManager.h"
#include <vector>
#include "channel/Channel.h"

class CppessaSynth {
public:
    SampleDumpManager sampleDumpManager;
    std::vector<Channel> midiChannels;

    CppessaSynth(int outputsAmount, float sampleRate, unsigned int totalSamplesAmount);

private:
    int outputsAmount;
    float sampleTime;
    float sampleRate;
};


#endif //SPESSASYNTH_CPPESSASYNTH_H
