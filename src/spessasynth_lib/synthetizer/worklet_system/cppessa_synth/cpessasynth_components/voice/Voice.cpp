//
// Created by spessasus on 21.05.24.
//

#include <cmath>
#include <algorithm>
#include <emscripten/emscripten.h>
#include "Voice.h"
#include "../constants.h"
#include "../unit_converter/UnitConverter.h"
#include "../low_frequency_oscillator/LowFrequencyOscillator.h"
#include "../modulation_envelope/ModulationEnvelope.h"
#include "../wavetable_oscillator/WavetableOscillator.h"
#include "../volumeEnvelope/VolumeEnvelope.h"
#include "../stereo_panner/StereoPanner.h"

EMSCRIPTEN_KEEPALIVE
void Voice::computeModulators(int (&channelControllerTable)[MIDI_CONTROLLER_TABLE_SIZE]) {

    // copy data
    for (int i = 0; i < GENERATORS_AMOUNT_TOTAL; ++i) {
        this->modulatedGenerators[i] = this->generators[i];
    }
    for(Modulator &modulator : this->modulators)
    {
        modulator.computeModulator(
                channelControllerTable,
                this->modulatedGenerators,
                this->midiNote,
                this->velocity);
    }

}

EMSCRIPTEN_KEEPALIVE
void Voice::renderAudio(
        float currentTime,
        int bufferLength,
        float *outputLeft, float *outputRight,
        float *reverbLeft, float *reverbRight,
        float *chorusLeft, float *chorusRight,
        SampleDumpManager& sampleDumpManager,
        const int (&channelControllerTable)[MIDI_CONTROLLER_TABLE_SIZE],
        ChannelVibrato& channelVibrato,
        float sampleTime) {

    // if no matching sample, perhaps it's still being loaded..? worklet_channel.js line 256
    if(sampleDumpManager.dumpedSamples[this->sample.sampleID].isEmpty)
    {
        return;
    }

    // check if the voice is in release
    if(!this->isInRelease)
    {
        // if not in release, check if it has passed the release time
        if (currentTime >= this->releaseStartTime)
        {
            // save the current mod env value and flag as releasee
            this->releaseStartModEnv = this->currentModEnvValue;
            this->isInRelease = true;
        }
    }

    // if the initial attenuation is more than 100dB, skip the voice (it's silent anyways)
    if(this->modulatedGenerators[GeneratorTypes::initialAttenuation] > 2500) {
        // if in release, the voice has finished the volume envelope
        if(this->isInRelease)
        {
            this->finished = true;
        }
        return;
    }

    // TUNING CALCULATION

    // cent and semitone tuning
    int centTuning = this->modulatedGenerators[GeneratorTypes::fineTune]
            + channelControllerTable[NON_CC_INDEX_OFFSET + Modulator::SourceEnums::channelTuning]
            + channelControllerTable[NON_CC_INDEX_OFFSET + Modulator::SourceEnums::channelTranspose];
    int semitoneTuning = this->modulatedGenerators[GeneratorTypes::coarseTune];

    // calculate tuning by midi key
    centTuning += (int)(this->targetKey - this->sample.rootKey) * this->modulatedGenerators[GeneratorTypes::scaleTuning];

    // vibrato LFO
    int vibratoDepth = this->modulatedGenerators[GeneratorTypes::vibLfoToPitch];
    // if on, calculate the lfo
    if(vibratoDepth > 0)
    {
        float vibratoStartTime = this->startTime + UnitConverter::timecentsToSeconds(this->modulatedGenerators[GeneratorTypes::delayVibLFO]);
        float vibratoFrequencyHz = UnitConverter::absCentsToHz(this->modulatedGenerators[GeneratorTypes::freqVibLFO]);
        float vibratoLFOvalue = LowFrequencyOscillator::getOscillatorValue(vibratoStartTime, vibratoFrequencyHz, currentTime);
        if(vibratoLFOvalue != 0.0f)
        {
            centTuning += (int)vibratoLFOvalue * vibratoDepth;
        }
    }

    // calculate cutoff frequency
    int cutoffCents = this->modulatedGenerators[GeneratorTypes::initialFilterFc];

    // modulation LFO
    int modulationPitchDepth = this->modulatedGenerators[GeneratorTypes::modLfoToPitch];
    int modulationVolumeDepth = this->modulatedGenerators[GeneratorTypes::modLfoToVolume];
    int modulationFilterDepth = this->modulatedGenerators[GeneratorTypes::modLfoToFilterFc];
    int modulationLFOCentibelOffset = 0;

    if(modulationFilterDepth + modulationPitchDepth + modulationPitchDepth > 0)
    {
        // compute lfo value
        float modulationStartTime = this->startTime + UnitConverter::timecentsToSeconds(this->modulatedGenerators[GeneratorTypes::delayModLFO]);
        float modulationFrequencyHz = UnitConverter::absCentsToHz(this->modulatedGenerators[GeneratorTypes::freqModLFO]);
        float modulationLFOValue = LowFrequencyOscillator::getOscillatorValue(modulationStartTime, modulationFrequencyHz, currentTime);

        // adjust other values
        centTuning += (int)modulationLFOValue * modulationPitchDepth;
        modulationLFOCentibelOffset = (int)modulationLFOValue * modulationVolumeDepth;
        cutoffCents += (int)modulationLFOValue * modulationFilterDepth;
    }

    // channel vibrato (GS NRPN)
    if(channelVibrato.depthCents > 0)
    {
        float channelVibratoValue = LowFrequencyOscillator::getOscillatorValue(
                this->startTime + channelVibrato.delaySeconds,
                channelVibrato.frequencyHz,
                currentTime);
        centTuning += (int)channelVibratoValue * channelVibrato.depthCents;
    }

    // modulation envelope
    int modulationEnvelopePitchDepth = this->modulatedGenerators[GeneratorTypes::modEnvToPitch];
    int modulationEnvelopeFilterDepth = this->modulatedGenerators[GeneratorTypes::modLfoToFilterFc];
    float modulationEnvelopeValue = ModulationEnvelope::getModulationEnvelopeValue(this, currentTime);
    cutoffCents += (int)modulationEnvelopeValue * modulationEnvelopeFilterDepth;
    centTuning += (int)modulationEnvelopeValue * modulationEnvelopePitchDepth;

    // calculate the final playback rate
    int centTuningFinal = centTuning + semitoneTuning * 100;
    if(centTuningFinal != this->currentTuningCents)
    {
        // if it has changed, calculate the new tuning
        this->currentTuningCents = centTuningFinal;
        this->currentTuningCalculated = powf(2, (float) centTuningFinal / 1200.0f);
    }

    // PANNING CALCULATION

    // map the pan value to 0-1 range
    float pan = ((
            (float)std::clamp(this->modulatedGenerators[GeneratorTypes::pan], GENERATORS_PAN_MINIMUM, GENERATORS_PAN_MAXIMUM))
                    + GENERATORS_PAN_MAXIMUM) / (GENERATORS_PAN_MAXIMUM * 2.0f);

    // SYNTHESIS

    // prepare the output table
    auto* outputTable = new float[bufferLength];

    // wavetable oscillator (will return true if the sample has reached the end)
    this->isInRelease = WavetableOscillator::getOscillatorData(this->sample,
                                           this->isInRelease,
                                           sampleDumpManager.dumpedSamples[this->sample.sampleID],
                                           outputTable,
                                           bufferLength,
                                           this->currentTuningCalculated);

    // low pass filter
    //this->filter.applyLowpassFilter(this->modulatedGenerators[GeneratorTypes::initialFilterQ], cutoffCents, outputTable, bufferLength);

    // volume envelope
    VolumeEnvelope::applyVolumeEnvelope(this,
                                        outputTable,
                                        bufferLength,
                                        currentTime,
                                        modulationLFOCentibelOffset,
                                        sampleTime);

    // pan the voice and write out
    StereoPanner::panVoice(pan, outputTable,
                           outputLeft, outputRight,
                           reverbLeft, reverbRight,
                           chorusLeft, chorusRight,
                           this->modulatedGenerators[GeneratorTypes::chorusEffectsSend],
                           this->modulatedGenerators[GeneratorTypes::reverbEffectsSend],
                           bufferLength);


    delete[] outputTable;
}

EMSCRIPTEN_KEEPALIVE
Voice::Voice(
        VoiceSample &voiceSample,
        std::vector<Modulator> &modulators,
        int* generators,
        unsigned char midiNote,
        unsigned char velocity,
        unsigned char targetKey,
        unsigned int sampleRate,
        float startTime)

        : modulators(modulators),
        sample(voiceSample),
        filter(LowpassFilter(sampleRate)),
        midiNote(midiNote),
        velocity(velocity),
        targetKey(targetKey),
        startTime(startTime){

    this->generators = generators;
    this->filter = LowpassFilter(sampleRate);

    this->isInRelease = false;
    this->finished = false;
    this->volumeEnvelopeState = VolumeEnvelopeState::delayPhase;
    this->currentAttenuationDb = 100;
    this->currentModEnvValue = 0;
    this->releaseStartModEnv = 1;
    this->currentTuningCalculated = 1;
    this->currentTuningCents = 0;
    this->releaseStartTime = INFINITY;
}

Voice::~Voice()
{
    delete[] this->generators;
}