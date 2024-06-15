import { midiControllers } from '../../../midi_parser/midi_message.js'
import { generatorTypes } from '../../../soundfont/chunk/generators.js'
import { getOscillatorData } from './wavetable_oscillator.js'
import { absCentsToHz, HALF_PI, timecentsToSeconds } from './unit_converter.js'
import { getLFOValue } from './lfo.js'
import { consoleColors } from '../../../utils/other.js'
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
import { clearSamplesList } from './worklet_voice.js'
import { handleMessage } from '../worklet_methods/handle_message.js'
import { systemExclusive } from '../worklet_methods/system_exclusive.js'
import { noteOn } from '../worklet_methods/note_on.js'
import { dataEntryCoarse, dataEntryFine } from '../worklet_methods/data_entry.js'
import { noteOff } from '../worklet_methods/note_off.js'
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
     * }}}
     */
    constructor(options) {
        super();

        this._outputsAmount = options.processorOptions.midiChannels;

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
     * Stops a note nearly instantly
     * @param channel {number}
     * @param midiNote {number}
     */
    killNote(channel, midiNote)
    {
        this.workletProcessorChannels[channel].voices.forEach(v => {
            if(v.midiNote !== midiNote)
            {
                return;
            }
            v.modulatedGenerators[generatorTypes.releaseVolEnv] = -12000; // set release to be very short
            this.releaseVoice(v);
        });
    }

    /**
     * saves a sample
     * @param channel {number}
     * @param sampleID {number}
     * @param sampleData {Float32Array}
     */
    sampleDump(channel, sampleID, sampleData)
    {
        this.workletDumpedSamplesList[sampleID] = sampleData;
        // the sample maybe was loaded after the voice was sent... adjust the end position!

        // not for all channels because the system tells us for what channel this voice was dumped! yay!
        this.workletProcessorChannels[channel].voices.forEach(v => {
            if(v.sample.sampleID !== sampleID)
            {
                return;
            }
            v.sample.end = sampleData.length - 1 + v.generators[generatorTypes.endAddrOffset] + (v.generators[generatorTypes.endAddrsCoarseOffset] * 32768);
            // calculate for how long the sample has been playing and move the cursor there
            v.sample.cursor = (v.sample.playbackStep * sampleRate) * (currentTime - v.startTime);
            if(v.sample.loopingMode === 0) // no loop
            {
                if (v.sample.cursor >= v.sample.end)
                {
                    v.finished = true;
                    return;
                }
            }
            else
            {
                // go through modulo (adjust cursor if the sample has looped
                if(v.sample.cursor > v.sample.loopEnd)
                {
                    v.sample.cursor = v.sample.cursor % (v.sample.loopEnd - v.sample.loopStart) + v.sample.loopStart - 1;
                }
            }
            // set start time to current!
            v.startTime = currentTime;
        })

    }

    /**
     * stops all notes
     * @param channel {number}
     * @param force {boolean}
     */
    stopAll(channel, force = false)
    {
        const channelVoices = this.workletProcessorChannels[channel].voices;
        if(force)
        {
            // force stop all
            channelVoices.length = 0;
            this.workletProcessorChannels[channel].sustainedVoices.length = 0;
            this.sendChannelProperties();
        }
        else
        {
            channelVoices.forEach(v => {
                if(v.isInRelease) return;
                this.releaseVoice(v);
            });
            this.workletProcessorChannels[channel].sustainedVoices.forEach(v => {
                this.releaseVoice(v);
            })
        }
    }

    /**
     * executes a program change
     * @param channel {number}
     * @param programNumber {number}
     * @param userChange {boolean}
     */
    programChange(channel, programNumber, userChange=false)
    {
        /**
         * @type {WorkletProcessorChannel}
         */
        const channelObject = this.workletProcessorChannels[channel];
        if(channelObject.lockPreset)
        {
            return;
        }
        // always 128 for percussion
        const bank = (channelObject.drumChannel ? 128 : channelObject.midiControllers[midiControllers.bankSelect]);
        const preset = this.soundfont.getPreset(bank, programNumber);
        this.setPreset(channel, preset);
        this.callEvent("programchange",{
            channel: channel,
            program: preset.program,
            bank: preset.bank,
            userCalled: userChange
        });
    }

    /**
     * @param channel {number}
     * @param preset {Preset}
     */
    setPreset(channel, preset)
    {
        if(this.workletProcessorChannels[channel].lockPreset)
        {
            return;
        }
        this.workletProcessorChannels[channel].preset = preset;

        // reset cached voices
        this.workletProcessorChannels[channel].cachedVoices = [];
        for (let i = 0; i < 128; i++) {
            this.workletProcessorChannels[channel].cachedVoices.push([]);
        }
    }

    /**
     * Toggles drums on a given channel
     * @param channel {number}
     * @param isDrum {boolean}
     */
    setDrums(channel, isDrum)
    {
        const channelObject = this.workletProcessorChannels[channel];
        if(isDrum)
        {
            channelObject.drumChannel = true;
            this.setPreset(channel, this.soundfont.getPreset(128, channelObject.preset.program));
        }
        else
        {
            channelObject.percussionChannel = false;
            this.setPreset(channel, this.soundfont.getPreset(0, channelObject.preset.program));
        }
        this.callEvent("drumchange",{
            channel: channel,
            isDrumChannel: channelObject.drumChannel
        });
    }

    sendPresetList()
    {
        this.callEvent("presetlistchange", this.soundfont.presets.map(p => {
            return {presetName: p.presetName, bank: p.bank, program: p.program};
        }));
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

    stopAllChanels(force = false)
    {
        console.info("%cStop all received!", consoleColors.info);
        for (let i = 0; i < this.workletProcessorChannels.length; i++) {
            this.stopAll(i, force);
        }
        this.callEvent("stopall", undefined);
    }

    /**
     * @param buffer {ArrayBuffer}
     */
    reloadSoundFont(buffer)
    {
        this.stopAllChanels(true);
        delete this.soundfont;
        clearSamplesList();
        delete this.workletDumpedSamplesList;
        this.workletDumpedSamplesList = [];


        this.soundfont = new SoundFont2(buffer);
        this.defaultPreset = this.soundfont.getPreset(0, 0);
        this.drumPreset = this.soundfont.getPreset(128, 0);

        for(let i = 0; i < this.workletProcessorChannels.length; i++)
        {
            const channelObject = this.workletProcessorChannels[i];
            channelObject.cachedVoices = [];
            for (let j = 0; j < 128; j++) {
                channelObject.cachedVoices.push([]);
            }
            channelObject.lockPreset = false;
            this.programChange(i, channelObject.preset.program);
        }
        this.sendPresetList();
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

    /**
     * @param channel {number}
     */
    disableAndLockVibrato(channel)
    {
        this.workletProcessorChannels[channel].lockVibrato = true;
        this.workletProcessorChannels[channel].channelVibrato.rate = 0;
        this.workletProcessorChannels[channel].channelVibrato.delay = 0;
        this.workletProcessorChannels[channel].channelVibrato.depth = 0;
    }

    /**
     * @param channel {number}
     * @param depth {number}
     * @param rate {number}
     * @param delay {number}
     */
    setVibrato(channel, depth, rate, delay)
    {
        if(this.workletProcessorChannels[channel].lockVibrato)
        {
            return;
        }
        this.workletProcessorChannels[channel].vibrato.rate = rate;
        this.workletProcessorChannels[channel].vibrato.delay = delay;
        this.workletProcessorChannels[channel].vibrato.depth = depth;
    }

}

SpessaSynthProcessor.prototype.handleMessage = handleMessage;
SpessaSynthProcessor.prototype.systemExclusive = systemExclusive;
SpessaSynthProcessor.prototype.noteOn = noteOn;
SpessaSynthProcessor.prototype.dataEntryCoarse = dataEntryCoarse;
SpessaSynthProcessor.prototype.dataEntryFine = dataEntryFine;
SpessaSynthProcessor.prototype.createWorkletChannel = createWorkletChannel;
SpessaSynthProcessor.prototype.noteOff = noteOff;
SpessaSynthProcessor.prototype.controllerChange = controllerChange;
SpessaSynthProcessor.prototype.resetAllControllers = resetAllControllers;
SpessaSynthProcessor.prototype.resetControllers = resetControllers;
SpessaSynthProcessor.prototype.resetParameters = resetParameters;
SpessaSynthProcessor.prototype.post = post;
SpessaSynthProcessor.prototype.sendChannelProperties = sendChannelProperties;
SpessaSynthProcessor.prototype.callEvent = callEvent;
SpessaSynthProcessor.prototype.transposeAllChannels = transposeAllChannels;
SpessaSynthProcessor.prototype.transposeChannel = transposeChannel;
SpessaSynthProcessor.prototype.setChannelTuning = setChannelTuning;
SpessaSynthProcessor.prototype.setMasterTuning = setMasterTuning;
SpessaSynthProcessor.prototype.setModulationDepth = setModulationDepth;
SpessaSynthProcessor.prototype.pitchWheel = pitchWheel;


export { SpessaSynthProcessor }