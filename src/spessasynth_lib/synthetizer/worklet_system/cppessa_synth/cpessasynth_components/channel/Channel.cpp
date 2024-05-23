//
// Created by spessasus on 22.05.24.
//

#include "Channel.h"
#include "../midiControllers.h"

void Channel::renderAudio(
        float currentTime,
        int bufferLength,
        float *outputLeft,
        float *outputRight,
        float *reverbLeft,
        float *reverbRight,
        float *chorusLeft,
        float *chorusRight,
        SampleDumpManager &sampleDumpManager,
        float sampleTime) {
    // render all voices
    for (Voice& voice : this->voices)
    {
        voice.renderAudio(
                currentTime,
                bufferLength,
                outputLeft,
                outputRight,
                reverbLeft,
                reverbRight,
                chorusLeft,
                chorusRight,
                sampleDumpManager,
                this->channelControllerTable,
                this->vibrato,
                sampleTime);
    }

    // remove finished
    this->voices.erase(
    std::remove_if(this->voices.begin(), this->voices.end(), [](const Voice& voice) {
        return voice.finished;
    }),
    voices.end());
}

void Channel::controllerChange(unsigned char controllerNumber, unsigned char controllerValue) {
    this->channelControllerTable[controllerNumber] = controllerValue;
    for(Voice &voice : this->voices)
    {
        voice.computeModulators(this->channelControllerTable);
    }

}

void Channel::setChannelVibrato(float rate, float delay, int depth) {
    this->vibrato.depthCents = depth;
    this->vibrato.frequencyHz = rate;
    this->vibrato.delaySeconds = delay;

}

void Channel::stopAll(float currentTime, bool force) {
    if(force)
    {
        this->voices.clear();
        this->sustainedVoices.clear();
    }
    else
    {
        for (Voice &voice : this->voices)
        {
            Channel::releaseVoice(voice, currentTime);
        }
    }

}

void Channel::releaseVoice(Voice &voice, float currentTime) {
    voice.releaseStartTime = currentTime;
    // check if the note is shorter than the min note time, if so, extend it
    if(voice.releaseStartTime - voice.startTime < MINIMUM_NOTE_LENGTH)
    {
        voice.releaseStartTime = voice.startTime + MINIMUM_NOTE_LENGTH;
    }

}

void Channel::noteOff(unsigned char midiNote, float currentTime) {
    for (Voice &voice : this->voices) {
        if(voice.midiNote != midiNote || voice.isInRelease)
        {
            continue;
        }

        // if hold pedal is on, move the voice to sustain
        if(this->holdPedal)
        {
            this->sustainedVoices.push_back(std::move(voice));
        }
        else
        {
            Channel::releaseVoice(voice, currentTime);
        }
    }
}

void Channel::addVoice(Voice &voice) {
    this->voices.push_back(voice);
}


void Channel::resetControllers() {
    // fill the controller table with reset array
    std::copy(std::begin(this->resetArray), std::end(this->resetArray), std::begin(this->channelControllerTable));
}

Channel::Channel() : vibrato(ChannelVibrato(0, 0, 0)), resetArray{0}, channelControllerTable{0} {
    // an array with preset default values so we can quickly use set() to reset the controllers
    // default values
    this->resetArray[MidiControllers::MainVolume] = 100 << 7;
    this->resetArray[MidiControllers::ExpressionController] = 127 << 7;
    this->resetArray[MidiControllers::Pan] = 64 << 7;
    this->resetArray[MidiControllers::ReleaseTime] = 64 << 7;
    this->resetArray[MidiControllers::Brightness] = 64 << 7;
    this->resetArray[NON_CC_INDEX_OFFSET + Modulator::SourceEnums::pitchWheel] = 8192;
    this->resetArray[NON_CC_INDEX_OFFSET + Modulator::SourceEnums::pitchWheelRange] = 2 << 7;
    this->resetArray[NON_CC_INDEX_OFFSET + Modulator::SourceEnums::channelPressure] = 127 << 7;
    this->resetArray[NON_CC_INDEX_OFFSET + Modulator::SourceEnums::channelTuning] = 0;

    this->holdPedal = false;
    this->isMuted = false;

    // fill the controller table with reset array
    std::copy(std::begin(this->resetArray), std::end(this->resetArray), std::begin(this->channelControllerTable));
}
