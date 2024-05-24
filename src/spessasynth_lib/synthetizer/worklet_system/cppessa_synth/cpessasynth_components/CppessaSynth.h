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
    float sampleRate;

    CppessaSynth(int outputsAmount, float sampleRate, unsigned int totalSamplesAmount);

    void addNewChannel();
    void controllerChange(int channel, unsigned char index, int value, float currentTime);
    void addVoice(int channel, Voice& voice);
    void noteOff(int channel, unsigned char midiNote, float currentTime);

    void dumpSample(float* sampleData, unsigned int sampleLength, unsigned int sampleID) const;

    /**
     * Renders the complete audio
     * @param outputsLeft first array is REVERB LEFT second is CHORUS LEFT
     * @param outputsRight first array is REVERB RIGHT second is CHORUS RIGHT
     * @param currentTime
     */
    void renderAudio(float** outputsLeft, float** outputsRight, int bufferLength, float currentTime);

private:
    int outputsAmount;
    float sampleTime;
};


#endif //SPESSASYNTH_CPPESSASYNTH_H
