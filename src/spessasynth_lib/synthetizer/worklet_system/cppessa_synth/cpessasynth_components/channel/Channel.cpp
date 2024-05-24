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
    if(this->isMuted)
    {
        return;
    }
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

void Channel::controllerChange(unsigned char controllerNumber, int controllerValue, float currentTime) {
    // special case: hold pedal
    if(controllerNumber == MidiControllers::SustainPedal) {
        if (controllerValue >= 64)
        {
            this->holdPedal = true;
        }
        else
        {
            this->holdPedal = false;
            for(Voice *voice : this->sustainedVoices)
            {
                Channel::releaseVoice(*voice, currentTime);
            }
     }
 }
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
        voice.releaseStartTime = currentTime + MINIMUM_NOTE_LENGTH;
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
            this->sustainedVoices.push_back(&voice);
        }
        else
        {
            Channel::releaseVoice(voice, currentTime);
        }
    }
}

void Channel::addVoice(Voice &voice, float currentTime) {
    // find voices with the same exclusive class
    int exclusiveClass = voice.generators[GeneratorTypes::exclusiveClass];

    // if exclusive class is set, look for other voices and release them
    if(exclusiveClass != 0)
    {
        for(Voice &checkedVoice : this->voices)
        {
            // if the voice has the same start time, ignore!
            if(checkedVoice.generators[GeneratorTypes::exclusiveClass] == exclusiveClass && checkedVoice.startTime != voice.startTime)
            {
                checkedVoice.generators[GeneratorTypes::releaseVolEnv] = -7900;
                checkedVoice.computeModulators(this->channelControllerTable);
                Channel::releaseVoice(voice, currentTime);
            }
        }
    }
    voice.computeModulators(this->channelControllerTable);
    this->voices.push_back(voice);
}


void Channel::resetControllers() {
    // fill the controller table with reset array
    std::copy(std::begin(this->resetArray), std::end(this->resetArray), std::begin(this->channelControllerTable));
}

Channel::Channel(float sampleRate) : vibrato(ChannelVibrato(0, 0, 0)), resetArray{0}, channelControllerTable{0}, sampleRate(sampleRate) {
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

void Channel::adjustVoices(unsigned int sampleID, unsigned int sampleLength, float currentTime) {
    for (Voice& voice : this->voices) {
        // adjust end position (include generators)
        voice.sample.end = sampleLength - 1 + voice.generators[GeneratorTypes::endAddrOffset] + (voice.generators[GeneratorTypes::endAddrsCoarseOffset] * 32768);
        // calculate for how long the sample has been playing and move the cursor there
        voice.sample.cursor = (voice.sample.playbackRate * this->sampleRate) * (currentTime - voice.startTime);
        // check for looping mode
        if(voice.sample.loopingMode == 0) // no loop
        {
            if (voice.sample.cursor >= (float)voice.sample.end) {
                voice.finished = true;
            }
        }
        else
        {
            // go through modulo (adjust cursor if the sample has looped
            if(voice.sample.cursor > (float)voice.sample.loopEnd) {
                voice.sample.cursor = (float)((unsigned int)voice.sample.cursor % ((voice.sample.loopEnd - voice.sample.loopStart) + voice.sample.loopStart));
            }
        }
    }
}

void Channel::setMuted(bool isMuted) {
    this->isMuted = isMuted;
}
