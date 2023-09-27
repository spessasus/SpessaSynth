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

export const MIN_AUDIBLE_GAIN = 0.0001;

// an array with preset default values so we can quickly use set() to reset the controllers
const resetArray = new Int16Array(146);
resetArray[midiControllers.mainVolume] = 100 << 7;
resetArray[midiControllers.expressionController] = 127 << 7;
resetArray[midiControllers.pan] = 64 << 7;

resetArray[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = 8192;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] = 2 << 7;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.channelPressure] = 127 << 7;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.channelTuning] = 0;

class ChannelProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        /**
         * Contains all controllers + other "not controllers" like pitch bend
         * @type {Int16Array}
         */
        this.midiControllers = new Int16Array(146);

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
         * @param e {{data: WorkletMessage}}
         */
        this.port.onmessage = e => {
            const data = e.data.messageData;
            switch (e.data.messageType) {
                default:
                    break;

                // note off
                case workletMessageType.noteOff:
                    this.voices.forEach(v => {
                        if(v.midiNote !== data)
                        {
                            return;
                        }
                        v.releaseStartTime = currentTime;
                        v.isInRelease = true;
                        v.releaseStartDb = v.currentAttenuationDb;
                    });
                    break;

                case workletMessageType.killNote:
                    this.voices = this.voices.filter(v => v.midiNote !== data);
                    break;

                case workletMessageType.noteOn:
                    data.forEach(voice => {
                        const exclusive = voice.generators[generatorTypes.exclusiveClass];
                        if(exclusive !== 0)
                        {
                            this.voices = this.voices.filter(v => v.generators[generatorTypes.exclusiveClass] !== exclusive);
                        }
                        computeModulators(voice, this.midiControllers);
                    })
                    this.voices.push(...data);
                    break;

                case workletMessageType.sampleDump:
                    this.samples[data.sampleID] = data.sampleData;
                    break;

                case workletMessageType.ccReset:
                    this.resetControllers();
                    break;

                case workletMessageType.ccChange:
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
                    this.voices = [];
                    break;
            }
        }
    }

    /**
     * @param inputs {Float32Array[][]}
     * @param outputs {Float32Array[][]}
     * @returns {boolean}
     */
    process(inputs, outputs) {
        if(this.voices.length < 1)
        {
            return true;
        }
        const channels = outputs[0];
        const tempV = this.voices;
        this.voices = [];
        tempV.forEach(v => {
            this.renderVoice(v, channels[0], channels[1]);
            if(!v.finished)
            {
                this.voices.push(v);
            }
        });

        return true;
    }

    /**
     * @param voice {WorkletVoice}
     * @param outputLeft {Float32Array}
     * @param outputRight {Float32Array}
     */
    renderVoice(voice, outputLeft, outputRight)
    {
        if(!this.samples[voice.sample.sampleID])
        {
            voice.finished = true;
            return;
        }

        // TUNING

        // calculate tuning
        let cents = voice.modulatedGenerators[generatorTypes.fineTune]
            + this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTuning];
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

        // mod LFO
        const modPitchDepth = voice.modulatedGenerators[generatorTypes.modLfoToPitch];
        const modVolDepth = voice.modulatedGenerators[generatorTypes.modLfoToVolume];
        let modLfoCentibels = 0;
        if(modPitchDepth > 0 || modVolDepth > 0)
        {
            const modStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayModLFO]);
            const modFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqModLFO]);
            const modLfo = getLFOValue(modStart, modFreqHz, currentTime);
            if(modLfo) {
                cents += (modLfo * modPitchDepth);
                modLfoCentibels = (modLfo * modVolDepth) / 10
            }
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

        // finally calculate the playback rate
        const playbackRate = Math.pow(2,(cents / 100 + semitones) / 12);

        // PANNING
        const pan = ( (Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan] )) + 500) / 1000) ; // 0 to 1


        // LOWPASS
        // const filterQ = voice.modulatedGenerators[generatorTypes.initialFilterQ] - 3.01; // polyphone????
        // const filterQgain = Math.pow(10, filterQ / 20);
        // const filterFcHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.initialFilterFc]);
        // // calculate coefficients
        // const theta = 2 * Math.PI * filterFcHz / sampleRate;
        // let a0, a1, a2, b1, b2;
        // if (filterQgain <= 0)
        // {
        //     a0 = 1;
        //     a1 = 0;
        //     a2 = 0;
        //     b1 = 0;
        //     b2 = 0;
        // }
        // else
        // {
        //     const dTmp = Math.sin(theta) / (2 * filterQgain);
        //     if (dTmp <= -1.0)
        //     {
        //         a0 = 1;
        //         a1 = 0;
        //         a2 = 0;
        //         b1 = 0;
        //         b2 = 0;
        //     }
        //     else
        //     {
        //         const beta = 0.5 * (1 - dTmp) / (1 + dTmp);
        //         const gamma = (0.5 + beta) * Math.cos(theta);
        //         a0 = (0.5 + beta - gamma) / 2;
        //         a1 = 2 * a0;
        //         a2 = a0;
        //         b1 = -2 * gamma;
        //         b2 = 2 * beta;
        //     }
        // }

        // SYNTHESIS
        const bufferOut = new Float32Array(outputLeft.length);

        // wavetable oscillator
        getOscillatorData(voice, this.samples[voice.sample.sampleID], playbackRate, bufferOut);

        // volenv
        applyVolumeEnvelope(voice, bufferOut, currentTime, modLfoCentibels, this.sampleTime);

        // pan the voice and write out
        panVoice(pan, bufferOut, outputLeft, outputRight);

        // apply the volEnv
        // for (let outputSampleIndex = 0; outputSampleIndex < outputLeft.length; outputSampleIndex++) {
        //
        //     // Read the sample
        //     let sample = getOscillatorValue(
        //         voice,
        //         this.samples[voice.sample.sampleID],
        //         playbackRate
        //     );
        //
        //     // apply the volenv
        //     if(voice.isInRelease)
        //     {
        //         voice.volEnvGain = attenuation * getVolEnvReleaseMultiplier(release, actualTime - voice.releaseStartTime);
        //     }
        //     else {
        //         voice.currentGain = getVolumeEnvelopeValue(
        //             delay,
        //             attack,
        //             attenuation,
        //             hold,
        //             sustain,
        //             decay,
        //             voice.startTime,
        //             actualTime);
        //
        //         voice.volEnvGain = voice.currentGain;
        //     }
        //     if(voice.volEnvGain < 0)
        //     {
        //         voice.finished = true;
        //         return;
        //     }
        //
        //     sample *= voice.volEnvGain;
        //
        //
        //
        //     actualTime += this.sampleTime;
        // }
    }

    resetControllers()
    {
        this.midiControllers.set(resetArray);
    }

}


registerProcessor("worklet-channel-processor", ChannelProcessor);
console.log("%cProcessor succesfully registered!", consoleColors.recognized);