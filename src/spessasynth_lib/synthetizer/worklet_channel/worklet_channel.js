/**
 * @typedef {{sampleID: number,
 * playbackStep: number,
 * cursor: number,
 * rootKey: number,
 * loopStart: number,
 * loopEnd: number,
 * }} WorkletSample
 *
 * @typedef {{
 * sample: WorkletSample,
 * generators: Int16Array,
 * modulators: WorkletModulator[][],
 * finished: boolean,
 * isInRelease: boolean,
 * velocity: number,
 * currentGain: number,
 * volEnvGain: number,
 * startTime: number,
 * midiNote: number,
 * releaseStartTime: number,
 * }} WorkletVoice
 */

import { Preset } from '../../soundfont/chunk/presets.js'
import { consoleColors } from '../../utils/other.js'
import { modulatorSources } from '../../soundfont/chunk/modulators.js'
import { midiControllers } from '../../midi_parser/midi_message.js'
import { addAndClampGenerator, generatorTypes } from '../../soundfont/chunk/generators.js'

const CHANNEL_GAIN = 0.5;

export const NON_CC_INDEX_OFFSET = 128;

const dataEntryStates = {
    Idle: 0,
    RPCoarse: 1,
    RPFine: 2,
    NRPCoarse: 3,
    NRPFine: 4,
    DataCoarse: 5,
    DataFine: 6
};

export const workletMessageType = {
    noteOff: 0,
    noteOn: 1,
    ccChange: 2,
    sampleDump: 3,
    killNote: 4,
    ccReset: 5,
    setChannelVibrato: 6,
    clearCache: 7,
};

/**
 * @typedef {{
 *     messageType: 0|1|2|3|4|5|6|7,
 *     messageData: (
 *     number[]
 *     |WorkletVoice[]
 *     |number
 *     |{sampleData: Float32Array, sampleID: number}
 *     |{rate: number, depth: number, delay: number}
 *     )
 * }} WorkletMessage
 * Message types:
 * 0 - noteOff            -> midiNote<number>
 * 1 - noteOn             -> [midiNote<number>, ...generators]
 * 2 - controller change         -> [ccNumber<number>, ccValue<number>]
 * 3 - sample dump -> {sampleData: Float32Array, sampleID: number}
 * 4 - note off instantly -> midiNote<number>
 * 5 - controllers reset
 * 6 - channel vibrato -> {frequencyHz: number, depthCents: number, delaySeconds: number}
 * 7 - clear cached samples
 */


export class WorkletChannel {
    /**
     * creates a midi channel
     * @param targetNode {AudioNode}
     * @param defaultPreset {Preset}
     * @param channelNumber {number}
     * @param percussionChannel {boolean}
     */
    constructor(targetNode, defaultPreset, channelNumber = -1, percussionChannel = false) {
        this.ctx = targetNode.context;
        this.outputNode = targetNode;
        this.channelNumber = channelNumber
        this.percussionChannel = percussionChannel;

        /**
         * index 1: midi note, index 2: velocity (the 3rd array is the group of worklet voices
         * @type {WorkletVoice[][][]}
         */
        this.cachedWorkletVoices = [];
        for (let i = 0; i < 128; i++) {
            this.cachedWorkletVoices.push([]);
        }


        // contains all the midi controllers and their values (and the source enum controller palettes
        this.midiControllers = new Int16Array(146); // 127 controllers + sf2 spec 8.2.1 + other things

        this.preset = defaultPreset;
        this.bank = this.preset.bank;
        this.channelVolume = 1;
        this.channelExpression = 1

        /**
         * @type {number[]}
         */
        this.actualVoices = [];

        this.holdPedal = false;
        /**
         * @type {number[]}
         */
        this.sustainedNotes = [];

        /**
         * @type {Set<number>}
         */
        this.notes = new Set();

        this.worklet = new AudioWorkletNode(this.ctx, "worklet-channel-processor", {
            outputChannelCount: [2]
        });

        // for the renderer
        this.gainController = new GainNode(this.ctx, {
            gain: CHANNEL_GAIN
        });

        /**
         * @type {Set<number>}
         */
        this.dumpedSamples = new Set();

        this.worklet.connect(this.gainController);
        this.gainController.connect(this.outputNode);

        this.resetControllers();


        /**
         * In semitones, does not get affected by resetControllers()
         * @type {number}
         */
        this.channelTranspose = 0;

        /**
         * Controls if the channel will be affected by progam change
         * @type {boolean}
         */
        this.lockPreset = false;
    }

    /**
     * @param data {WorkletMessage}
     */
    post(data)
    {
        this.worklet.port.postMessage(data);
    }

    /**
     * @param cc {number}
     * @param val {number}
     */
    controllerChange(cc, val)
    {
        switch (cc) {
            default:
                this.midiControllers[cc] = val << 7;
                this.post({
                    messageType: workletMessageType.ccChange,
                    messageData: [cc, val << 7]
                });
                break;

            case midiControllers.RPNLsb:
                this.setRPFine(val);
                break;

            case midiControllers.RPNMsb:
                this.setRPCoarse(val);
                break;

            case midiControllers.NRPNMsb:
                this.setNRPCoarse(val);
                break;

            case midiControllers.NRPNLsb:
                this.setNRPFine(val);
                break;

            case midiControllers.sustainPedal:
                if(val > 64)
                {
                    this.holdPedal = true;
                }
                else
                {
                    this.holdPedal = false;
                    this.sustainedNotes.forEach(n => {
                        this.stopNote(n);
                    })
                    this.sustainedNotes = [];
                }
                break;

            case midiControllers.dataEntryMsb:
                this.dataEntryCoarse(val);
        }
    }

    /**
     * Changes preset
     * @param preset {Preset}
     */
    setPreset(preset)
    {
        if(this.lockPreset)
        {
            return;
        }
        this.preset = preset;
        this.cachedWorkletVoices = [];
        for (let i = 0; i < 128; i++) {
            this.cachedWorkletVoices.push([]);
        }
    }

    /**
     * @param midiNote {number} 0-127
     * @param velocity {number} 0-127
     * @param debug {boolean}
     */
    playNote(midiNote, velocity, debug = false) {
        if(!velocity)
        {
            throw "No velocity given!";
        }
        if (velocity === 0) {
            // stop if velocity 0
            this.stopNote(midiNote);
            return;
        }

        /**
         * @type {WorkletVoice[]}
         */
        let workletVoices;

        const cached = this.cachedWorkletVoices[midiNote][velocity];
        if(cached)
        {
            workletVoices = cached;
            workletVoices.forEach(v => {
                v.startTime = this.ctx.currentTime;
            })
        }
        else
        {
            /**
             * @returns {WorkletVoice}
             */
            workletVoices = this.preset.getSamplesAndGenerators(midiNote, velocity).map(sampleAndGenerators => {

                // dump the sample if haven't already
                if(!this.dumpedSamples.has(sampleAndGenerators.sampleID))
                {
                    this.dumpedSamples.add(sampleAndGenerators.sampleID);
                    this.post({
                        messageType: workletMessageType.sampleDump,
                        messageData: {sampleID: sampleAndGenerators.sampleID, sampleData: sampleAndGenerators.sample.getAudioData()}
                    });
                }

                /**
                 * create the worklet sample
                 * @type {WorkletSample}
                 */
                const workletSample = {
                    sampleID: sampleAndGenerators.sampleID,
                    playbackStep: (sampleAndGenerators.sample.sampleRate / this.ctx.sampleRate) * Math.pow(2, sampleAndGenerators.sample.samplePitchCorrection / 1200),// cent tuning
                    cursor: 0,
                    rootKey: sampleAndGenerators.sample.samplePitch,
                    loopStart: sampleAndGenerators.sample.sampleLoopStartIndex / 2,
                    loopEnd: sampleAndGenerators.sample.sampleLoopEndIndex / 2
                };

                // create the generator list
                const generators = new Int16Array(60);
                // apply and sum the gens
                for (let i = 0; i < 60; i++) {
                    generators[i] = addAndClampGenerator(i, sampleAndGenerators.presetGenerators, sampleAndGenerators.instrumentGenerators);
                }

                /**
                 * grouped by destination
                 * @type {WorkletModulator[][]}
                 */
                const modulators = []
                for (let i = 0; i < 60; i++) {
                    modulators.push([]);
                }
                sampleAndGenerators.modulators.forEach(mod => {
                    modulators[mod.modulatorDestination].push({
                        transformAmount: mod.modulationAmount,
                        transformType: mod.transformType,

                        sourceIndex: mod.sourceIndex,
                        sourceUsesCC: mod.sourceUsesCC,
                        sourceTransformed: mod.sourceTransformed,

                        secondarySrcIndex: mod.secSrcIndex,
                        secondarySrcUsesCC: mod.secSrcUsesCC,
                        secondarySrcTransformed: mod.secondarySrcTransformed
                    });
                });

                this.actualVoices.push(midiNote);
                return {
                    generators: generators,
                    sample: workletSample,
                    modulators: modulators,
                    finished: false,
                    velocity: velocity,
                    currentGain: 0,
                    volEnvGain: 0,
                    midiNote: midiNote,
                    startTime: this.ctx.currentTime,
                    isInRelease: false,
                    releaseStartTime: 0
                };

            });
        }

        if(debug)
        {
            console.log(workletVoices)
        }

        // cache the voice
        this.cachedWorkletVoices[midiNote][velocity] = workletVoices;

        this.post({
            messageType: workletMessageType.noteOn,
            messageData: workletVoices
        });


        this.notes.add(midiNote);
    }

    /**
     * Stops the note
     * @param midiNote {number} 0-127
     * @param highPerf {boolean} if set to true, the note will be silenced in 50ms
     */
    stopNote(midiNote, highPerf=false) {
        // TODO: fix holdPedal
        if(this.holdPedal)
        {
            this.sustainedNotes.push(midiNote);
            return;
        }

        if(highPerf)
        {
            this.worklet.port.postMessage({
                messageType: workletMessageType.killNote,
                messageData: midiNote
            });
        }
        else {
            this.worklet.port.postMessage({
                messageType: workletMessageType.noteOff,
                messageData: midiNote
            });
        }

        this.actualVoices = this.actualVoices.filter(v => v !== midiNote);

        this.notes.delete(midiNote);
    }

    setPitchBend(bendMSB, bendLSB) {
        // bend all the notes
        this.pitchBend = (bendLSB | (bendMSB << 7)) ;
        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = this.pitchBend;
        this.post({
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel, this.pitchBend]
        });
    }

    get voicesAmount() {
        return this.actualVoices.length;
    }

    setRPCoarse(value)
    {
        this.RPValue = value;
        this.dataEntryState = dataEntryStates.RPCoarse;
    }

    setRPFine(value)
    {
        this.RPValue = this.RPValue << 7 | value;
        this.dataEntryState = dataEntryStates.RPFine;
    }

    setNRPCoarse(value)
    {
        this.NRPCoarse = value;
        this.dataEntryState = dataEntryStates.NRPCoarse;
    }

    setNRPFine(value)
    {
        this.NRPFine = value;
        this.dataEntryState = dataEntryStates.NRPFine;
    }

    /**
     * Executes a data entry for an NRP for a sc88pro NRP (because touhou yes) and RPN tuning
     * @param dataValue {number} dataEntryCoarse MSB
     */
    dataEntryCoarse(dataValue)
    {
        let addDefaultVibrato = () =>
        {
            if(this.vibrato.delay === 0 && this.vibrato.rate === 0 && this.vibrato.depth === 0)
            {
                this.vibrato.depth = 30;
                this.vibrato.rate = 6;
                this.vibrato.delay = 0.6;
            }
        }

        switch(this.dataEntryState)
        {
            default:
            case dataEntryStates.Idle:
                break;

            //https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
            case dataEntryStates.NRPFine:
                switch(this.NRPCoarse)
                {
                    default:
                        break;

                    case 1:
                        switch(this.NRPFine)
                        {
                            default:
                                break;

                            // vibrato rate
                            case 8:
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.vibrato.rate = (dataValue / 64) * 8;
                                console.log(`%cVibrato rate for channel %c${this.channelNumber}%c is now set to %c${this.vibrato.rate}%cHz.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this.vibrato
                                });
                                break;

                            // vibrato depth
                            case 9:
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.vibrato.depth = dataValue / 2;
                                console.log(`%cVibrato depth for %c${this.channelNumber}%c is now set to %c${this.vibrato.depth} %ccents range of detune.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this.vibrato
                                });
                                break;

                            // vibrato delay
                            case 10:
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.vibrato.delay = (dataValue / 64) / 3;
                                console.log(`%cVibrato delay for %c${this.channelNumber}%c is now set to %c${this.vibrato.delay} %cseconds.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this.vibrato
                                });
                                break;
                        }
                        break;
                }
                break;

            case dataEntryStates.RPCoarse:
            case dataEntryStates.RPFine:
                switch(this.RPValue)
                {
                    default:
                        break;

                    // pitch bend range
                    case 0x0000:
                        this.channelPitchBendRange = dataValue;
                        console.log(`Channel ${this.channelNumber} bend range. Semitones:`, dataValue);
                        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] = this.channelPitchBendRange << 7;
                        this.post({
                            messageType: workletMessageType.ccChange,
                            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange, this.channelPitchBendRange << 7]
                        });
                        break;

                    // coarse tuning
                    case 0x0002:
                        // semitones
                        this.channelTuningSemitones = dataValue - 64;
                        console.log("tuning", this.channelTuningSemitones, "for", this.channelNumber);
                        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTuning] = this.channelTuningSemitones + this.channelTranspose << 7;
                        this.post({
                            messageType: workletMessageType.ccChange,
                            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.channelTuning, this.channelTuningSemitones + this.channelTranspose << 7]
                        });
                        break;

                    case 0x3FFF:
                        this.resetParameters();
                        break;

                }

        }
    }

    stopAll()
    {
        for(let midiNote = 0; midiNote < 128; midiNote++)
        {
            this.stopNote(midiNote);
        }
    }

    transposeChannel(semitones)
    {
        if(this.percussionChannel)
        {
            return;
        }
        this.channelTranspose = semitones;
        this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.channelTuning] = this.channelTuningSemitones + this.channelTranspose << 7;
        this.post({
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.channelTuning, (this.channelTuningSemitones + this.channelTranspose) << 7]
        });
    }

    resetControllers()
    {
        this.holdPedal = false;

        this.vibrato = {depth: 0, rate: 0, delay: 0};

        this.resetParameters();
    }

    resetParameters()
    {
        /**
         * @type {number}
         */
        this.NRPCoarse = 0;
        /**
         * @type {number}
         */
        this.NRPFine = 0;
        /**
         * @type {number}
         */
        this.RPValue = 0;
        /**
         * @type {string}
         */
        this.dataEntryState = dataEntryStates.Idle;
    }

    resetSamples()
    {
        this.post({
            messageType: workletMessageType.clearCache,
            messageData: undefined
        });
        this.dumpedSamples.clear();
        this.cachedWorkletVoices = [];
        for (let i = 0; i < 128; i++) {
            this.cachedWorkletVoices.push([]);
        }
    }
}