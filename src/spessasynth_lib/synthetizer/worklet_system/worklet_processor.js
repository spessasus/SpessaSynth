import { NON_CC_INDEX_OFFSET, WORKLET_PROCESSOR_NAME, workletMessageType } from './worklet_system.js'
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
import { VOICE_CAP } from '../synthetizer.js'
import Module from './cpessasynth.js'
import cpessasynth from './cpessasynth.js'
import Cpessasynth from './cpessasynth.js'

/**
 * worklet_processor.js
 * purpose: manages the synthesizer from the AudioWorkletGlobalScope and renders the audio data
 */
const CONTROLLER_TABLE_SIZE = 147;
const SERIALIZED_MODULATOR_ELEMENTS = 5;
const MIN_NOTE_LENGTH = 0.07; // if the note is released faster than that, it forced to last that long

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

/**
 * @typedef {{
 *     midiControllers: Int16Array,
 *     holdPedal: boolean,
 *     channelVibrato: {depth: number, delay: number, rate: number},
 *     isMuted: boolean,
 *
 *     voices: WorkletVoice[],
 *     sustainedVoices: WorkletVoice[],
 *
 * }} WorkletProcessorChannel
 */

/**
 * @type {Float32Array[]}
 */
let workletDumpedSamplesList = [];

const CppessaSynth = Module();

class WorkletProcessor extends AudioWorkletProcessor {
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param options {{
     * processorOptions: {
     *      midiChannels: number,
     *      totalSamplesAmount: number
     * }}}
     */
    constructor(options) {
        super();

        this._outputsAmount = options.processorOptions.midiChannels;
        CppessaSynth._initializeCppessaSynth(this._outputsAmount,
            sampleRate,
            options.processorOptions.totalSamplesAmount);

        this.channelsAmount = this._outputsAmount;

        // /**
        //  * contains all the channels with their voices on the processor size
        //  * @type {WorkletProcessorChannel[]}
        //  */
        // this.workletProcessorChannels = [];
        // for (let i = 0; i < this._outputsAmount; i++) {
        //     this.createWorkletChannel();
        // }
        //
        // // in seconds, time between two samples (very, very short)
        // this.sampleTime = 1 / sampleRate;
        //
        // this.totalVoicesAmount = 0;

        this.port.onmessage = e => this.handleMessage(e.data);
    }

    createWorkletChannel()
    {
        this.workletProcessorChannels.push({
            midiControllers: new Int16Array(CONTROLLER_TABLE_SIZE),
            voices: [],
            sustainedVoices: [],
            holdPedal: false,
            isMuted: false,
            channelVibrato: {delay: 0, depth: 0, rate: 0}

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
        //const channelVoices = this.workletProcessorChannels[channel].voices;
        switch (message.messageType) {
            default:
                break;

            // note off
            case workletMessageType.noteOff:
                CppessaSynth._noteOff(channel, data, currentTime);
                break;

            case workletMessageType.killNote:
                // TODO: kill note
                // channelVoices.forEach(v => {
                //     if(v.midiNote !== data)
                //     {
                //         return;
                //     }
                //     v.modulatedGenerators[generatorTypes.releaseVolEnv] = -12000; // set release to be very short
                //     this.releaseVoice(v);
                // });
                break;

            case workletMessageType.noteOn:
                data.forEach(voice => {
                    // allocate and write generators (do not free those)
                    // convert generators to int32
                    const generators = new Int32Array(voice.generators);
                    const generatorsPointer = CppessaSynth._malloc(60 * generators.BYTES_PER_ELEMENT);
                    CppessaSynth.HEAP32.set(generators, generatorsPointer / generators.BYTES_PER_ELEMENT);

                    // serialize modulators (free those after)
                    const serializedModulators = new Int32Array(voice.modulators.length * SERIALIZED_MODULATOR_ELEMENTS);
                    for(let index = 0; index < serializedModulators.length; index += SERIALIZED_MODULATOR_ELEMENTS)
                    {
                        /**
                         * modulators serialized as follows 5 elements per modulator sourceEnum, secSourceEnum, destination, transformAmount, transformType
                         * @type {Modulator}
                         */
                        const modulator = voice.modulators[index / SERIALIZED_MODULATOR_ELEMENTS];
                        serializedModulators[index] = modulator.modulatorSource;
                        serializedModulators[index + 1] = modulator.modulationSecondarySrc;
                        serializedModulators[index + 2] = modulator.modulatorDestination;
                        serializedModulators[index + 3] = modulator.transformAmount;
                        serializedModulators[index + 4] = modulator.transformType;
                    }
                    // malloc the memory and write to wasm heap
                    const modulatorsSerializedPointer = CppessaSynth._malloc(serializedModulators.length * serializedModulators.BYTES_PER_ELEMENT);
                    CppessaSynth.HEAP32.set(serializedModulators, modulatorsSerializedPointer / SERIALIZED_MODULATOR_ELEMENTS.BYTES_PER_ELEMENT);


                    CppessaSynth._createVoice(
                        channel,
                        voice.midiNote,
                        voice.velocity,
                        voice.targetKey,
                        voice.sample.rootKey,
                        voice.startTime,

                        voice.sample.sampleID,
                        voice.sample.playbackStep,
                        voice.sample.loopStart,
                        voice.sample.loopEnd,
                        voice.sample.cursor, // cursor is set to start
                        voice.sample.end,
                        voice.sample.loopingMode,

                        generatorsPointer,
                        modulatorsSerializedPointer,
                        voice.modulators.length
                    )

                    CppessaSynth._free(modulatorsSerializedPointer);
                })
                break;

            case workletMessageType.sampleDump:
                // allocate memory
                const samplePointer = CppessaSynth._malloc(data.sampleData.length * Float32Array.BYTES_PER_ELEMENT);
                CppessaSynth.HEAPF32.set(data.sampleData, samplePointer / data.sampleData.BYTES_PER_ELEMENT);
                CppessaSynth._dumpSample(samplePointer, data.sampleData.length, data.sampleID, currentTime);
                break;

            case workletMessageType.ccReset:
                // TODO: cc reset
                // this.resetControllers(channel, data);
                break;

            case workletMessageType.ccChange:
                CppessaSynth._controllerChange(channel, data[0], data[1], currentTime);
                break;

            case workletMessageType.setChannelVibrato:
                CppessaSynth._setChannelVibrato(channel, data.rate, data.delay, data.depth);
                break;

            case workletMessageType.clearCache:
                CppessaSynth._clearDumpedSamples(data)
                break;

            case workletMessageType.stopAll:
                CppessaSynth._stopAll(data === 1, currentTime);
                break;

            case workletMessageType.killNotes:
                this.voiceKilling(data);
                break;

            case workletMessageType.muteChannel:
                CppessaSynth._setChannelMute(channel, data);
                break;

            case workletMessageType.addNewChannel:
                this.channelsAmount++;
                CppessaSynth._addNewChannel();
                break;
        }
    }

    voiceKilling(amount)
    {
        CppessaSynth._killVoices(amount);
        this.updateVoicesAmount();
    }

    updateVoicesAmount()
    {
        const amount = [];
        for (let i = 0; i < this.channelsAmount; i++) {
            amount.push(CppessaSynth._getVoicesAmount(i));
        }
        this.port.postMessage(amount);
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
     * @param outputs {Float32Array[][]} the outputs to write to
     * @returns {boolean} true
     */
    process(inputs, outputs) {
        // two output buffers: left and right. map them
        const leftOutputBuffers = outputs.map(out => out[0]);
        const rightOutputBuffers = outputs.map(out => out[1]);
        const bufferLength = outputs[0][0].length;

        // allocate memory for each output buffer in the wasm heap
        /**
         * @type {number[]}
         */
        const leftBufferPointers = leftOutputBuffers.map(outputBuffer => {
            // get pointer
            const pointer = CppessaSynth._malloc(outputBuffer.length *  outputBuffer.BYTES_PER_ELEMENT);
            // malloc
            CppessaSynth.HEAPF32.set(outputBuffer, pointer / outputBuffer.BYTES_PER_ELEMENT);
            // return the pointer
            return pointer;
        });

        /**
         * @type {number[]}
         */
        const rightBufferPointers = rightOutputBuffers.map(outputBuffer => {
            // get pointer
            const pointer = CppessaSynth._malloc(outputBuffer.length *  outputBuffer.BYTES_PER_ELEMENT);
            // malloc
            CppessaSynth.HEAPF32.set(outputBuffer, pointer / outputBuffer.BYTES_PER_ELEMENT);
            // return the pointer
            return pointer;
        })

        // Allocate memory for the array of pointers
        const leftArraysPointer = CppessaSynth._malloc(leftBufferPointers.length * 4); // 4 bytes per pointer
        leftBufferPointers.forEach((pointer, index) => {
            // save the pointer in the wasm heap
            CppessaSynth.setValue(leftArraysPointer + index * 4, pointer, 'i32'); // 32 bit pointers
        });

        const rightArraysPointer = CppessaSynth._malloc(rightBufferPointers.length * 4); // 4 bytes per pointer
        rightBufferPointers.forEach((pointer, index) => {
            // save the pointer in the wasm heap
            CppessaSynth.setValue(rightArraysPointer + index * 4, pointer, 'i32'); // 32 bit pointers
        });

        CppessaSynth._renderAudio(
            bufferLength,
            currentTime,
            this._outputsAmount,
            leftArraysPointer,
            rightArraysPointer,
        );

        // write the arrays back out
        leftOutputBuffers.forEach((buffer, index) => {
            const pointer = leftBufferPointers[index];
            buffer.set(CppessaSynth.HEAPF32.subarray(pointer / buffer.BYTES_PER_ELEMENT, pointer / buffer.BYTES_PER_ELEMENT + buffer.length));
        });

        rightOutputBuffers.forEach((buffer, index) => {
            const pointer = rightBufferPointers[index];
            buffer.set(CppessaSynth.HEAPF32.subarray(pointer / buffer.BYTES_PER_ELEMENT, pointer / buffer.BYTES_PER_ELEMENT + buffer.length));
        });

        // free stuff
        leftBufferPointers.forEach(CppessaSynth._free);
        CppessaSynth._free(leftArraysPointer);

        rightBufferPointers.forEach(CppessaSynth._free);
        CppessaSynth._free(rightArraysPointer);
        this.updateVoicesAmount();
        return true;
    }
}


registerProcessor(WORKLET_PROCESSOR_NAME, WorkletProcessor);
console.log("%cProcessor succesfully registered!", consoleColors.recognized);