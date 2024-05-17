import { NON_CC_INDEX_OFFSET, workletMessageType } from './worklet_channel.js';
import { midiControllers } from '../../midi_parser/midi_message.js';
import { generatorTypes } from '../../soundfont/chunk/generators.js';
import { getOscillatorData } from './worklet_utilities/wavetable_oscillator.js'
import { modulatorSources } from '../../soundfont/chunk/modulators.js';
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

const CHANNEL_CAP = 400;
const CONTROLLER_TABLE_SIZE = 147;
const MIN_NOTE_LENGTH = 0.05; // if the note is released faster than that, it will be forced to 10 ms at least.

// an array with preset default values so we can quickly use set() to reset the controllers
const resetArray = new Int16Array(CONTROLLER_TABLE_SIZE);
// default values
resetArray[midiControllers.mainVolume] = 100 << 7;
resetArray[midiControllers.expressionController] = 127 << 7;
resetArray[midiControllers.pan] = 64 << 7;
resetArray[midiControllers.releaseTime] = 64 << 7;
resetArray[midiControllers.brightness] = 64 << 7;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = 8192;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] = 2 << 7;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.channelPressure] = 127 << 7;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.channelTuning] = 0;

class ChannelProcessor extends AudioWorkletProcessor {
    /**
     * Creates a new channel mini synthesizer
     */
    constructor() {
        super();

        /**
         * Contains all controllers + other "not controllers" like pitch bend
         * @type {Int16Array}
         */
        this.midiControllers = new Int16Array(CONTROLLER_TABLE_SIZE);

        /**
         * @type {Object<number, Float32Array>}
         */
        this.samples = {};

        // in seconds, time between two samples (very, very short)
        this.sampleTime = 1 / sampleRate;

        this.resetControllers();

        this.tuningRatio = 1;

        /**
         * @type {{depth: number, delay: number, rate: number}}
         */
        this.channelVibrato = {rate: 0, depth: 0, delay: 0};

        /**
         * contains all the voices currently playing
         * @type {WorkletVoice[]}
         */
        this.voices = [];

        /**
         * contains sustained voices via cc 64: hold pedal
         * @type {WorkletVoice[]}
         */
        this.sustainedVoices = [];
        this.holdPedal = false;

        this.port.onmessage = e => this.handleMessage(e.data);
    }

    /**
     * @param message {WorkletMessage}
     */
    handleMessage(message)
    {
        const data = message.messageData;
        switch (message.messageType) {
            default:
                break;

            // note off
            case workletMessageType.noteOff:
                this.voices.forEach(v => {
                    if(v.midiNote !== data || v.isInRelease === true)
                    {
                        return;
                    }
                    if(this.holdPedal) {
                        this.sustainedVoices.push(v);
                    }
                    else
                    {
                        this.releaseVoice(v);
                    }
                });
                break;

            case workletMessageType.killNote:
                this.voices.forEach(v => {
                    if(v.midiNote !== data)
                    {
                        return;
                    }
                    v.modulatedGenerators[generatorTypes.releaseVolEnv] = -12000; // set release to be very short
                    this.releaseVoice(v);
                });
                break;

            case workletMessageType.noteOn:
                data.forEach(voice => {
                    const exclusive = voice.generators[generatorTypes.exclusiveClass];
                    if(exclusive !== 0)
                    {
                        this.voices.forEach(v => {
                            if(v.generators[generatorTypes.exclusiveClass] === exclusive)
                            {
                                this.releaseVoice(v);
                                v.generators[generatorTypes.releaseVolEnv] = -7200; // make the release nearly instant
                                computeModulators(v, this.midiControllers);
                            }
                        })
                    }
                    computeModulators(voice, this.midiControllers);
                    voice.currentAttenuationDb = 100;
                })
                this.voices.push(...data);
                if(this.voices.length > CHANNEL_CAP)
                {
                    this.voices.splice(0, this.voices.length - CHANNEL_CAP);
                }
                this.port.postMessage(this.voices.length);
                break;

            case workletMessageType.sampleDump:
                this.samples[data.sampleID] = data.sampleData;
                // the sample maybe was loaded after the voice was sent... adjust the end position!
                this.voices.forEach(v => {
                    if(v.sample.sampleID !== data.sampleID)
                    {
                        return;
                    }
                    v.sample.end = data.sampleData.length + v.generators[generatorTypes.endAddrOffset] + (v.generators[generatorTypes.endAddrsCoarseOffset] * 32768);
                })

                break;

            case workletMessageType.ccReset:
                this.resetControllers();
                break;

            case workletMessageType.ccChange:
                // special case: hold pedal
                if(data[0] === midiControllers.sustainPedal) {
                    if (data[1] >= 64)
                    {
                        this.holdPedal = true;
                    }
                    else
                    {
                        this.holdPedal = false;
                        this.sustainedVoices.forEach(v => {
                            this.releaseVoice(v)
                        });
                        this.sustainedVoices = [];
                    }
                }
                this.midiControllers[data[0]] = data[1];
                this.voices.forEach(v => computeModulators(v, this.midiControllers));
                break;

            case workletMessageType.setChannelVibrato:
                this.channelVibrato = data;
                break;

            case workletMessageType.clearCache:
                this.samples = [];
                break;

            case workletMessageType.stopAll:
                if(data === 1)
                {
                    // force stop all
                    this.voices = [];
                    this.port.postMessage(0);
                }
                else
                {
                    this.voices.forEach(v => {
                        if(v.isInRelease) return;
                        this.releaseVoice(v)
                    });
                }
                break;

            case workletMessageType.killNotes:
                this.voices.splice(0, data); // starting from 0 (earliest
                this.port.postMessage(this.voices.length);
                break;
        }
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
        voice.isInRelease = true;
        voice.releaseStartModEnv = voice.currentModEnvValue;
    }

    /**
     * Syntesizes the voice to buffers
     * @param inputs {Float32Array[][]} required by WebAudioAPI
     * @param outputs {Float32Array[][]} the outputs to write to, only the first 2 channels are populated
     * @returns {boolean} true
     */
    process(inputs, outputs) {
        if(this.voices.length < 1)
        {
            return true;
        }
        const channels = outputs[0];
        const reverbChannels = outputs[1];
        const chorusChannels = outputs[2];
        const tempV = this.voices;
        this.voices = [];
        tempV.forEach(v => {
            this.renderVoice(v, channels, reverbChannels, chorusChannels);
            if(!v.finished)
            {
                this.voices.push(v);
            }
        });

        if(tempV.length !== this.voices.length) {
            this.port.postMessage(this.voices.length);
        }

        return true;
    }

    /**
     * Renders a voice to the stereo output buffer
     * @param voice {WorkletVoice} the voice to render
     * @param output {Float32Array[]} the output buffer
     * @param reverbOutput {Float32Array[]} output for reverb
     * @param chorusOutput {Float32Array[]} output for chorus
     */
    renderVoice(voice, output, reverbOutput, chorusOutput)
    {
        // if no matching sample, perhaps it's still being loaded..? worklet_channel.js line 256
        if(this.samples[voice.sample.sampleID] === undefined)
        {
            return;
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
            + this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTuning]
            + this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTranspose];
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
                cents += lfoVal * vibratoDepth;
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
            cents += modLfoValue * modPitchDepth;
            modLfoCentibels = modLfoValue * modVolDepth;
            lowpassCents += modLfoValue * modFilterDepth;
        }

        // channel vibrato (GS NRPN)
        if(this.channelVibrato.depth > 0)
        {
            const channelVibrato = getLFOValue(voice.startTime + this.channelVibrato.delay, this.channelVibrato.rate, currentTime);
            if(channelVibrato)
            {
                cents += channelVibrato * this.channelVibrato.depth;
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
        getOscillatorData(voice, this.samples[voice.sample.sampleID], bufferOut);


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
     */
    resetControllers()
    {
        // transpose does not get affected
        const transpose = this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTranspose];
        this.midiControllers.set(resetArray);
        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTranspose] = transpose;
        this.channelVibrato = {rate: 0, depth: 0, delay: 0};
        this.holdPedal = false;
    }

}


registerProcessor("worklet-channel-processor", ChannelProcessor);
console.log("%cProcessor succesfully registered!", consoleColors.recognized);