import { generatorTypes } from '../../../soundfont/chunk/generators.js'
import { absCentsToHz, timecentsToSeconds } from '../worklet_utilities/unit_converter.js'
import { getLFOValue } from '../worklet_utilities/lfo.js'
import { customControllers } from '../worklet_utilities/worklet_processor_channel.js'
import { getModEnvValue } from '../worklet_utilities/modulation_envelope.js'
import { getOscillatorData } from '../worklet_utilities/wavetable_oscillator.js'
import { panVoice } from '../worklet_utilities/stereo_panner.js'
import { applyVolumeEnvelope } from '../worklet_utilities/volume_envelope.js'
import { applyLowpassFilter } from '../worklet_utilities/lowpass_filter.js'
import { MIN_NOTE_LENGTH } from '../worklet_utilities/main_processor.js'

/**
 * Renders a voice to the stereo output buffer
 * @param channel {WorkletProcessorChannel} the voice's channel
 * @param voice {WorkletVoice} the voice to render
 * @param output {Float32Array[]} the output buffer
 * @param reverbOutput {Float32Array[]} output for reverb
 * @param chorusOutput {Float32Array[]} output for chorus
 * @this {SpessaSynthProcessor}
 */
export function renderVoice(channel, voice, output, reverbOutput, chorusOutput)
{
    // if no matching sample, perhaps it's still being loaded..?
    if(this.workletDumpedSamplesList[voice.sample.sampleID] === undefined)
    {
        return;
    }

    // check if release
    if(!voice.isInRelease) {
        // if not in release, check if the release time is
        if (currentTime >= voice.releaseStartTime) {
            voice.releaseStartModEnv = voice.currentModEnvValue;
            voice.isInRelease = true;
        }
    }


    // if the initial attenuation is more than 100dB, skip the voice (it's silent anyways)
    if(voice.modulatedGenerators[generatorTypes.initialAttenuation] > 2500)
    {
        if(voice.isInRelease)
        {
            voice.finished = true;
        }
        return;
    }

    // TUNING

    // calculate tuning
    let cents = voice.modulatedGenerators[generatorTypes.fineTune]
        + channel.customControllers[customControllers.channelTuning]
        + channel.customControllers[customControllers.channelTranspose]
        + channel.customControllers[customControllers.masterTuning];
    let semitones = voice.modulatedGenerators[generatorTypes.coarseTune];

    // calculate tuning by key
    cents += (voice.targetKey - voice.sample.rootKey) * voice.modulatedGenerators[generatorTypes.scaleTuning];

    // vibrato LFO
    const vibratoDepth = voice.modulatedGenerators[generatorTypes.vibLfoToPitch];
    if(vibratoDepth > 0)
    {
        const vibStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayVibLFO]);
        const vibFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqVibLFO]);
        const lfoVal = getLFOValue(vibStart, vibFreqHz, currentTime);
        if(lfoVal)
        {
            cents += lfoVal * (vibratoDepth * channel.customControllers[customControllers.modulationMultiplier]);
        }
    }

    // lowpass frequency
    let lowpassCents = voice.modulatedGenerators[generatorTypes.initialFilterFc];

    // mod LFO
    const modPitchDepth = voice.modulatedGenerators[generatorTypes.modLfoToPitch];
    const modVolDepth = voice.modulatedGenerators[generatorTypes.modLfoToVolume];
    const modFilterDepth = voice.modulatedGenerators[generatorTypes.modLfoToFilterFc];
    let modLfoCentibels = 0;
    if(modPitchDepth + modFilterDepth + modVolDepth > 0)
    {
        const modStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayModLFO]);
        const modFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqModLFO]);
        const modLfoValue = getLFOValue(modStart, modFreqHz, currentTime);
        cents += modLfoValue * (modPitchDepth * channel.customControllers[customControllers.modulationMultiplier]);
        modLfoCentibels = modLfoValue * modVolDepth;
        lowpassCents += modLfoValue * modFilterDepth;
    }

    // channel vibrato (GS NRPN)
    if(channel.channelVibrato.depth > 0)
    {
        const channelVibrato = getLFOValue(voice.startTime + channel.channelVibrato.delay, channel.channelVibrato.rate, currentTime);
        if(channelVibrato)
        {
            cents += channelVibrato * channel.channelVibrato.depth;
        }
    }

    // mod env
    const modEnvPitchDepth = voice.modulatedGenerators[generatorTypes.modEnvToPitch];
    const modEnvFilterDepth = voice.modulatedGenerators[generatorTypes.modEnvToFilterFc];
    const modEnv = getModEnvValue(voice, currentTime);
    lowpassCents += modEnv * modEnvFilterDepth;
    cents += modEnv * modEnvPitchDepth;

    // finally calculate the playback rate
    const centsTotal = ~~(cents + semitones * 100);
    if(centsTotal !== voice.currentTuningCents)
    {
        voice.currentTuningCents = centsTotal;
        voice.currentTuningCalculated = Math.pow(2, centsTotal / 1200);
    }

    // PANNING
    const pan = ( (Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan] )) + 500) / 1000) ; // 0 to 1

    // SYNTHESIS
    const bufferOut = new Float32Array(output[0].length);

    // wavetable oscillator
    getOscillatorData(voice, this.workletDumpedSamplesList[voice.sample.sampleID], bufferOut);


    // lowpass filter
    applyLowpassFilter(voice, bufferOut, lowpassCents);

    // volenv
    applyVolumeEnvelope(voice, bufferOut, currentTime, modLfoCentibels, this.sampleTime);

    // pan the voice and write out
    voice.currentPan += (pan - voice.currentPan) * 0.1; // smooth out pan to prevent clicking
    const panLeft = (1 - voice.currentPan) * this.panLeft;
    const panRight = voice.currentPan *  this.panRight;
    panVoice(
        panLeft,
        panRight,
        bufferOut,
        output,
        reverbOutput, voice.modulatedGenerators[generatorTypes.reverbEffectsSend],
        chorusOutput, voice.modulatedGenerators[generatorTypes.chorusEffectsSend]);
}


/**
 * @this {SpessaSynthProcessor}
 * @param amount {number}
 */
export function voiceKilling(amount)
{
    // kill the smallest velocity voices
    let voicesOrderedByVelocity = this.workletProcessorChannels.map(channel => channel.voices);

    /**
     * @type {WorkletVoice[]}
     */
    voicesOrderedByVelocity = voicesOrderedByVelocity.flat();
    voicesOrderedByVelocity.sort((v1, v2) => v1.velocity - v2.velocity);
    if(voicesOrderedByVelocity.length < amount)
    {
        amount = voicesOrderedByVelocity.length;
    }
    for (let i = 0; i < amount; i++) {
        const voice = voicesOrderedByVelocity[i];
        this.workletProcessorChannels[voice.channelNumber].voices
            .splice(this.workletProcessorChannels[voice.channelNumber].voices.indexOf(voice), 1);
        this.totalVoicesAmount--;
    }
    this.sendChannelProperties();
}

/**
 * Stops the voice
 * @param voice {WorkletVoice} the voice to stop
 * @this {SpessaSynthProcessor}
 */
export function releaseVoice(voice)
{
    voice.releaseStartTime = currentTime;
    // check if the note is shorter than the min note time, if so, extend it
    if(voice.releaseStartTime - voice.startTime < MIN_NOTE_LENGTH)
    {
        voice.releaseStartTime = voice.startTime + MIN_NOTE_LENGTH;
    }
}