import { WORKLET_PROCESSOR_NAME } from './worklet_system.js'
import { midiControllers } from '../../midi_parser/midi_message.js';
import { generatorTypes } from '../../soundfont/chunk/generators.js';
import { getOscillatorData } from './worklet_utilities/wavetable_oscillator.js'
import { computeModulators } from './worklet_utilities/worklet_modulator.js'
import {
    absCentsToHz,
    timecentsToSeconds,
} from './worklet_utilities/unit_converter.js'
import { getLFOValue } from './worklet_utilities/lfo.js';
import { consoleColors } from '../../utils/other.js'
import { panVoice } from './worklet_utilities/stereo_panner.js'
import { applyVolumeEnvelope } from './worklet_utilities/volume_envelope.js'
import { applyLowpassFilter } from './worklet_utilities/lowpass_filter.js'
import { getModEnvValue } from './worklet_utilities/modulation_envelope.js'
import { VOICE_CAP } from '../synthetizer.js'
import {
    CONTROLLER_TABLE_SIZE,
    CUSTOM_CONTROLLER_TABLE_SIZE,
    customControllers, customResetArray,
    resetArray,
} from './worklet_utilities/worklet_processor_channel.js'
import { workletMessageType } from './worklet_utilities/worklet_message.js'

/**
 * worklet_processor.js
 * purpose: manages the synthesizer from the AudioWorkletGlobalScope and renders the audio data
 */
const MIN_NOTE_LENGTH = 0.07; // if the note is released faster than that, it forced to last that long

/**
 * @type {Float32Array[]}
 */
let workletDumpedSamplesList = [];

class WorkletProcessor extends AudioWorkletProcessor {
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param options {{
     * processorOptions: {
     *      midiChannels: number
     * }}}
     */
    constructor(options) {
        super();

        this._outputsAmount = options.processorOptions.midiChannels;
        /**
         * contains all the channels with their voices on the processor size
         * @type {WorkletProcessorChannel[]}
         */
        this.workletProcessorChannels = [];
        for (let i = 0; i < this._outputsAmount; i++) {
            this.createWorkletChannel();
        }

        // in seconds, time between two samples (very, very short)
        this.sampleTime = 1 / sampleRate;

        this.totalVoicesAmount = 0;

        this.port.onmessage = e => this.handleMessage(e.data);
    }

    createWorkletChannel()
    {
        this.workletProcessorChannels.push({
            midiControllers: new Int16Array(CONTROLLER_TABLE_SIZE),
            customControllers: new Float32Array(CUSTOM_CONTROLLER_TABLE_SIZE),
            voices: [],
            sustainedVoices: [],
            holdPedal: false,
            channelVibrato: {delay: 0, depth: 0, rate: 0},
            isMuted: false
        })
        this.resetControllers(this.workletProcessorChannels.length - 1, []);
    }

    /**
     * @param message {WorkletMessage}
     */
    handleMessage(message)
    {
        const data = message.messageData;
        const channel = message.channelNumber;
        const channelVoices = this.workletProcessorChannels[channel].voices;
        switch (message.messageType) {
            case workletMessageType.noteOn:
                data.forEach(voice => {
                    const exclusive = voice.generators[generatorTypes.exclusiveClass];
                    if(exclusive !== 0)
                    {
                        channelVoices.forEach(v => {
                            if(v.generators[generatorTypes.exclusiveClass] === exclusive)
                            {
                                this.releaseVoice(v);
                                v.generators[generatorTypes.releaseVolEnv] = -7200; // make the release nearly instant
                                computeModulators(v, this.workletProcessorChannels[channel].midiControllers);
                            }
                        })
                    }
                    computeModulators(voice, this.workletProcessorChannels[channel].midiControllers);
                    voice.currentAttenuationDb = 100;
                })
                channelVoices.push(...data);

                this.totalVoicesAmount += data.length;
                // cap the voices
                if(this.totalVoicesAmount > VOICE_CAP)
                {
                    this.voiceKilling(this.totalVoicesAmount - VOICE_CAP);
                }
                else {
                    this.updateVoicesAmount();
                }
                break;

            case workletMessageType.noteOff:
                channelVoices.forEach(v => {
                    if(v.midiNote !== data || v.isInRelease === true)
                    {
                        return;
                    }
                    // if hold pedal, move to sustain
                    if(this.workletProcessorChannels[channel].holdPedal) {
                        this.workletProcessorChannels[channel].sustainedVoices.push(v);
                    }
                    else
                    {
                        this.releaseVoice(v);
                    }
                });
                break;

            case workletMessageType.ccChange:
                // special case: hold pedal
                if(data[0] === midiControllers.sustainPedal) {
                    if (data[1] >= 64)
                    {
                        this.workletProcessorChannels[channel].holdPedal = true;
                    }
                    else
                    {
                        this.workletProcessorChannels[channel].holdPedal = false;
                        this.workletProcessorChannels[channel].sustainedVoices.forEach(v => {
                            this.releaseVoice(v)
                        });
                        this.workletProcessorChannels[channel].sustainedVoices = [];
                    }
                }
                this.workletProcessorChannels[channel].midiControllers[data[0]] = data[1];
                channelVoices.forEach(v => computeModulators(v, this.workletProcessorChannels[channel].midiControllers));
                break;

            case workletMessageType.customcCcChange:
                // custom controller change
                this.workletProcessorChannels[channel].customControllers[data[0]] = data[1];
                break;

            case workletMessageType.killNote:
                channelVoices.forEach(v => {
                    if(v.midiNote !== data)
                    {
                        return;
                    }
                    v.modulatedGenerators[generatorTypes.releaseVolEnv] = -12000; // set release to be very short
                    this.releaseVoice(v);
                });
                break;

            case workletMessageType.sampleDump:
                workletDumpedSamplesList[data.sampleID] = data.sampleData;
                // the sample maybe was loaded after the voice was sent... adjust the end position!

                // not for all channels because the system tells us for what channel this voice was dumped! yay!
                channelVoices.forEach(v => {
                    if(v.sample.sampleID !== data.sampleID)
                    {
                        return;
                    }
                    v.sample.end = data.sampleData.length - 1 + v.generators[generatorTypes.endAddrOffset] + (v.generators[generatorTypes.endAddrsCoarseOffset] * 32768);
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

                break;

            case workletMessageType.ccReset:
                this.resetControllers(channel, data);
                break;


            case workletMessageType.setChannelVibrato:
                this.workletProcessorChannels[channel].channelVibrato.delay = data.delay;
                this.workletProcessorChannels[channel].channelVibrato.depth = data.depth;
                this.workletProcessorChannels[channel].channelVibrato.rate = data.rate;
                break;

            case workletMessageType.clearCache:
                if(workletDumpedSamplesList.length > 0) {
                    workletDumpedSamplesList = [];
                }
                break;

            case workletMessageType.stopAll:
                if(data === 1)
                {
                    // force stop all
                    channelVoices.length = 0;
                    this.workletProcessorChannels[channel].sustainedVoices.length = 0;
                    this.updateVoicesAmount();
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
                break;

            case workletMessageType.killNotes:
                this.voiceKilling(data);
                break;

            case workletMessageType.muteChannel:
                this.workletProcessorChannels[channel].isMuted = data;
                break;

            case workletMessageType.addNewChannel:
                this.createWorkletChannel();
                break;

            default:
                break;
        }
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
        this.updateVoicesAmount();
    }

    updateVoicesAmount()
    {
        this.port.postMessage(this.workletProcessorChannels.map(c => c.voices.length));
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
            this.updateVoicesAmount();
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
        // if no matching sample, perhaps it's still being loaded..? worklet_system.js line 256
        if(workletDumpedSamplesList[voice.sample.sampleID] === undefined)
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
        getOscillatorData(voice, workletDumpedSamplesList[voice.sample.sampleID], bufferOut);


        // lowpass filter
        applyLowpassFilter(voice, bufferOut, lowpassCents);

        // volenv
        applyVolumeEnvelope(voice, bufferOut, currentTime, modLfoCentibels, this.sampleTime);

        // pan the voice and write out
        panVoice(pan, bufferOut, output,
            reverbOutput, voice.modulatedGenerators[generatorTypes.reverbEffectsSend],
            chorusOutput, voice.modulatedGenerators[generatorTypes.chorusEffectsSend]);
    }

    /**
     * Resets all controllers
     * @param channel {number}
     * @param excluded {number[]}
     */
    resetControllers(channel, excluded)
    {
        // save excluded controllers as reset doesn't affect them
        let excludedCCvalues = excluded.map(ccNum => {
            return {
                ccNum: ccNum,
                ccVal: this.workletProcessorChannels[channel].midiControllers[ccNum]
            }
        });

        // reset the array
        this.workletProcessorChannels[channel].midiControllers.set(resetArray);
        this.workletProcessorChannels[channel].channelVibrato = {rate: 0, depth: 0, delay: 0};
        this.workletProcessorChannels[channel].holdPedal = false;

        excludedCCvalues.forEach((cc) => {
            this.workletProcessorChannels[channel].midiControllers[cc.ccNum] = cc.ccVal;
        });

        // reset custom controllers
        // special case: transpose does not get affected
        const transpose = this.workletProcessorChannels[channel].customControllers[customControllers.channelTranspose];
        this.workletProcessorChannels[channel].customControllers.set(customResetArray);
        this.workletProcessorChannels[channel].customControllers[customControllers.channelTranspose] = transpose;

    }

}


registerProcessor(WORKLET_PROCESSOR_NAME, WorkletProcessor);
console.log("%cProcessor succesfully registered!", consoleColors.recognized);