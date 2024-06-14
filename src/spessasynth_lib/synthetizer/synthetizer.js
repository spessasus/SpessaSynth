import { ShiftableByteArray } from '../utils/shiftable_array.js'
import { consoleColors } from '../utils/other.js'
import { getEvent, messageTypes, midiControllers } from '../midi_parser/midi_message.js'
import { EventHandler } from './synth_event_handler.js'
import { FancyChorus } from './audio_effects/fancy_chorus.js'
import { getReverbProcessor } from './audio_effects/reverb.js'
import { returnMessageType, workletMessageType } from './worklet_system/worklet_utilities/worklet_message.js'
import { clearSamplesList, } from './worklet_system/worklet_utilities/worklet_voice.js'
import { customControllers, NON_CC_INDEX_OFFSET } from './worklet_system/worklet_utilities/worklet_processor_channel.js'
import { modulatorSources } from '../soundfont/chunk/modulators.js'

/**
 * synthesizer.js
 * purpose: responds to midi messages and called functions, managing the channels and passing the messages to them
 */

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
 * }} MidiChannel
 */

export const WORKLET_PROCESSOR_NAME = "spessasynth-worklet-system";

const dataEntryStates = {
    Idle: 0,
    RPCoarse: 1,
    RPFine: 2,
    NRPCoarse: 3,
    NRPFine: 4,
    DataCoarse: 5,
    DataFine: 6
};

export const VOICE_CAP = 450;

export const DEFAULT_PERCUSSION = 9;
export const DEFAULT_CHANNEL_COUNT = 16;
export const DEFAULT_SYNTH_MODE = "gs";

export class Synthetizer {
    /**
     * Creates a new instance of the SpessaSynth synthesizer
     * @param targetNode {AudioNode}
     * @param soundFontBuffer {ArrayBuffer} the soundfont file array buffer
     */
     constructor(targetNode, soundFontBuffer) {
        console.info("%cInitializing SpessaSynth synthesizer...", consoleColors.info);
        this.context = targetNode.context;

        /**
         * Allows to set up custom event listeners for the synthesizer
         * @type {EventHandler}
         */
        this.eventHandler = new EventHandler();
        this.reverbProcessor = getReverbProcessor(this.context);
        this.chorusProcessor = new FancyChorus(targetNode);
        this.reverbProcessor.connect(targetNode);

        /**
         * individual channel voices amount
         * @type {number[]}
         */
        this.channelVoicesAmount = Array(DEFAULT_CHANNEL_COUNT).fill(0);
        this._voicesAmount = 0;

        /**
         * For Black MIDI's - forces release time to 50ms
         * @type {boolean}
         */
        this.highPerformanceMode = false;

        /**
         * the new channels will have their audio sent to the moduled output by this constant.
         * what does that mean? e.g. if outputsAmount is 16, then channel's 16 audio will be sent to channel 0
         * @type {number}
         * @private
         */
        this._outputsAmount = DEFAULT_CHANNEL_COUNT;

        /**
         * the amount of midi channels
         * @type {number}
         */
        this.channelsAmount = 0;

        // create a worklet processor

        // first two outputs: reverb, chorsu, the others are the channel outputs
        this.worklet = new AudioWorkletNode(this.context, WORKLET_PROCESSOR_NAME, {
            outputChannelCount: Array(this._outputsAmount + 2).fill(2),
            numberOfOutputs: this._outputsAmount + 2,
            processorOptions: {
                midiChannels: this._outputsAmount,
                soundfont: soundFontBuffer
            }
        });

        /**
         * @type {MidiChannel[]}
         */
        this.midiChannels = [];

        /**
         * @typedef {Object} PresetListElement
         * @property {string} presetName
         * @property {number} program
         * @property {number} bank
         *
         * @type {PresetListElement[]}
         */
        this.presetList = [];

        for (let i = 0; i < this._outputsAmount; i++) {
            this.createNewChannel(false);
        }

        // worklet sends us some data back
        this.worklet.port.onmessage = e => this.handleMessage(e.data);

        this.worklet.connect(this.reverbProcessor, 0);
        this.worklet.connect(this.chorusProcessor.input, 1);

        // connect all outputs to the output node
        for (let i = 2; i < this.channelsAmount + 2; i++) {
            this.worklet.connect(targetNode, i);
        }

        this.requestPresetList();
        console.info("%cSpessaSynth is ready!", consoleColors.recognized);
    }

    /**
     * Handles the messages received from the worklet
     * @param message {WorkletReturnMessage}
     * @private
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
                this.channelVoicesAmount = messageData;

                this._voicesAmount = this.channelVoicesAmount.reduce((sum, voices) => sum + voices, 0);
                break;

            case returnMessageType.eventCall:
                this.eventHandler.callEvent(messageData.eventName, messageData.eventData);
                break;

            case returnMessageType.presetList:
                this.presetList = messageData;
        }
    }

    /**
     * Changes preset
     * @param channel {number}
     * @param preset {Preset}
     * @private
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
     * @private
     * @param sendWorkletMessage {boolean}
     */
    createNewChannel(sendWorkletMessage=true)
    {
        /**
         * @type {MidiChannel}
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

    /**
     * Adds a new channel to the synthesizer
     */
    addNewChannel()
    {
        this.createNewChannel();
        this.eventHandler.callEvent("newchannel", this.midiChannels[this.channelsAmount - 1]);
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

    /*
     * Prevents any further changes to the vibrato via NRPN messages and sets it to disabled
     */
    lockAndResetChannelVibrato()
    {
        for (let i = 0; i < this.channelsAmount; i++) {
            this.midiChannels[i].lockVibrato = false;
            this.setVibrato(i, {depth: 0, rate: 0, delay: 0});
            this.midiChannels[i].lockVibrato = true;
        }
    }

    /**
     * A message for debugging
     */
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
     * Starts playing a note
     * @param channel {number} usually 0-15: the channel to play the note
     * @param midiNote {number} 0-127 the key number of the note
     * @param velocity {number} 0-127 the velocity of the note (generally controls loudness)
     * @param enableDebugging {boolean} set to true to log technical details to console
     */
    noteOn(channel, midiNote, velocity, enableDebugging = false) {
        if (velocity === 0) {
            this.noteOff(channel, midiNote);
            return;
        }

        if((this.highPerformanceMode && this.voicesAmount > 200 && velocity < 40)
        ||
        (this.highPerformanceMode && velocity < 10)
        ||
        (this.midiChannels[channel].isMuted))
        {
            return;
        }

        if(midiNote > 127 || midiNote < 0)
        {
            console.warn(`Received a noteOn for note`, midiNote, "Ignoring.");
            return;
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

        this.post({
            channelNumber: channel,
            messageType: workletMessageType.noteOn,
            messageData: [midiNote, velocity]
        });
    }

    /**
     * Stops playing a note
     * @param channel {number} usually 0-15: the channel of the note
     * @param midiNote {number} 0-127 the key number of the note
     * @param force {boolean} instantly kills the note if true
     */
    noteOff(channel, midiNote, force = false) {
        if(midiNote > 127 || midiNote < 0)
        {
            console.warn(`Received a noteOn for note`, midiNote, "Ignoring.");
            return;
        }

        // if high performance mode, kill notes instead of stopping them
        if(this.highPerformanceMode)
        {
            // if the channel is percussion channel, do not kill the notes
            if(!this.midiChannels[channel].percussionChannel)
            {
                force = true;
            }
        }
        if(force)
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
     * Stops all notes
     * @param force {boolean} if we should instantly kill the note, defaults to false
     */
    stopAll(force=false) {
        console.info("%cStop all received!", consoleColors.info);
        for (let i = 0; i < this.channelsAmount; i++) {
            this.stopAllNotesOnChannel(i, force);
        }
        this.eventHandler.callEvent("stopall", {});
    }

    /**
     * Stops all notes on a specific channel
     * @param channel {number} the channel's number
     * @param force {boolean} if we should instantly kill the note, defaults to false
     */
    stopAllNotesOnChannel(channel, force = false)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.stopAll,
            messageData: force ? 1 : 0
        });
    }

    /**
     * Changes the given controller
     * @param channel {number} usually 0-15: the channel to change the controller
     * @param controllerNumber {number} 0-127 the MIDI CC number
     * @param controllerValue {number} 0-127 the controller value
     */
    controllerChange(channel, controllerNumber, controllerValue)
    {
        if(this.midiChannels[channel].lockedControllers[controllerNumber] === true)
        {
            return;
        }
        switch (controllerNumber) {
            default:
                this.post({
                    channelNumber: channel,
                    messageType: workletMessageType.ccChange,
                    messageData: [controllerNumber, controllerValue << 7]
                });
                break;

            case midiControllers.RPNLsb:
                this.midiChannels[channel].RPValue = this.midiChannels[channel].RPValue << 7 | controllerValue;
                this.midiChannels[channel].dataEntryState = dataEntryStates.RPFine;
                break;

            case midiControllers.RPNMsb:
                this.midiChannels[channel].RPValue = controllerValue;
                this.midiChannels[channel].dataEntryState = dataEntryStates.RPCoarse;
                break;

            case midiControllers.NRPNMsb:
                this.midiChannels[channel].NRPCoarse = controllerValue;
                this.midiChannels[channel].dataEntryState = dataEntryStates.NRPCoarse;
                break;

            case midiControllers.NRPNLsb:
                this.midiChannels[channel].NRPFine = controllerValue;
                this.midiChannels[channel].dataEntryState = dataEntryStates.NRPFine;
                break;

            case midiControllers.dataEntryMsb:
                this.dataEntryCoarse(channel, controllerValue);
                break;

            case midiControllers.lsbForControl6DataEntry:
                this.dataEntryFine(channel, controllerValue);
        }
    }

    /**
     * requests the preset list from the worklet
     * @private
     */
    requestPresetList()
    {
        this.post({
            channelNumber: -1,
            messageType: workletMessageType.getPresetList,
            messageData: undefined
        });
    }

    /**
     * Sets the channel's pitch bend range in semitones
     * @param channel {number} the channel number
     * @param semitones {number} the pitch bend range in semitones
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
     * @private
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
     * @private
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
     * @param channel {number}
     * @private
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

    /**
     * Sets the channel's tuning
     * @param channel {number}
     * @param cents {number}
     * @private
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
     * @private
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
     * Resets the channel's controllers
     * @param channel {number} channel's number
     */
    resetChannelControllers(channel)
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
     * Resets all controllers (for every channel)
     */
    resetControllers()
    {
        console.info("%cResetting all controllers!", consoleColors.info);
        for(let channelNumber = 0; channelNumber < this.channelsAmount; channelNumber++)
        {
            // reset
            this.resetChannelControllers(channelNumber);
            /**
             * @type {MidiChannel}
             **/
            const ch = this.midiChannels[channelNumber];
            if(!ch.lockPreset) {
                ch.bank = 0;
                if (channelNumber % 16 === DEFAULT_PERCUSSION) {
                    this.setPreset(channelNumber, this.percussionPreset);
                    ch.percussionChannel = true;
                    this.eventHandler.callEvent("drumchange", {
                        channel: channelNumber,
                        isDrumChannel: true
                    });
                } else {
                    ch.percussionChannel = false;
                    this.setPreset(channelNumber, this.defaultPreset);
                    this.eventHandler.callEvent("drumchange", {
                        channel: channelNumber,
                        isDrumChannel: false
                    });
                }
            }

            // call all the event listeners
            this.eventHandler.callEvent("programchange", {channel: channelNumber, preset: ch.preset})

            let restoreControllerValueEvent = (ccNum, value) =>
            {
                if(this.midiChannels[channelNumber].lockedControllers[ccNum])
                {
                    // locked, we did not reset it
                    return;
                }
                this.eventHandler.callEvent("controllerchange", {channel: channelNumber, controllerNumber: ccNum, controllerValue: value});
            }

            restoreControllerValueEvent(midiControllers.mainVolume, 100);
            restoreControllerValueEvent(midiControllers.pan, 64);
            restoreControllerValueEvent(midiControllers.expressionController, 127);
            restoreControllerValueEvent(midiControllers.modulationWheel, 0);
            restoreControllerValueEvent(midiControllers.effects3Depth, 0);
            restoreControllerValueEvent(midiControllers.effects1Depth, 40);

            this.eventHandler.callEvent("pitchwheel", {channel: channelNumber, MSB: 64, LSB: 0})
        }
        this.system = DEFAULT_SYNTH_MODE;
    }

    /**
     * @param data {WorkletMessage}
     * @private
     */
    post(data)
    {
        this.worklet.port.postMessage(data);
    }

    /**
     * Sets the pitch of the given channel
     * @param channel {number} usually 0-15: the channel to change pitch
     * @param MSB {number} SECOND byte of the MIDI pitchWheel message
     * @param LSB {number} FIRST byte of the MIDI pitchWheel message
     */
    pitchWheel(channel, MSB, LSB)
    {
        // bend all the notes
        this.midiChannels[channel].pitchBend = (LSB | (MSB << 7)) ;
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.ccChange,
            messageData: [NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel, this.midiChannels[channel].pitchBend]
        });

        this.eventHandler.callEvent("pitchwheel", {
            channel: channel,
            MSB: MSB,
            LSB: LSB
        });
    }

    /**
     * Transposes the synthetizer's pitch by given semitones amount (percussion channels do not get affected)
     * @param semitones {number} the semitones to transpose by. Can be a floating point number for more precision
     */
    transpose(semitones)
    {
        for (let i = 0; i < this.channelsAmount; i++) {
            this.transposeChannel(i, semitones, false);
        }
        this.transposition = semitones;
    }

    /**
     * Transposes the channel by given amount of semitones
     * @param channel {number} the channel number
     * @param semitones {number} the transposition of the channel, can be a float
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
     * Sets the main volume
     * @param volume {number} 0-1 the volume
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
     * Sets the master stereo panning
     * @param pan {number} -1 to 1, the pan (-1 is left, 0 is midde, 1 is right)
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
     * Changes the patch for a given channel
     * @param channel {number} usually 0-15: the channel to change
     * @param programNumber {number} 0-127 the MIDI patch number
     * @param userChange {boolean} indicates if the program change has been called by user. defaults to false
     */
    programChange(channel, programNumber, userChange=false)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.programChange,
            messageData: [programNumber, userChange]
        })
    }

    /**
     * Causes the given midi channel to ignore controller messages for the given controller number
     * @param channel {number} usually 0-15: the channel to lock
     * @param controllerNumber {number} 0-127 MIDI CC number
     * @param isLocked {boolean} true if locked, false if unlocked
     */
    lockController(channel, controllerNumber, isLocked)
    {
        this.midiChannels[channel].lockedControllers[controllerNumber] = isLocked;
    }

    /**
     * Mutes or unmutes the given channel
     * @param channel {number} usually 0-15: the channel to lock
     * @param isMuted {boolean} indicates if the channel is muted
     */
    muteChannel(channel, isMuted)
    {
        this.midiChannels[channel].isMuted = isMuted;
        this.stopAllNotesOnChannel(channel, true);
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.muteChannel,
            messageData: isMuted
        });
        this.eventHandler.callEvent("mutechannel", {
            channel: channel,
            isMuted: isMuted
        });
    }

    /**
     * Reloads the sounfont.
     * @param soundFontBuffer {ArrayBuffer} the new soundfont file array buffer
     */
    reloadSoundFont(soundFontBuffer)
    {
        this.stopAll(true);
        this.post({
            channelNumber: 0,
            messageType: workletMessageType.reloadSoundFont,
            messageData: soundFontBuffer
        });

        // check if the system supports clearing samples (only worklet does)
        if(this.resetSamples)
        {
            this.resetSamples();
        }
        for(let i = 0; i < this.channelsAmount; i++)
        {
            this.midiChannels[i].lockPreset = false;
            this.programChange(i, this.midiChannels[i].preset.program);
        }
    }

    /**
     * @private
     */
    resetSamples()
    {

        clearSamplesList();
        for (let channel of this.midiChannels) {
            channel.cachedWorkletVoices = [];
            for (let i = 0; i < 128; i++) {
                channel.cachedWorkletVoices.push([]);
            }
        }

    }

    /**
     * Sends a MIDI Sysex message to the synthesizer
     * @param messageData {ShiftableByteArray} the message's data (excluding the F0 byte, but including the F7 at the end)
     */
    systemExclusive(messageData)
    {
        this.post({
            channelNumber: -1,
            messageType: workletMessageType.systemExclusive,
            messageData: Array.from(messageData)
        });
    }

    /**
     * Toggles drums on a given channel
     * @param channel {number}
     * @param isDrum {boolean}
     */
    setDrums(channel, isDrum)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.setDrums,
            messageData: isDrum
        });
    }

    /**
     * sends a raw MIDI message to the synthesizer
     * @param message {ArrayLike<number>} the midi message, each number is a byte
     */
    sendMessage(message)
    {
        // discard as soon as possible if high perf
        const statusByteData = getEvent(message[0]);


        // process the event
        switch (statusByteData.status)
        {
            case messageTypes.noteOn:
                const velocity = message[2];
                if(velocity > 0) {
                    this.noteOn(statusByteData.channel, message[1], velocity);
                }
                else
                {
                    this.noteOff(statusByteData.channel, message[1]);
                }
                break;

            case messageTypes.noteOff:
                this.noteOff(statusByteData.channel, message[1]);
                break;

            case messageTypes.pitchBend:
                this.pitchWheel(statusByteData.channel, message[2], message[1]);
                break;

            case messageTypes.controllerChange:
                this.controllerChange(statusByteData.channel, message[1], message[2]);
                break;

            case messageTypes.programChange:
                this.programChange(statusByteData.channel, message[1]);
                break;

            case messageTypes.systemExclusive:
                this.systemExclusive(new ShiftableByteArray(message.slice(1)));
                break;

            case messageTypes.reset:
                this.stopAll(true);
                this.resetControllers();
                break;

            default:
                break;
        }
    }

    /**
     * @returns {number} the audioContext's current time
     */
    get currentTime()
    {
        return this.context.currentTime;
    }

    /**
     * @returns {number} the current amount of voices playing
     */
    get voicesAmount()
    {
        return this._voicesAmount;
    }

    reverbateEverythingBecauseWhyNot()
    {
        for (let i = 0; i < this.channelsAmount; i++) {
            this.controllerChange(i, midiControllers.effects1Depth, 127);
        }
        return "That's the spirit!";
    }
}