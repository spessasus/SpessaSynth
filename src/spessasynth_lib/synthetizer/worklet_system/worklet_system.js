import { Preset } from '../../soundfont/chunk/presets.js'
import { consoleColors } from '../../utils/other.js'
import { modulatorSources } from '../../soundfont/chunk/modulators.js'
import { midiControllers } from '../../midi_parser/midi_message.js'
import { clearSamplesList, getWorkletVoices } from './worklet_utilities/worklet_voice.js'
import { DEFAULT_PERCUSSION } from '../synthetizer.js'
import { returnMessageType, workletMessageType } from './worklet_utilities/worklet_message.js'
import { customControllers, NON_CC_INDEX_OFFSET } from './worklet_utilities/worklet_processor_channel.js'

/**
 * worklet_system.js
 * purpose: manages the worklet system and communicates with worklet_processor.js
 */

export const WORKLET_PROCESSOR_NAME = "spessasynth-worklet-system";

export const WORKLET_SYSTEM_REVERB_DIVIDER = 1000;
export const WORKLET_SYSTEM_CHORUS_DIVIDER = 500;

const dataEntryStates = {
    Idle: 0,
    RPCoarse: 1,
    RPFine: 2,
    NRPCoarse: 3,
    NRPFine: 4,
    DataCoarse: 5,
    DataFine: 6
};

/**
 * @typedef {{
 *     preset: Preset,
 *     vibrato: {depth: number, delay: number, rate: number},
 *     bank: number,
 *     pitchBend: number,
 *     channelPitchBendRange: number,
 *     channelTuningCents: number
 *     channelTranspose: number, // In semitones, does not get affected by resetControllers
 *     channelModulationDepthCents: number,
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
 *     velocityAddition: number
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
     * @param eventHandler {EventHandler} the event handler to call events when called from the internal sequencer
     * @param soundfont {SoundFont2}
     */
    constructor(targetNode,
                reverbNode,
                chorusNode,
                defaultPreset,
                percussionPreset,
                channelsAmount,
                eventHandler,
                soundfont) {

        // set the constants
        this.ctx = targetNode.context;
        this.outputNode = targetNode;
        this.percussionPreset = percussionPreset;
        this.eventHandler = eventHandler;
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
                midiChannels: this._outputsAmount,
                soundfont: soundfont
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
        this.worklet.port.onmessage = e => this.handleMessage(e.data);

        this.worklet.connect(reverbNode, 0);
        this.worklet.connect(chorusNode, 1);

        // connect all outputs to the output node
        for (let i = 2; i < channelsAmount + 2; i++) {
            this.worklet.connect(this.outputNode, i);
        }
    }

    /**
     * @param channel {number}
     * @param isDrum {boolean}
     */
    setDrums(channel, isDrum)
    {
        this.post({
            messageType: workletMessageType.setDrums,
            messageData: isDrum
        });
    }

    /**
     * @param dataArray {number[]}
     */
    systemExclusive(dataArray)
    {
        this.post({
            messageType: workletMessageType.systemExclusive,
            messageData: dataArray
        })
    }

    /**
     * Handles the messages received from the worklet
     * @param message {WorkletReturnMessage}
     */
    handleMessage(message)
    {
        const messageData = message.messageData;
        switch (message.messageType)
        {
            case returnMessageType.reportedVoicesAmount:
                /**
                 * @type {number[]}
                 */
                const channelVoiceAmounts =  messageData;

                // apply the voices amount to every channel and update total
                let totalAmount = 0;
                for (let i = 0; i < this.channelsAmount; i++) {
                    this.midiChannels[i].voicesAmount = channelVoiceAmounts[i];
                    totalAmount += channelVoiceAmounts[i];
                }
                this.voicesAmount = totalAmount;
                break;

            case returnMessageType.eventCall:
                this.eventHandler.callEvent(messageData.eventName, messageData.eventData);
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
            channelTuningCents: 0,
            channelTranspose: 0,
            channelModulationDepthCents: 50,
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

            voicesAmount: 0,
            velocityAddition: 0,
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

    debugMessage()
    {
        console.debug(this);
        this.post({
            channelNumber: 0,
            messageType: workletMessageType.debugMessage,
            messageData: undefined
        });
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
                break;

            case midiControllers.lsbForControl6DataEntry:
                this.dataEntryFine(channel, val);
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
                messageType: workletMessageType.customcCcChange,
                messageData: [customControllers.channelTranspose, 0]
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

        velocity += this.midiChannels[channel].velocityAddition;
        if(velocity > 127)
        {
            velocity = 127;
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
        console.info(`%cChannel ${channel} bend range. Semitones: %c${semitones}`,
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

            // https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
            // http://hummer.stanford.edu/sig/doc/classes/MidiOutput/rpn.html
            case dataEntryStates.NRPFine:
                switch(this.midiChannels[channel].NRPCoarse)
                {
                    default:
                        if(dataValue === 64)
                        {
                            // default value
                            return;
                        }
                        console.info(
                            `%cUnrecognized NRPN for %c${channel}%c: %c(0x${this.midiChannels[channel].NRPCoarse.toString(16).toUpperCase()} 0x${this.midiChannels[channel].NRPFine.toString(16).toUpperCase()})%c data value: %c${dataValue}`,
                            consoleColors.warn,
                            consoleColors.recognized,
                            consoleColors.warn,
                            consoleColors.unrecognized,
                            consoleColors.warn,
                            consoleColors.value);
                        break;

                    case 0x01:
                        switch(this.midiChannels[channel].NRPFine)
                        {
                            default:
                                if(dataValue === 64)
                                {
                                    // default value
                                    return;
                                }
                                console.info(
                                    `%cUnrecognized NRPN for %c${channel}%c: %c(0x${this.midiChannels[channel].NRPCoarse.toString(16)} 0x${this.midiChannels[channel].NRPFine.toString(16)})%c data value: %c${dataValue}`,
                                    consoleColors.warn,
                                    consoleColors.recognized,
                                    consoleColors.warn,
                                    consoleColors.unrecognized,
                                    consoleColors.warn,
                                    consoleColors.value);
                                break;

                            // vibrato rate
                            case 0x08:
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
                                console.info(`%cVibrato rate for channel %c${channel}%c is now set to %c${this.midiChannels[channel].vibrato.rate}%cHz.`,
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
                            case 0x09:
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
                                console.info(`%cVibrato depth for %c${channel}%c is now set to %c${this.midiChannels[channel].vibrato.depth}%c cents range of detune.`,
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
                            case 0x0A:
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
                                console.info(`%cVibrato delay for %c${channel}%c is now set to %c${this.midiChannels[channel].vibrato.delay}%c seconds.`,
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

                            // filter cutoff
                            case 0x20:
                                // affect the "brightness" controller as we have a default modulator that controls it
                                const ccValue = dataValue;
                                this.controllerChange(channel, midiControllers.brightness, dataValue)
                                console.info(`%cFilter cutoff for %c${channel}%c is now set to %c${ccValue}`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value);
                        }
                        break;

                    // drum reverb
                    case 0x1D:
                        if(!this.midiChannels[channel].percussionChannel)
                        {
                            return;
                        }
                        const reverb = dataValue;
                        this.controllerChange(channel, midiControllers.effects1Depth, reverb);
                        console.info(
                            `%cGS Drum reverb for %c${channel}%c: %c${reverb}`,
                            consoleColors.info,
                            consoleColors.recognized,
                            consoleColors.info,
                            consoleColors.value);
                        break;

                    // drum chorus
                    case 0x1E:
                        if(!this.midiChannels[channel].percussionChannel)
                        {
                            return;
                        }
                        const chorus = dataValue;
                        this.controllerChange(channel, midiControllers.effects3Depth, chorus);
                        console.info(
                            `%cGS Drum chorus for %c${channel}%c: %c${chorus}`,
                            consoleColors.info,
                            consoleColors.recognized,
                            consoleColors.info,
                            consoleColors.value);
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
                        this.setChannelTuning(channel, (dataValue - 64) * 100);
                        break;

                    // fine tuning
                    case 0x0001:
                        // note: this will not work properly unless the lsb is sent!
                        // here we store the raw value to then adjust in fine
                        this.setChannelTuning(channel, (dataValue - 64));
                        break;

                    // modulation depth
                    case 0x0005:
                        this.setModulationDepth(channel, dataValue * 100);
                        break

                    case 0x3FFF:
                        this.resetParameters(channel);
                        break;

                }

        }
    }

    /**
     * Executes a data entry for an RPN tuning
     * @param channel {number}
     * @param dataValue {number} dataEntry LSB
     */
    dataEntryFine(channel, dataValue)
    {
        switch (this.midiChannels[channel].dataEntryState)
        {
            default:
                break;

            case dataEntryStates.RPCoarse:
            case dataEntryStates.RPFine:
                switch(this.midiChannels[channel].RPValue)
                {
                    default:
                        break;

                    // pitch bend range fine tune is not supported in the SoundFont2 format. (pitchbend range is in semitones rather than cents)
                    case 0x0000:
                        break;

                    // fine tuning
                    case 0x0001:
                        // grab the data and shift
                        const coarse = this.midiChannels[channel].channelTuningCents;
                        const finalTuning = (coarse << 7) | dataValue;
                        this.setChannelTuning(channel, finalTuning * 0.0122); // multiply by 8192 / 100 (cent increment)
                        break;

                    // modulation depth
                    case 0x0005:

                        this.setModulationDepth(channel, this.midiChannels[channel].channelModulationDepthCents + (dataValue / 128) * 100);
                        break

                    case 0x3FFF:
                        this.resetParameters(channel);
                        break;

                }

        }
    }

    /**
     * @param volume {number} 0-1
     */
    setMainVolume(volume)
    {
        this.post({
            channelNumber: -1,
            messageType: workletMessageType.setMainVolume,
            messageData: volume
        });
    }

    /**
     * @param pan {number} 0-1
     */
    setMasterPan(pan)
    {
        this.post({
            channelNumber: -1,
            messageType: workletMessageType.setMasterPan,
            messageData: pan
        });
    }

    /**
     * Sets the channel's tuning
     * @param channel {number}
     * @param cents {number}
     */
    setChannelTuning(channel, cents)
    {
        cents = Math.round(cents);
        this.midiChannels[channel].channelTuningCents = cents;
        console.info(`%cChannel ${channel} tuning. Cents: %c${cents}`,
            consoleColors.info,
            consoleColors.value);
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.customcCcChange,
            messageData: [customControllers.channelTuning, this.midiChannels[channel].channelTuningCents]
        });
    }

    /**
     * Sets the channel's mod depth
     * @param channel {number}
     * @param cents {number}
     */
    setModulationDepth(channel, cents)
    {
        cents = Math.round(cents);
        this.midiChannels[channel].channelModulationDepthCents = cents;
        console.info(`%cChannel ${channel} modulation depth. Cents: %c${cents}`,
            consoleColors.info,
            consoleColors.value);
        /* ==============
            IMPORTANT
            here we convert cents into a multiplier.
            midi spec assumes the default is 50 cents,
            but it might be different for the soundfont
            so we create a multiplier by divinging cents by 50.
            for example, if we want 100 cents, then multiplier will be 2,
            which for a preset with depth of 50 will create 100.
         ================*/
        const depthMultiplier = cents / 50;
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.customcCcChange,
            messageData: [customControllers.modulationMultiplier, depthMultiplier]
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
            messageType: workletMessageType.customcCcChange,
            messageData: [customControllers.channelTranspose, this.midiChannels[channel].channelTranspose * 100]
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
        this.midiChannels[channel].channelTuningCents = 0;
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