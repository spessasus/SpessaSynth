import { NON_CC_INDEX_OFFSET, workletMessageType } from './worklet_channel.js';
import { midiControllers } from '../../midi_parser/midi_message.js';
import { generatorTypes } from '../../soundfont/chunk/generators.js';
import { getOscillatorValue } from './worklet_utilities/wavetable_oscillator.js';
import { modulatorSources } from '../../soundfont/chunk/modulators.js';
import { computeModulators, getModulated } from './worklet_utilities/worklet_modulator.js'
import {
    getVolEnvReleaseMultiplier,
    getVolEnvSeconds,
    getVolumeEnvelopeValue,
    volumeEnvelopePhases,
} from './worklet_utilities/volume_envelope.js'
import {
    absCentsToHz,
    decibelAttenuationToGain,
    HALF_PI,
    timecentsToSeconds,
} from './worklet_utilities/unit_converter.js'
import { getLFOValue } from './worklet_utilities/lfo.js';

export const MIN_AUDIBLE_GAIN = 0.0001;

class ChannelProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        /**
         * @type {Object<number, Float32Array>}
         */
        this.samples = {};

        this.sampleTime = 1 / sampleRate;

        this.resetControllers();

        this.tuningRatio = 1;

        /**
         * @type {{depth: number, delay: number, rate: number}}
         */
        this.channelVibrato = {rate: 0, depth: 0, delay: 0};

        /**
         * grouped by midi note
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
                        if(v.midiNote === data)
                        {
                            v.isInRelease = true;
                            v.releaseStartTime = currentTime;
                        }
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
                    break;

                case workletMessageType.setChannelVibrato:
                    this.channelVibrato = data;
            }
        }
    }

    /**
     * @param inputs {Float32Array[][]}
     * @param outputs {Float32Array[][]}
     * @returns {boolean}
     */
    process(inputs, outputs) {
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
        // MODULATORS
        computeModulators(voice, this.midiControllers);

        // TUNING
        // get the root key
        let key;
        const overrideKey = getModulated(voice, generatorTypes.overridingRootKey);
        if(overrideKey !== -1)
        {
            key = overrideKey
        }
        else
        {
            key = voice.sample.rootKey;
        }
        // calculate tuning
        let semitones = getModulated(voice, generatorTypes.coarseTune) + parseFloat(this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTuning] >> 7);
        let cents = getModulated(voice, generatorTypes.fineTune);

        // calculate tuning by key
        cents += (voice.midiNote - key) * getModulated(voice, generatorTypes.scaleTuning);

        // vibrato LFO
        const vibratoDepth = getModulated(voice, generatorTypes.vibLfoToPitch);
        if(vibratoDepth > 0)
        {
            const vibStart = voice.startTime + timecentsToSeconds(getModulated(voice, generatorTypes.delayVibLFO));
            const vibFreqHz = absCentsToHz(getModulated(voice, generatorTypes.freqVibLFO));
            const lfoVal = getLFOValue(vibStart, vibFreqHz, currentTime);
            if(lfoVal)
            {
                cents += lfoVal * vibratoDepth;
            }
        }

        // mod LFO
        const modPitchDepth = getModulated(voice, generatorTypes.modLfoToPitch);
        const modVolDepth = getModulated(voice, generatorTypes.modLfoToVolume);
        let modLfoCentibels = 0;
        if(modPitchDepth + modVolDepth > 0)
        {
            const modStart = voice.startTime + timecentsToSeconds(getModulated(voice, generatorTypes.delayModLFO));
            const modFreqHz = absCentsToHz(getModulated(voice, generatorTypes.freqModLFO));
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
        const playbackRate = Math.pow(2, (semitones + cents / 100) / 12);

        // VOLUME ENVELOPE
        const attenuation =  decibelAttenuationToGain((getModulated(voice, generatorTypes.initialAttenuation) / 25) + modLfoCentibels);
        const sustain = attenuation * decibelAttenuationToGain(getModulated(voice, generatorTypes.sustainVolEnv) / 10);
        const delay = getVolEnvSeconds(voice, volumeEnvelopePhases.delay);
        const attack = getVolEnvSeconds(voice, volumeEnvelopePhases.attack)
        const hold = getVolEnvSeconds(voice, volumeEnvelopePhases.hold);
        const decay = getVolEnvSeconds(voice, volumeEnvelopePhases.decay);
        const release = getVolEnvSeconds(voice, volumeEnvelopePhases.release);

        if(delay + attack === 0)
        {
            voice.currentGain = attenuation;
        }

        // WAVETABLE OSCILLATOR
        // get offsets
        const loopStart = voice.sample.loopStart + getModulated(voice, generatorTypes.startloopAddrsOffset) + (getModulated(voice, generatorTypes.startloopAddrsCoarseOffset) * 32768);
        const loopEnd = voice.sample.loopEnd + getModulated(voice, generatorTypes.endloopAddrsOffset) + (getModulated(voice, generatorTypes.endloopAddrsCoarseOffset) * 32768);
        const startOffset = getModulated(voice, generatorTypes.startAddrsOffset) + (getModulated(voice, generatorTypes.startAddrsCoarseOffset) * 32768);
        const endIndex = getModulated(voice, generatorTypes.endAddrOffset) + (getModulated(voice, generatorTypes.endAddrsCoarseOffset) * 32768) + this.samples[voice.sample.sampleID].length;
        const mode = getModulated(voice, generatorTypes.sampleModes);
        const loop = mode === 1 || (mode === 3 && !voice.isInRelease);

        // PANNING
        const pan = (Math.max(-500, Math.min(500, getModulated(voice, generatorTypes.pan))) / 1000) + 0.5; // 0 to 1
        const panLeft = Math.cos(HALF_PI * pan);
        const panRight = Math.sin(HALF_PI * pan);

        // SYNTHESIS
        let actualTime = currentTime;
        for (let outputSampleIndex = 0; outputSampleIndex < outputLeft.length; outputSampleIndex++) {

            // Read the sample
            let sample = getOscillatorValue(voice,
                this.samples[voice.sample.sampleID],
                playbackRate,
                startOffset,
                endIndex,
                loop,
                loopStart,
                loopEnd
            );

            // apply the volenv
            if(voice.isInRelease)
            {
                voice.volEnvGain = getVolEnvReleaseMultiplier(release, actualTime - voice.releaseStartTime);
            }
            else {
                voice.volEnvGain = getVolumeEnvelopeValue(
                    delay,
                    attack,
                    attenuation,
                    hold,
                    sustain,
                    decay,
                    voice.startTime,
                    actualTime
                );
                voice.currentGain = voice.volEnvGain;
                voice.volEnvGain = 1;
            }
            if(voice.volEnvGain === -1)
            {
                voice.finished = true;
                return -1;
            }

            sample *= voice.volEnvGain * voice.currentGain;

            // pan the voice and write out
            outputLeft[outputSampleIndex] += sample * panLeft;
            outputRight[outputSampleIndex] += sample * panRight;

            actualTime += this.sampleTime;
        }
    }

    resetControllers()
    {
        // Create an Int16Array with 127 elements
        this.midiControllers = new Int16Array(146);
        this.midiControllers[midiControllers.mainVolume] = 100 << 7;
        this.midiControllers[midiControllers.expressionController] = 127 << 7;
        this.midiControllers[midiControllers.pan] = 64 << 7;

        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = 8192;
        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] = 2 << 7;
        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelPressure] = 127 << 7;
        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTuning] = 0;
    }

}


registerProcessor("worklet-channel-processor", ChannelProcessor);
console.log("Processor succesfully registered!");