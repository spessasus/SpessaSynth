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
        this->midiChannels.emplace_back(sampleRate);
    }

    printf("CppessaSynth succesfully initialized! with the following params:\n"
           "sample rate: %f\noutputs amount: %d\ntotal samples amount: %d\n", sampleRate, outputsAmount, totalSamplesAmount);

}

EMSCRIPTEN_KEEPALIVE
void CppessaSynth::addNewChannel() {
    this->midiChannels.emplace_back(this->sampleRate);
}

EMSCRIPTEN_KEEPALIVE
void CppessaSynth::controllerChange(int channel, unsigned char index, int value, float currentTime) {
    this->midiChannels[channel].controllerChange(index, value, currentTime);

}

EMSCRIPTEN_KEEPALIVE
void CppessaSynth::addVoice(int channel, Voice &voice, float currentTime) {
    this->midiChannels[channel].addVoice(voice, currentTime);
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
                outputsLeft[i % this->outputsAmount + 2],
                outputsRight[i % this->outputsAmount + 2],
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

void CppessaSynth::dumpSample(float *sampleData, unsigned int sampleLength, unsigned int sampleID, float currentTime) {
    for (Channel& channel : this->midiChannels) {
        channel.adjustVoices(sampleID, sampleLength, currentTime);
    }
    this->sampleDumpManager.DumpSample(sampleData, sampleLength, sampleID);
}

int CppessaSynth::getVoicesAmount(int channel) {
    return (int)this->midiChannels[channel].voices.size();
}

void CppessaSynth::clearDumpedSamples(unsigned int totalSamplesAmount) {
    printf("CppessaSynth renitialized for %d samples!\n", totalSamplesAmount);
    this->sampleDumpManager.ClearDumpedSamples(totalSamplesAmount);
}

void CppessaSynth::muteChannel(int channel, bool isMuted) {
    this->midiChannels[channel].setMuted(isMuted);
}

void CppessaSynth::killVoices(int amount) {
    // sort voices by velocity and kill starting from lowest
    std::vector<Voice*> sortedVoices;

    // for each channel
    for (Channel& channel : midiChannels) {
        // for each voice in the channel
        for (Voice& voice : channel.voices) {
            // save to vector as pointer
            sortedVoices.push_back(&voice);
        }
    }

    // this is the strangest line of code i've seen but it works
    std::sort(sortedVoices.begin(), sortedVoices.end(),
              [](const Voice* a, const Voice* b) {
                  return a->velocity < b->velocity;
              });

    if(sortedVoices.size() <= amount)
    {
        amount = (int)sortedVoices.size();
    }

    for (int i = 0; i < amount; ++i) {
        sortedVoices[i]->finished = true;
    }
}

void CppessaSynth::stopAll(bool force, float currentTime) {
    for (Channel &channel : this->midiChannels) {
        channel.stopAll(force);
    }
}

void CppessaSynth::setChannelVibrato(int channel, float rate, float delay, int depth) {
    this->midiChannels[channel].setChannelVibrato(rate, delay, depth);
}
