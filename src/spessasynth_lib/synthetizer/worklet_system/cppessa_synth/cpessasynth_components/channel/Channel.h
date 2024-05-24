//
// Created by spessasus on 22.05.24.
//

#ifndef SPESSASYNTH_CHANNEL_H
#define SPESSASYNTH_CHANNEL_H

#include <iostream>
#include <vector>
#include "../voice/Voice.h"
#include "ChannelVibrato.h"
#include "../constants.h"

class Channel {
public:
    std::vector<Voice> voices;
    std::vector<Voice*> sustainedVoices;
    ChannelVibrato vibrato;
    int channelControllerTable[MIDI_CONTROLLER_TABLE_SIZE];
    bool holdPedal;
    bool isMuted;

    /**
     * Renders the voices' data out to the buffers
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
    void renderAudio(
            float currentTime,
            int bufferLength,
            float *outputLeft,
            float *outputRight,
            float *reverbLeft,
            float *reverbRight,
            float *chorusLeft,
            float *chorusRight,
            SampleDumpManager &sampleDumpManager,
            float sampleTime);

    /**
     * called on sample dump, used to adjust the voices that were started before the sample was dumped
     * note: this is only used in sf3 as sf2 sample loading is synchronous (i.e. waits for it to load before starting a voice)
     * @param sampleID the dumped sample's id
     * @param sampleLength the dumped sample's length
     */
    void adjustVoices(unsigned int sampleID, unsigned int sampleLength, float currentTime);

    void controllerChange(unsigned char controllerNumber, int controllerValue, float currentTime);
    void setChannelVibrato(float rate, float delay, int depth);
    void stopAll(float currentTime, bool force = false);
    void noteOff(unsigned char midiNote, float currentTime);
    void addVoice(Voice& voice, float currentTime);
    void resetControllers();
    void setMuted(bool isMuted);

    Channel(float sampleRate);

private:
    static void releaseVoice(Voice& voice, float currentTime);
    int resetArray[MIDI_CONTROLLER_TABLE_SIZE];

    float sampleRate;
};


#endif //SPESSASYNTH_CHANNEL_H
