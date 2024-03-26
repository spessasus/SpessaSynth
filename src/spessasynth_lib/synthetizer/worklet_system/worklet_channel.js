/**
 * @typedef {{sampleID: number,
 * playbackStep: number,
 * cursor: number,
 * rootKey: number,
 * loopStart: number,
 * loopEnd: number,
 * end: number,
 * loopingMode: 0|1|2,
 * }} WorkletSample
 *
 *
 * @typedef {{
 *     a0: number,
 *     a1: number,
 *     a2: number,
 *     a3: number,
 *     a4: number,
 *
 *     x1: number,
 *     x2: number,
 *     y1: number,
 *     y2: number
 *
 *     reasonanceCb: number,
 *     reasonanceGain: number
 *
 *     cutoffCents: number,
 *     cutoffHz: number
 * }} WorkletLowpassFilter
 *
 * @typedef {{
 * sample: WorkletSample,
 * filter: WorkletLowpassFilter
 *
 * generators: Int16Array,
 * modulators: Modulator[],
 * modulatedGenerators: Int16Array,
 *
 * finished: boolean,
 * isInRelease: boolean,
 *
 * velocity: number,
 * midiNote: number,
 * targetKey: number,
 *
 * currentAttenuationDb: number,
 * currentModEnvValue: number,
 * startTime: number,
 *
 * releaseStartTime: number,
 * releaseStartModEnv: number,
 *
 * currentTuningCents: number,
 * currentTuningCalculated: number
 * }} WorkletVoice
 */

import { Preset } from '../../soundfont/chunk/presets.js'
import { consoleColors } from '../../utils/other.js'
import { modulatorSources } from '../../soundfont/chunk/modulators.js'
import { midiControllers } from '../../midi_parser/midi_message.js'
import { addAndClampGenerator, generatorTypes } from '../../soundfont/chunk/generators.js'
import { Chorus } from '../chorus.js'
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
    stopAll: 8,
    killNotes: 9
};

/**
 * @typedef {{
 *     messageType: 0|1|2|3|4|5|6|7|8|9,
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
 * 2 - controller change  -> [ccNumber<number>, ccValue<number>]
 * 3 - sample dump        -> {sampleData: Float32Array, sampleID: number}
 * 4 - note off instantly -> midiNote<number>
 * 5 - controllers reset     (no data)
 * 6 - channel vibrato    -> {frequencyHz: number, depthCents: number, delaySeconds: number}
 * 7 - clear cached samples  (no data)
 * 8 - stop all notes     -> force<number> (0 false, 1 true)
 * 9 - kill notes         -> amount<number>
 */


export class WorkletChannel {
    /**
     * creates a midi channel
     * @param targetNode {AudioNode}
     * @param reverbNode {AudioNode}
     * @param defaultPreset {Preset}
     * @param channelNumber {number}
     * @param percussionChannel {boolean}
     */
    constructor(targetNode, reverbNode, defaultPreset, channelNumber = -1, percussionChannel = false) {
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

        this.preset = defaultPreset;
        this.bank = this.preset.bank;
        this.channelVolume = 1;
        this.channelExpression = 1;

        this.channelTuningSemitones = 0;

        this.holdPedal = false;
        /**
         * @type {number[]}
         */
        this.sustainedNotes = [];

        this.worklet = new AudioWorkletNode(this.ctx, "worklet-channel-processor", {
            outputChannelCount: [2, 2],
            numberOfOutputs: 2
        });

        this.reportedVoicesAmount = 0;
        this.worklet.port.onmessage = e => this.reportedVoicesAmount = e.data;

        // for the renderer
        this.gainController = new GainNode(this.ctx, {
            gain: CHANNEL_GAIN
        });
        this.muted = false;

        /**
         * @type {Set<number>}
         */
        this.dumpedSamples = new Set();

        this.chorus = new Chorus(this.worklet, this.gainController, 0);

        this.gainController.connect(this.outputNode);
        this.worklet.connect(reverbNode, 1);


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
        this.lockVibrato = false;
    }

    /**
     * Kills the given amount of notes
     * @param amount {number}
     */
    requestNoteRemoval(amount)
    {
        this.post({
            messageType: workletMessageType.killNotes,
            messageData: amount
        });
    }

    /**
     * @param value {{delay: number, depth: number, rate: number}}
     */
    set vibrato(value)
    {
        this.post({
            messageType: workletMessageType.setChannelVibrato,
            messageData: value
        });
        this._vibrato = value;
    }

    get vibrato()
    {
        return this._vibrato;
    }

    /**
     * @param data {WorkletMessage}
     */
    post(data)
    {
        this.worklet.port.postMessage(data);
    }

    muteChannel()
    {
        this.gainController.gain.value = 0;
        this.muted = true;
    }

    unmuteChannel()
    {
        this.muted = false;
        this.gainController.gain.value = CHANNEL_GAIN;
    }

    /**
     * @param cc {number}
     * @param val {number}
     */
    controllerChange(cc, val)
    {
        switch (cc) {
            default:
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

            case midiControllers.effects3Depth:
                this.chorus.setChorusLevel(val);
                break;

            case midiControllers.sustainPedal:
                if(val >= 64)
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
        if(this.preset.bank === 128)
        {
            this.channelTranspose = 0;
            this.post({
                messageType: workletMessageType.ccChange,
                messageData: [NON_CC_INDEX_OFFSET + modulatorSources.channelTranspose, 0]
            });
        }
    }

    /**
     * @param midiNote {number}
     * @param velocity {number}
     * @returns {WorkletVoice[]}
     */
    getWorkletVoices(midiNote, velocity)
    {
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
            });
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

                // create the generator list
                const generators = new Int16Array(60);
                // apply and sum the gens
                for (let i = 0; i < 60; i++) {
                    generators[i] = addAndClampGenerator(i, sampleAndGenerators.presetGenerators, sampleAndGenerators.instrumentGenerators);
                }

                // key override
                let rootKey = sampleAndGenerators.sample.samplePitch;
                if(generators[generatorTypes.overridingRootKey] > -1)
                {
                    rootKey = generators[generatorTypes.overridingRootKey];
                }

                let targetKey = midiNote;
                if(generators[generatorTypes.keyNum] > -1)
                {
                    targetKey = generators[generatorTypes.keyNum];
                }

                /**
                 * create the worklet sample
                 * @type {WorkletSample}
                 */
                const workletSample = {
                    sampleID: sampleAndGenerators.sampleID,
                    playbackStep: (sampleAndGenerators.sample.sampleRate / this.ctx.sampleRate) * Math.pow(2, sampleAndGenerators.sample.samplePitchCorrection / 1200),// cent tuning
                    cursor: generators[generatorTypes.startAddrsOffset] + (generators[generatorTypes.startAddrsCoarseOffset] * 32768),
                    rootKey: rootKey,
                    loopStart: (sampleAndGenerators.sample.sampleLoopStartIndex / 2) + (generators[generatorTypes.startloopAddrsOffset] + (generators[generatorTypes.startloopAddrsCoarseOffset] * 32768)),
                    loopEnd: (sampleAndGenerators.sample.sampleLoopEndIndex / 2) + (generators[generatorTypes.endloopAddrsOffset] + (generators[generatorTypes.endloopAddrsCoarseOffset] * 32768)),
                    end: sampleAndGenerators.sample.sampleLength / 2 + 1 + (generators[generatorTypes.endAddrOffset] + (generators[generatorTypes.endAddrsCoarseOffset] * 32768)),
                    loopingMode: generators[generatorTypes.sampleModes]
                };


                // velocity override
                if(generators[generatorTypes.velocity] > -1)
                {
                    velocity = generators[generatorTypes.velocity];
                }

                return {
                    filter: {
                        a0: 0,
                        a1: 0,
                        a2: 0,
                        a3: 0,
                        a4: 0,

                        x1: 0,
                        x2: 0,
                        y1: 0,
                        y2: 0,
                        reasonanceCb: 0,
                        reasonanceGain: 1,
                        cutoffCents: 13500,
                        cutoffHz: 20000
                    },
                    generators: generators,
                    modulatedGenerators: new Int16Array(60),
                    sample: workletSample,
                    modulators: sampleAndGenerators.modulators,
                    finished: false,
                    velocity: velocity,
                    currentAttenuationDb: 100,
                    currentModEnvValue: 0,
                    releaseStartModEnv: 1,
                    midiNote: midiNote,
                    startTime: this.ctx.currentTime,
                    isInRelease: false,
                    releaseStartTime: -1,
                    targetKey: targetKey,
                    currentTuningCalculated: 1,
                    currentTuningCents: 0
                };

            });

            // cache the voice
            this.cachedWorkletVoices[midiNote][velocity] = workletVoices;
        }
        return workletVoices;
    }

    /**
     * @param midiNote {number} 0-127
     * @param velocity {number} 0-127
     * @param debug {boolean}
     * @returns {number} the number of voices that this note adds
     */
    playNote(midiNote, velocity, debug = false) {
        if(!velocity)
        {
            throw "No velocity given!";
        }
        if (velocity === 0) {
            // stop if velocity 0
            this.stopNote(midiNote);
            return 0;
        }

        if(this.muted)
        {
            return 0;
        }

        let workletVoices = this.getWorkletVoices(midiNote, velocity);

        if(debug)
        {
            console.table(workletVoices)
        }

        this.post({
            messageType: workletMessageType.noteOn,
            messageData: workletVoices
        });
        return workletVoices.length;
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
    }

    setPitchBend(bendMSB, bendLSB) {
        // bend all the notes
        this.pitchBend = (bendLSB | (bendMSB << 7)) ;
        this.post({
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel, this.pitchBend]
        });
    }

    get voicesAmount() {
        return this.reportedVoicesAmount;
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

    setPitchBendRange(semitones)
    {
        this.channelPitchBendRange = semitones;
        console.log(`%cChannel ${this.channelNumber} bend range. Semitones: %c${semitones}`,
            consoleColors.info,
            consoleColors.value);
        this.post({
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange, this.channelPitchBendRange << 7]
        });
    }

    /**
     * Executes a data entry for an NRP for a sc88pro NRP (because touhou yes) and RPN tuning
     * @param dataValue {number} dataEntryCoarse MSB
     */
    dataEntryCoarse(dataValue)
    {
        let addDefaultVibrato = () =>
        {
            if(this._vibrato.delay === 0 && this._vibrato.rate === 0 && this._vibrato.depth === 0)
            {
                this._vibrato.depth = 50;
                this._vibrato.rate = 8;
                this._vibrato.delay = 0.6;
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
                                if(this.lockVibrato)
                                {
                                    return;
                                }
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this._vibrato.rate = (dataValue / 64) * 8;
                                console.log(`%cVibrato rate for channel %c${this.channelNumber}%c is now set to %c${this._vibrato.rate}%cHz.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this._vibrato
                                });
                                break;

                            // vibrato depth
                            case 9:
                                if(this.lockVibrato)
                                {
                                    return;
                                }
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this._vibrato.depth = dataValue / 2;
                                console.log(`%cVibrato depth for %c${this.channelNumber}%c is now set to %c${this._vibrato.depth} %ccents range of detune.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this._vibrato
                                });
                                break;

                            // vibrato delay
                            case 10:
                                if(this.lockVibrato)
                                {
                                    return;
                                }
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this._vibrato.delay = (dataValue / 64) / 3;
                                console.log(`%cVibrato delay for %c${this.channelNumber}%c is now set to %c${this._vibrato.delay} %cseconds.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this._vibrato
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
                        this.setPitchBendRange(dataValue);
                        break;

                    // coarse tuning
                    case 0x0002:
                        // semitones
                        this.setChannelTuning(dataValue - 64);
                        break;

                    case 0x3FFF:
                        this.resetParameters();
                        break;

                }

        }
    }

    /**
     * Sets the channel's tuning
     * @param semitones {number}
     */
    setChannelTuning(semitones)
    {
        this.channelTuningSemitones = semitones;
        console.log(`%cChannel ${this.channelNumber} tuning. Semitones: %c${this.channelTuningSemitones}`,
            consoleColors.info,
            consoleColors.value);
        this.post({
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.channelTuning, (this.channelTuningSemitones) * 100]
        });
    }

    stopAll(force=false)
    {
        this.post({
            messageType: workletMessageType.stopAll,
            messageData: force ? 1 : 0
        });
    }

    /**
     * Transposes the channel by given amount of semitones
     * @param semitones {number} Can be float
     * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
     */
    transposeChannel(semitones, force=false)
    {
        if(this.percussionChannel && !force)
        {
            return;
        }
        this.channelTranspose = semitones;
        this.post({
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.channelTranspose, this.channelTranspose * 100]
        });
    }

    resetControllers()
    {
        this.holdPedal = false;
        this.chorus.setChorusLevel(0);

        this._vibrato = {depth: 0, rate: 0, delay: 0};

        this.resetParameters();
        this.post({
            messageType: workletMessageType.ccReset,
            messageData: 0
        });
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