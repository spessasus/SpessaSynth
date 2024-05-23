import { Preset } from '../../soundfont/chunk/presets.js'
import { consoleColors } from '../../utils/other.js'
import { modulatorSources } from '../../soundfont/chunk/modulators.js'
import { midiControllers } from '../../midi_parser/midi_message.js'
import { clearSamplesList, getWorkletVoices } from './worklet_utilities/worklet_voice.js'
import { DEFAULT_PERCUSSION } from '../synthetizer.js'

/**
 * worklet_system.js
 * purpose: manages the worklet system and communicates with worklet_processor.js
 */

export const WORKLET_PROCESSOR_NAME = "spessasynth-worklet-syste,";

export const WORKLET_SYSTEM_GAIN = 0.5;

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
    killNotes: 9,
    muteChannel: 10,
    addNewChannel: 11,
};

/**
 * @typedef {{
 *     channelNumber: number
 *     messageType: 0|1|2|3|4|5|6|7|8|9|10|11,
 *     messageData: (
 *     number[]
 *     |WorkletVoice[]
 *     |number
 *     |{sampleData: Float32Array, sampleID: number}
 *     |{rate: number, depth: number, delay: number}
 *     |boolean
 *     )
 * }} WorkletMessage
 * Every message needs a channel number
 * Message types:
 * 0 - noteOff              -> midiNote<number>
 * 1 - noteOn               -> [midiNote<number>, ...generators]
 * 2 - controller change    -> [ccNumber<number>, ccValue<number>]
 * 3 - sample dump          -> {sampleData: Float32Array, sampleID: number}
 * 4 - note off instantly   -> midiNote<number>
 * 5 - controllers reset    ->    array<number> excluded controller numbers (excluded from the reset)
 * 6 - channel vibrato      -> {frequencyHz: number, depthCents: number, delaySeconds: number}
 * 7 - clear cached samples ->  (no data)
 * 8 - stop all notes       -> force<number> (0 false, 1 true)
 * 9 - kill notes           -> amount<number>
 * 10 - mute channel        -> isMuted<booolean>
 * 11 - add new channel     -> (no data)
 */

/**
 * @typedef {{
 *     preset: Preset,
 *     vibrato: {depth: number, delay: number, rate: number},
 *     bank: number,
 *     pitchBend: number,
 *     channelPitchBendRange: number,
 *     channelTuningSemitones: number
 *     channelTranspose: number, // In semitones, does not get affected by resetControllers
 *     NRPCoarse: number,
 *     NRPFine: number,
 *     RPValue: number,
 *     dataEntryState: number,
 *     percussionChannel: boolean
 *
 *     cachedWorkletVoices: WorkletVoice[][][], // index 1: midi note, index 2: velocity (the 3rd array is the group of worklet voices
 *
 *     lockedControllers: boolean[], // These controllers cannot be changed via controller change
 *     isMuted: boolean,
 *     lockVibrato: boolean,
 *     lockPreset: boolean,
 *
 *     voicesAmount: number,
 * }} WorkletChannel
 */

export class WorkletSystem {
    /**
     * creates a whole instance of the worklet system
     * @param targetNode {AudioNode} the output node
     * @param reverbNode {AudioNode}
     * @param chorusNode {AudioNode}
     * @param defaultPreset {Preset}
     * @param percussionPreset {Preset}
     * @param channelsAmount {number} the new channels will have their audio modulod by this constant.
     * the worklet will have channelsAmount outputs + reverb + chorus
     */
    constructor(targetNode,
                reverbNode,
                chorusNode,
                defaultPreset,
                percussionPreset,
                channelsAmount) {

        // set the constants
        this.ctx = targetNode.context;
        this.outputNode = targetNode;
        this.percussionPreset = percussionPreset;
        /**
         * the new channels will have their audio sent to the moduled output by this constant.
         * what does that mean? e.g. if outputsAmount is 16, then channel's 16 audio will be sent to channel 0
         * @type {number}
         * @private
         */
        this._outputsAmount = channelsAmount
        this.defaultPreset = defaultPreset;

        /**
         * the amount of midi channels
         * @type {number}
         */
        this.channelsAmount = 0;

        // create a worklet processor

        // first two outputs: reverb, chorsu, the others are the channel outputs
        this.worklet = new AudioWorkletNode(this.ctx, WORKLET_PROCESSOR_NAME, {
            outputChannelCount: Array(this._outputsAmount + 2).fill(2),
            numberOfOutputs: this._outputsAmount + 2,
            processorOptions: {
                midiChannels: this._outputsAmount
            }
        });

        /**
         * holds all midi channels
         * @type {WorkletChannel[]}
         */
        this.midiChannels = [];

        this.voicesAmount = 0;

        // create the channels

        for (let i = 0; i < channelsAmount; i++) {
            // do not send it to worklet as it already has created the channels with the midiCHannels processorOptions
            this.createNewChannel(false);
        }

        // set percussion
        this.midiChannels[DEFAULT_PERCUSSION].percussionChannel = true;
        this.midiChannels[DEFAULT_PERCUSSION].bank = 128;
        this.setPreset(DEFAULT_PERCUSSION, this.percussionPreset);

        // worklet sends us an array of voice amounts
        this.worklet.port.onmessage = e => {
            /**
             * @type {number[]}
             */
            const channelVoiceAmounts =  e.data;

            // apply the voices amount to every channel and update total
            let totalAmount = 0;
            for (let i = 0; i < this.channelsAmount; i++) {
                this.midiChannels[i].voicesAmount = channelVoiceAmounts[i];
                totalAmount += channelVoiceAmounts[i];
            }
            this.voicesAmount = totalAmount;
        };

        this.worklet.connect(reverbNode, 0);
        this.worklet.connect(chorusNode, 1);

        // connect all outputs to the output node
        for (let i = 2; i < channelsAmount + 2; i++) {
            this.worklet.connect(this.outputNode, i);
        }
    }

    /**
     * Connects the individual audio outputs to the given audio nodes. In the app it's used by the renderer.
     * @param audioNodes {AudioNode[]}
     */
    connectIndividualOutputs(audioNodes)
    {
        if(audioNodes.length !== this._outputsAmount)
        {
            console.trace();
            throw `input nodes amount differs from the system's outputs amount!
            Expected ${this._outputsAmount} got ${audioNodes.length}`;
        }
        for (let outputNumber = 0; outputNumber < this._outputsAmount; outputNumber++) {
            // + 2 because chorus and reverb come first!
            this.worklet.connect(audioNodes[outputNumber], outputNumber + 2);
        }
    }

    createNewChannel(sendWorkletMessage=true)
    {
        /**
         * @type {WorkletChannel}
         **/
        const channel = {
            preset: this.defaultPreset,
            vibrato: {depth: 0, delay: 0, rate: 0},
            bank: 0,
            pitchBend: 8192,
            channelPitchBendRange: 2,
            channelTuningSemitones: 0,
            channelTranspose: 0,
            NRPCoarse: 0,
            NRPFine: 0,
            RPValue: 0,
            dataEntryState: dataEntryStates.Idle,
            percussionChannel: false,

            cachedWorkletVoices: [],

            lockedControllers: Array(128).fill(false),
            isMuted: false,
            lockVibrato: false,
            lockPreset: false,

            voicesAmount: 0
        };
        for (let i = 0; i < 128; i++) {
            channel.cachedWorkletVoices.push([]);
        }
        this.midiChannels.push(channel);
        this.channelsAmount++;
        if(sendWorkletMessage) {
            this.post({
                channelNumber: 0,
                messageType: workletMessageType.addNewChannel,
                messageData: null
            });
        }



    }

    /**
     * kills the system, disconnecting everything
     */
    killSystem()
    {
        for (let i = 0; i < this.midiChannels.length; i++) {
            this.killChannel(i);
        }
        delete this.midiChannels;
        this.worklet.disconnect();
    }

    /**
     * Kills the channel, disconnecting everything
     * @param channel {number}
     */
    killChannel(channel)
    {
        this.stopAll(channel, true);
        this.muteChannel(channel);
        delete this.midiChannels[channel].cachedWorkletVoices;
    }

    /**
     * locks the controller, preventing it from being changed
     * @param channel {number}
     * @param controllerNumber {number}
     */
    lockController(channel, controllerNumber)
    {
        this.midiChannels[channel].lockedControllers[controllerNumber] = true;
    }

    /**
     * unlocks the controller
     * @param channel {number}
     * @param controllerNumber {number}
     */
    unlockController(channel, controllerNumber)
    {
        this.midiChannels[channel].lockedControllers[controllerNumber] = false;
    }

    /**
     * Kills the given amount of notes
     * @param amount {number}
     */
    requestNoteRemoval(amount)
    {
        // find the non percussion channel index with the largest amount of voices
        const channel = this.midiChannels.reduce((maxIndex, currentChannel, currentIndex, arr) => {
            return currentChannel.voicesAmount > arr[maxIndex].voicesAmount ? currentIndex : maxIndex;
        }, 0);
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.killNotes,
            messageData: amount
        });
    }

    /**
     * @param channel {number}
     * @param isLocked {boolean}
     */
    setVibratoLock(channel, isLocked)
    {
        this.midiChannels[channel].lockVibrato = isLocked;
    }

    /**
     * @param channel {number}
     * @param value {{delay: number, depth: number, rate: number}}
     */
    setVibrato(channel, value)
    {
        if(this.midiChannels[channel].lockVibrato)
        {
            return;
        }
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.setChannelVibrato,
            messageData: value
        });
        this.midiChannels[channel].vibrato = value;
    }

    /**
     * @param channel {number}
     * @return {{depth: number, delay: number, rate: number}}
     */
    getVibrato(channel)
    {
        return this.midiChannels[channel].vibrato;
    }

    /**
     * @param data {WorkletMessage}
     */
    post(data)
    {
        this.worklet.port.postMessage(data);
    }

    /**
     * @param channel {number}
     */
    muteChannel(channel)
    {
        this.midiChannels[channel].isMuted = true;
        this.stopAll(channel,true);
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.muteChannel,
            messageData: true
        });
    }

    /**
     * @param channel {number}
     */
    unmuteChannel(channel)
    {
        this.midiChannels[channel].isMuted = false;
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.muteChannel,
            messageData: false
        });
    }

    /**
     * @param channel {number}
     * @param cc {number}
     * @param val {number}
     * @returns {boolean} false if the cc was locked
     */
    controllerChange(channel, cc, val)
    {
        if(this.midiChannels[channel].lockedControllers[cc] === true)
        {
            return false;
        }
        switch (cc) {
            default:
                this.post({
                    channelNumber: channel,
                    messageType: workletMessageType.ccChange,
                    messageData: [cc, val << 7]
                });
                break;

            case midiControllers.RPNLsb:
                this.setRPFine(channel, val);
                break;

            case midiControllers.RPNMsb:
                this.setRPCoarse(channel, val);
                break;

            case midiControllers.NRPNMsb:
                this.setNRPCoarse(channel, val);
                break;

            case midiControllers.NRPNLsb:
                this.setNRPFine(channel, val);
                break;

            case midiControllers.dataEntryMsb:
                this.dataEntryCoarse(channel, val);
        }

        return true;
    }

    /**
     * Changes preset
     * @param channel {number}
     * @param preset {Preset}
     */
    setPreset(channel, preset)
    {
        if(this.midiChannels[channel].lockPreset)
        {
            return;
        }
        this.midiChannels[channel].preset = preset;
        this.midiChannels[channel].cachedWorkletVoices = [];
        for (let i = 0; i < 128; i++) {
            this.midiChannels[channel].cachedWorkletVoices.push([]);
        }
        if(this.midiChannels[channel].preset.bank === 128)
        {
            this.midiChannels[channel].channelTranspose = 0;
            this.post({
                channelNumber: channel,
                messageType: workletMessageType.ccChange,
                messageData: [NON_CC_INDEX_OFFSET + modulatorSources.channelTranspose, 0]
            });
        }
    }

    /**
     * @param channel {number}
     * @param midiNote {number} 0-127
     * @param velocity {number} 0-127
     * @param debug {boolean}
     * @returns {number} the number of voices that this note adds
     */
    playNote(channel, midiNote, velocity, debug = false) {
        if(!velocity)
        {
            throw "No velocity given!";
        }
        if (velocity === 0) {
            // stop if velocity 0
            this.stopNote(channel, midiNote);
            return 0;
        }

        if(this.midiChannels[channel].isMuted)
        {
            return 0;
        }
        // get the worklet voices
        let workletVoices = getWorkletVoices(
            channel,
            midiNote,
            velocity,
            this.midiChannels[channel].preset,
            this.ctx,
            this.worklet.port,
            this.midiChannels[channel].cachedWorkletVoices,
            debug);

        this.post({
            channelNumber: channel,
            messageType: workletMessageType.noteOn,
            messageData: workletVoices
        });
        return workletVoices.length;
    }

    /**
     * Stops the note
     * @param channel {number}
     * @param midiNote {number} 0-127
     * @param highPerf {boolean} if set to true, the note will be silenced in 50ms
     */
    stopNote(channel, midiNote, highPerf=false) {
        if(highPerf)
        {
            this.post({
                channelNumber: channel,
                messageType: workletMessageType.killNote,
                messageData: midiNote
            });
        }
        else {
            this.post({
                channelNumber: channel,
                messageType: workletMessageType.noteOff,
                messageData: midiNote
            });
        }
    }

    /**
     * @param channel {number}
     * @param bendMSB {number}
     * @param bendLSB {number}
     */
    setPitchBend(channel, bendMSB, bendLSB) {
        // bend all the notes
        this.midiChannels[channel].pitchBend = (bendLSB | (bendMSB << 7)) ;
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel, this.midiChannels[channel].pitchBend]
        });
    }

    /**
     * @param channel {number}
     * @param value {number}
     */
    setRPCoarse(channel, value)
    {
        this.midiChannels[channel].RPValue = value;
        this.midiChannels[channel].dataEntryState = dataEntryStates.RPCoarse;
    }

    /**
     * @param channel {number}
     * @param value {number}
     */
    setRPFine(channel, value)
    {
        this.midiChannels[channel].RPValue = this.midiChannels[channel].RPValue << 7 | value;
        this.midiChannels[channel].dataEntryState = dataEntryStates.RPFine;
    }

    /**
     * @param channel {number}
     * @param value {number}
     */
    setNRPCoarse(channel, value)
    {
        this.midiChannels[channel].NRPCoarse = value;
        this.midiChannels[channel].dataEntryState = dataEntryStates.NRPCoarse;
    }

    /**
     * @param channel {number}
     * @param value {number}
     */
    setNRPFine(channel, value)
    {
        this.midiChannels[channel].NRPFine = value;
        this.midiChannels[channel].dataEntryState = dataEntryStates.NRPFine;
    }

    /**
     * @param channel {number}
     * @param semitones {number}
     */
    setPitchBendRange(channel, semitones)
    {
        this.midiChannels[channel].channelPitchBendRange = semitones;
        console.log(`%cChannel ${channel + 1} bend range. Semitones: %c${semitones}`,
            consoleColors.info,
            consoleColors.value);
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange, this.midiChannels[channel].channelPitchBendRange << 7]
        });
    }

    /**
     * Executes a data entry for an NRP for a sc88pro NRP (because touhou yes) and RPN tuning
     * @param channel {number}
     * @param dataValue {number} dataEntryCoarse MSB
     */
    dataEntryCoarse(channel, dataValue)
    {
        let addDefaultVibrato = () =>
        {
            if(this.midiChannels[channel].vibrato.delay === 0 && this.midiChannels[channel].vibrato.rate === 0 && this.midiChannels[channel].vibrato.depth === 0)
            {
                this.midiChannels[channel].vibrato.depth = 50;
                this.midiChannels[channel].vibrato.rate = 8;
                this.midiChannels[channel].vibrato.delay = 0.6;
            }
        }

        switch(this.midiChannels[channel].dataEntryState)
        {
            default:
            case dataEntryStates.Idle:
                break;

            //https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
            case dataEntryStates.NRPFine:
                switch(this.midiChannels[channel].NRPCoarse)
                {
                    default:
                        break;

                    case 1:
                        switch(this.midiChannels[channel].NRPFine)
                        {
                            default:
                                break;

                            // vibrato rate
                            case 8:
                                if(this.midiChannels[channel].lockVibrato)
                                {
                                    return;
                                }
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.midiChannels[channel].vibrato.rate = (dataValue / 64) * 8;
                                console.log(`%cVibrato rate for channel %c${channel + 1}%c is now set to %c${this.midiChannels[channel].vibrato.rate}%cHz.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    channelNumber: channel,
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this.midiChannels[channel].vibrato
                                });
                                break;

                            // vibrato depth
                            case 9:
                                if(this.midiChannels[channel].lockVibrato)
                                {
                                    return;
                                }
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.midiChannels[channel].vibrato.depth = dataValue / 2;
                                console.log(`%cVibrato depth for %c${channel + 1}%c is now set to %c${this.midiChannels[channel].vibrato.depth} %ccents range of detune.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    channelNumber: channel,
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this.midiChannels[channel].vibrato
                                });
                                break;

                            // vibrato delay
                            case 10:
                                if(this.midiChannels[channel].lockVibrato)
                                {
                                    return;
                                }
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.midiChannels[channel].vibrato.delay = (dataValue / 64) / 3;
                                console.log(`%cVibrato delay for %c${channel}%c is now set to %c${this.midiChannels[channel].vibrato.delay} %cseconds.`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info);

                                this.post({
                                    channelNumber: channel,
                                    messageType: workletMessageType.setChannelVibrato,
                                    messageData: this.midiChannels[channel].vibrato
                                });
                                break;
                        }
                        break;
                }
                break;

            case dataEntryStates.RPCoarse:
            case dataEntryStates.RPFine:
                switch(this.midiChannels[channel].RPValue)
                {
                    default:
                        break;

                    // pitch bend range
                    case 0x0000:
                        this.setPitchBendRange(channel, dataValue);
                        break;

                    // coarse tuning
                    case 0x0002:
                        // semitones
                        this.setChannelTuning(channel, dataValue - 64);
                        break;

                    case 0x3FFF:
                        this.resetParameters(channel);
                        break;

                }

        }
    }

    /**
     * Sets the channel's tuning
     * @param channel {number}
     * @param semitones {number}
     */
    setChannelTuning(channel, semitones)
    {
        this.midiChannels[channel].channelTuningSemitones = semitones;
        console.log(`%cChannel ${channel + 1} tuning. Semitones: %c${semitones}`,
            consoleColors.info,
            consoleColors.value);
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.channelTuning, (this.midiChannels[channel].channelTuningSemitones) * 100]
        });
    }

    /**
     * stops all notes on all channels
     * @param force {boolean}
     */
    stopAllChannels(force = false)
    {
        for (let i = 0; i < this.channelsAmount; i++) {
            this.stopAll(i, force);
        }
    }

    /**
     * @param channel {number}
     * @param force {boolean}
     */
    stopAll(channel, force=false)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.stopAll,
            messageData: force ? 1 : 0
        });
    }

    /**
     * Transposes all channels by given amount of semitones
     * @param semitones {number} Can be float
     * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
     */
    transposeAll(semitones, force=false)
    {
        for (let i = 0; i < this.channelsAmount; i++) {
            this.transposeChannel(i, semitones, force);
        }
    }

    /**
     * Transposes the channel by given amount of semitones
     * @param channel {number}
     * @param semitones {number} Can be float
     * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
     */
    transposeChannel(channel, semitones, force=false)
    {
        if(this.midiChannels[channel].percussionChannel && !force)
        {
            return;
        }
        this.midiChannels[channel].channelTranspose = semitones;
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.channelTranspose, this.midiChannels[channel].channelTranspose * 100]
        });
    }

    /**
     * @param channel {number}
     */
    resetControllers(channel)
    {

        /**
         * @type {{depth: number, delay: number, rate: number}}
         * @private
         */
        this.midiChannels[channel].vibrato = {depth: 0, rate: 0, delay: 0};
        this.midiChannels[channel].pitchBend = 8192;
        this.midiChannels[channel].channelPitchBendRange = 2;
        /**
         * get excluded (locked) cc numbers as locked ccs are unaffected by reset
         * @type {number[]}
          */
        const excludedCCs = this.midiChannels[channel].lockedControllers.reduce((lockedCCs, cc, ccNum) => {
            if(cc)
            {
                lockedCCs.push(ccNum);
            }
            return lockedCCs;
        }, []);
        this.resetParameters(channel);
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.ccReset,
            messageData: excludedCCs
        });
    }

    /**
     * @param channel {number}
     */
    resetParameters(channel)
    {
        /**
         * @type {number}
         */
        this.midiChannels[channel].NRPCoarse = 0;
        /**
         * @type {number}
         */
        this.midiChannels[channel].NRPFine = 0;
        /**
         * @type {number}
         */
        this.midiChannels[channel].RPValue = 0;
        /**
         * @type {string}
         */
        this.midiChannels[channel].dataEntryState = dataEntryStates.Idle;
    }

    resetSamples()
    {
        this.post({
            channelNumber: 0,
            messageType: workletMessageType.clearCache,
            messageData: undefined
        });
        clearSamplesList();
        for (let channel of this.midiChannels) {
            channel.cachedWorkletVoices = [];
            for (let i = 0; i < 128; i++) {
                channel.cachedWorkletVoices.push([]);
            }
        }

    }
}