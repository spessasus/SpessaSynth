import { generatorTypes } from '../../../soundfont/chunk/generators.js'
import { getOscillatorData } from './wavetable_oscillator.js'
import { absCentsToHz, HALF_PI, timecentsToSeconds } from './unit_converter.js'
import { getLFOValue } from './lfo.js'
import { panVoice } from './stereo_panner.js'
import { applyVolumeEnvelope } from './volume_envelope.js'
import { applyLowpassFilter } from './lowpass_filter.js'
import { getModEnvValue } from './modulation_envelope.js'
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE } from '../../synthetizer.js'
import {
    createWorkletChannel,
    customControllers,
} from './worklet_processor_channel.js'

import { SoundFont2 } from '../../../soundfont/soundfont_parser.js'
import { handleMessage } from '../worklet_methods/handle_message.js'
import { systemExclusive } from '../worklet_methods/system_exclusive.js'
import { noteOn } from '../worklet_methods/note_on.js'
import { dataEntryCoarse, dataEntryFine } from '../worklet_methods/data_entry.js'
import { killNote, noteOff, stopAll, stopAllChannels } from '../worklet_methods/note_off.js'
import {
    controllerChange,
    resetAllControllers,
    resetControllers,
    resetParameters,
} from '../worklet_methods/controller_control.js'
import { callEvent, post, sendChannelProperties } from '../worklet_methods/message_sending.js'
import {
    pitchWheel,
    setChannelTuning,
    setMasterTuning, setModulationDepth,
    transposeAllChannels,
    transposeChannel,
} from '../worklet_methods/tuning_control.js'
import {
    programChange,
    reloadSoundFont,
    sampleDump,
    sendPresetList,
    setDrums,
    setPreset,
} from '../worklet_methods/program_control.js'
import { disableAndLockVibrato, setVibrato } from '../worklet_methods/vibrato_control.js'
import { WorkletSequencer } from '../../../sequencer/worklet_sequencer/worklet_sequencer.js'


/**
 * worklet_processor.js
 * purpose: manages the synthesizer from the AudioWorkletGlobalScope and renders the audio data
 */
const MIN_NOTE_LENGTH = 0.07; // if the note is released faster than that, it forced to last that long

const SYNTHESIZER_GAIN = 1.0;

class SpessaSynthProcessor extends AudioWorkletProcessor {
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param options {{
     * processorOptions: {
     *      midiChannels: number,
     *      soundfont: ArrayBuffer,
     *      enableEventSystem: boolean
     * }}}
     */
    constructor(options) {
        super();

        this._outputsAmount = options.processorOptions.midiChannels;

        this.enableEventSystem = options.processorOptions.enableEventSystem;

        this.sequencer = new WorkletSequencer(this);

        /**
         * @type {function}
         */
        this.processTickCallback = undefined;

        this.transposition = 0;

        /**
         * The volume gain
         * @type {number}
         */
        this.mainVolume = SYNTHESIZER_GAIN;

        /**
         * -1 to 1
         * @type {number}
         */
        this.pan = 0.0;
        /**
         * the pan of the left channel
         * @type {number}
         */
        this.panLeft = 0.5 * this.mainVolume;

        this.highPerformanceMode = false;

        /**
         * the pan of the right channel
         * @type {number}
         */
        this.panRight = 0.5 * this.mainVolume;
        /**
         * @type {SoundFont2}
         */
        this.soundfont = new SoundFont2(options.processorOptions.soundfont);
        this.sendPresetList();

        this.defaultPreset = this.soundfont.getPreset(0, 0);
        this.drumPreset = this.soundfont.getPreset(128, 0);

        /**
         * @type {Float32Array[]}
         */
        this.workletDumpedSamplesList = [];
        /**
         * contains all the channels with their voices on the processor size
         * @type {WorkletProcessorChannel[]}
         */
        this.workletProcessorChannels = [];
        for (let i = 0; i < this._outputsAmount; i++) {
            this.createWorkletChannel(false);
        }

        this.workletProcessorChannels[DEFAULT_PERCUSSION].preset = this.drumPreset;
        this.workletProcessorChannels[DEFAULT_PERCUSSION].drumChannel = true;

        // in seconds, time between two samples (very, very short)
        this.sampleTime = 1 / sampleRate;

        /**
         * Controls the system
         * @type {"gm"|"gm2"|"gs"|"xg"}
         */
        this.system = DEFAULT_SYNTH_MODE;

        this.totalVoicesAmount = 0;

        this.port.onmessage = e => this.handleMessage(e.data);
    }

    debugMessage()
    {
        console.debug({
            channels: this.workletProcessorChannels,
            voicesAmount: this.totalVoicesAmount,
            outputAmount: this._outputsAmount,
            dumpedSamples: this.workletDumpedSamplesList
        });
    }

    /**
     * @param volume {number} 0-1
     */
    setMainVolume(volume)
    {
        this.mainVolume = volume * SYNTHESIZER_GAIN;
        this.setMasterPan(this.pan);
    }

    /**
     * @param pan {number} -1 to 1
     */
    setMasterPan(pan)
    {
        this.pan = pan;
        // clamp to 0-1 (0 is left)
        pan = (pan / 2) + 0.5;
        this.panLeft = (1 - pan) * this.mainVolume;
        this.panRight = (pan) * this.mainVolume;
    }

    voiceKilling(amount)
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
     */
    releaseVoice(voice)
    {
        voice.releaseStartTime = currentTime;
        // check if the note is shorter than the min note time, if so, extend it
        if(voice.releaseStartTime - voice.startTime < MIN_NOTE_LENGTH)
        {
            voice.releaseStartTime = voice.startTime + MIN_NOTE_LENGTH;
        }
    }

    /**
     * Syntesizes the voice to buffers
     * @param inputs {Float32Array[][]} required by WebAudioAPI
     * @param outputs {Float32Array[][]} the outputs to write to, only the first 2 channels are populated
     * @returns {boolean} true
     */
    process(inputs, outputs) {
        // for every channel
        let totalCurrentVoices = 0;
        this.workletProcessorChannels.forEach((channel, index) => {
            if(channel.voices.length < 1 || channel.isMuted)
            {
                // skip the channels
                return;
            }
            const outputIndex = (index % this._outputsAmount) + 2;
            const outputChannels = outputs[outputIndex];
            const reverbChannels = outputs[0];
            const chorusChannels = outputs[1];
            const tempV = channel.voices;

            // reset voices
            channel.voices = [];

            // for every voice
            tempV.forEach(v => {
                // render voice
                this.renderVoice(channel, v, outputChannels, reverbChannels, chorusChannels);

                // if not finished, add it back
                if(!v.finished)
                {
                    channel.voices.push(v);
                }
            });

            totalCurrentVoices += tempV.length;
        });

        // if voice count changed, update voice amount
        if(totalCurrentVoices !== this.totalVoicesAmount)
        {
            this.totalVoicesAmount = totalCurrentVoices;
            this.sendChannelProperties();
        }

        if(this.processTickCallback)
        {
            this.processTickCallback();
        }
        return true;
    }

    /**
     * Renders a voice to the stereo output buffer
     * @param channel {WorkletProcessorChannel} the voice's channel
     * @param voice {WorkletVoice} the voice to render
     * @param output {Float32Array[]} the output buffer
     * @param reverbOutput {Float32Array[]} output for reverb
     * @param chorusOutput {Float32Array[]} output for chorus
     */
    renderVoice(channel, voice, output, reverbOutput, chorusOutput)
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
        const panLeft = Math.cos(HALF_PI * pan) * this.panLeft;
        const panRight = Math.sin(HALF_PI * pan) *  this.panRight;
        panVoice(
            panLeft,
            panRight,
            bufferOut,
            output,
            reverbOutput, voice.modulatedGenerators[generatorTypes.reverbEffectsSend],
            chorusOutput, voice.modulatedGenerators[generatorTypes.chorusEffectsSend]);
    }
}

// include other methods
SpessaSynthProcessor.prototype.handleMessage = handleMessage;
SpessaSynthProcessor.prototype.post = post;
SpessaSynthProcessor.prototype.sendChannelProperties = sendChannelProperties;
SpessaSynthProcessor.prototype.callEvent = callEvent;

SpessaSynthProcessor.prototype.systemExclusive = systemExclusive;

SpessaSynthProcessor.prototype.noteOn = noteOn;
SpessaSynthProcessor.prototype.noteOff = noteOff;
SpessaSynthProcessor.prototype.killNote = killNote;
SpessaSynthProcessor.prototype.stopAll = stopAll;
SpessaSynthProcessor.prototype.stopAllChannels = stopAllChannels;

SpessaSynthProcessor.prototype.setVibrato = setVibrato;
SpessaSynthProcessor.prototype.disableAndLockVibrato = disableAndLockVibrato;

SpessaSynthProcessor.prototype.dataEntryCoarse = dataEntryCoarse;
SpessaSynthProcessor.prototype.dataEntryFine = dataEntryFine;

SpessaSynthProcessor.prototype.createWorkletChannel = createWorkletChannel;
SpessaSynthProcessor.prototype.controllerChange = controllerChange;
SpessaSynthProcessor.prototype.resetAllControllers = resetAllControllers;
SpessaSynthProcessor.prototype.resetControllers = resetControllers;
SpessaSynthProcessor.prototype.resetParameters = resetParameters;


SpessaSynthProcessor.prototype.transposeAllChannels = transposeAllChannels;
SpessaSynthProcessor.prototype.transposeChannel = transposeChannel;
SpessaSynthProcessor.prototype.setChannelTuning = setChannelTuning;
SpessaSynthProcessor.prototype.setMasterTuning = setMasterTuning;
SpessaSynthProcessor.prototype.setModulationDepth = setModulationDepth;
SpessaSynthProcessor.prototype.pitchWheel = pitchWheel;

SpessaSynthProcessor.prototype.programChange = programChange;
SpessaSynthProcessor.prototype.setPreset = setPreset;
SpessaSynthProcessor.prototype.setDrums = setDrums;
SpessaSynthProcessor.prototype.reloadSoundFont = reloadSoundFont;
SpessaSynthProcessor.prototype.sampleDump = sampleDump;
SpessaSynthProcessor.prototype.sendPresetList = sendPresetList;


export { SpessaSynthProcessor }