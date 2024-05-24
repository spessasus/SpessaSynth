//
// Created by spessasus on 21.05.24.
//

#pragma once
#ifndef SPESSASYNTH_MAIN_H
#define SPESSASYNTH_MAIN_H

#include "extern_c.h"

EXTERN_C_BEGIN

/**
     * @param channelsAmount number of channels amount for left and right each (2 more buffers are for reverb + chorus!!!!)
     * @param bufferLength sample length of the output arrays
     * @param currentTime the current time
     * @param outputsLeft left output buffers (2 dimensional array) FIRST IS REVERB THEN CHORUS then THE DRY CHANNELS!!!!
     * @param outputsRight right output buffers (2 dimensional array) FIRST IS REVERB THEN CHORUS THEN DRY CHANNELS!
     */
EMSCRIPTEN_KEEPALIVE
void renderAudio(
        int bufferLength,
        float currentTime,
        int channelsAmount,
        float** outputsLeft,
        float** outputsRight);

/**
 * Initializes the C++ audio renderer
 * @param outputsAmount the amount of outputs
 * @param sampleRate the sample rate
 * @param totalSamplesAmount total amount of samples stored in the soundfont
 */
EMSCRIPTEN_KEEPALIVE
void initializeCppessaSynth(int outputsAmount,
                           float sampleRate,
                           unsigned int totalSamplesAmount);

/**
 * Creates a voice and finishes modulator dumping
 * @param channel
 * @param midiNote
 * @param velocity
 * @param targetKey
 * @param rootKey
 * @param startTime
 * @param sampleID
 * @param playbackRate
 * @param loopStart
 * @param loopEnd
 * @param sampleStart
 * @param sampleEnd
 * @param loopingMode
 * @param generators length MUST BE 60!
 * @param serializedModulators modulators serialized as follows 5 elements per modulator sourceEnum, secSourceEnum, destination, transformAmount, transformType
 * @param modulatorsAmount the amount of modulators NOT ARRAY LENGTH
 */
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

        int* generators,
        int* serializedModulators,
        int modulatorsAmount);

EMSCRIPTEN_KEEPALIVE
void dumpSample(float *sampleData, unsigned int sampleLength, unsigned int sampleID, float currentTime);

EMSCRIPTEN_KEEPALIVE
void noteOff(int channel, unsigned char midiNote, float currentTime);

EMSCRIPTEN_KEEPALIVE
void controllerChange(int channel, unsigned char index, int value, float currentTime);

EMSCRIPTEN_KEEPALIVE
int getVoicesAmount(int channel);

EMSCRIPTEN_KEEPALIVE
void clearDumpedSamples(unsigned int totalSamplesAmount);

EMSCRIPTEN_KEEPALIVE
void addNewChannel();

EMSCRIPTEN_KEEPALIVE
void setChannelMute(int channel, bool isMuted);

EMSCRIPTEN_KEEPALIVE
void killVoices(int amount);

EMSCRIPTEN_KEEPALIVE
void stopAll(bool force, float currentTime);

EMSCRIPTEN_KEEPALIVE
void setChannelVibrato(int channel, float rate, float delay, int depth);

EXTERN_C_END
#endif //SPESSASYNTH_MAIN_H