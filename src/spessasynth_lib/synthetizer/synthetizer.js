import { IndexedByteArray } from '../utils/indexed_array.js'
import { consoleColors } from '../utils/other.js'
import { getEvent, messageTypes, midiControllers } from '../midi_parser/midi_message.js'
import { EventHandler } from './synth_event_handler.js'
import { FancyChorus } from './audio_effects/fancy_chorus.js'
import { getReverbProcessor } from './audio_effects/reverb.js'
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION, masterParameterType,
    returnMessageType,
    workletMessageType,
} from './worklet_system/message_protocol/worklet_message.js'
import { SpessaSynthInfo, SpessaSynthWarn } from '../utils/loggin.js'
import { DEFAULT_EFFECTS_CONFIG } from './audio_effects/effects_config.js'


/**
 * synthesizer.js
 * purpose: responds to midi messages and called functions, managing the channels and passing the messages to them
 */

export const WORKLET_PROCESSOR_NAME = "spessasynth-worklet-system";

export const VOICE_CAP = 450;

export const DEFAULT_PERCUSSION = 9;
export const MIDI_CHANNEL_COUNT = 16;
export const DEFAULT_SYNTH_MODE = "gs";

export class Synthetizer {
    /**
     * Creates a new instance of the SpessaSynth synthesizer
     * @param targetNode {AudioNode}
     * @param soundFontBuffer {ArrayBuffer} the soundfont file array buffer
     * @param enableEventSystem {boolean} enables the event system. Defaults to true
     * @param startRenderingData {{
     *          parsedMIDI: MIDI,
     *          snapshot: SynthesizerSnapshot
     *      }} if set, starts playing this immediately and restores the values
     * @param effectsConfig {EffectsConfig} optional configuration for the audio effects.
     */
     constructor(targetNode,
                 soundFontBuffer,
                 enableEventSystem = true,
                 startRenderingData = undefined,
                 effectsConfig = DEFAULT_EFFECTS_CONFIG) {
        SpessaSynthInfo("%cInitializing SpessaSynth synthesizer...", consoleColors.info);
        this.context = targetNode.context;

        /**
         * Allows to set up custom event listeners for the synthesizer
         * @type {EventHandler}
         */
        this.eventHandler = new EventHandler();

        this._voiceCap = VOICE_CAP;

        /**
         * the new channels will have their audio sent to the moduled output by this constant.
         * what does that mean? e.g. if outputsAmount is 16, then channel's 16 audio will be sent to channel 0
         * @type {number}
         * @private
         */
        this._outputsAmount = MIDI_CHANNEL_COUNT;

        /**
         * the amount of midi channels
         * @type {number}
         */
        this.channelsAmount = this._outputsAmount;

        /**
         * Indicates if the synth is fully ready
         * @type {Promise<void>}
         */
        this.isReady = new Promise(resolve => this._resolveReady = resolve);


        /**
         * individual channel voices amount
         * @type {ChannelProperty[]}
         */
        this.channelProperties = [];
        for (let i = 0; i < this.channelsAmount; i++) {
            this.addNewChannel(false);
        }
        this.channelProperties[DEFAULT_PERCUSSION].isDrum = true;
        this._voicesAmount = 0;

        /**
         * For Black MIDI's - forces release time to 50ms
         * @type {boolean}
         */
        this._highPerformanceMode = false;

        // create a worklet processor

        // first two outputs: reverb, chorsu, the others are the channel outputs
        this.worklet = new AudioWorkletNode(this.context, WORKLET_PROCESSOR_NAME, {
            outputChannelCount: Array(this._outputsAmount + 2).fill(2),
            numberOfOutputs: this._outputsAmount + 2,
            processorOptions: {
                midiChannels: this._outputsAmount,
                soundfont: soundFontBuffer,
                enableEventSystem: enableEventSystem,
                startRenderingData: startRenderingData
            }
        });

        /**
         * @typedef {Object} PresetListElement
         * @property {string} presetName
         * @property {number} program
         * @property {number} bank
         *
         * used in "presetlistchange" event
         */

        // worklet sends us some data back
        this.worklet.port.onmessage = e => this.handleMessage(e.data);

        /**
         * @type {function(SynthesizerSnapshot)}
         * @private
         */
        this._snapshotCallback = undefined;

        /**
         * for the worklet sequencer's messages
         * @type {function(WorkletSequencerReturnMessageType, any)}
         */
        this.sequencerCallbackFunction = undefined;

        // add reverb
        if(effectsConfig.reverbEnabled)
        {
            this.reverbProcessor = getReverbProcessor(this.context, effectsConfig.reverbImpulseResponse);
            this.reverbProcessor.connect(targetNode);
            this.worklet.connect(this.reverbProcessor, 0);
        }

        if(effectsConfig.chorusEnabled)
        {
            this.chorusProcessor = new FancyChorus(targetNode, effectsConfig.chorusConfig);
            this.worklet.connect(this.chorusProcessor.input, 1);
        }

        // connect all outputs to the output node
        for (let i = 2; i < this.channelsAmount + 2; i++) {
            this.worklet.connect(targetNode, i);
        }

        // attach newchannel to keep track of channels count
        this.eventHandler.addEvent("newchannel", "synth-new-channel", () => {
            this.channelsAmount++;
        });
    }

    /**
     * The maximum amount of voices allowed at once
     * @returns {number}
     */
    get voiceCap()
    {
        return this._voiceCap;
    }

    /**
     * The maximum amount of voices allowed at once
     * @param value {number}
     */
    set voiceCap(value)
    {
        this.post({
            messageType: workletMessageType.setMasterParameter,
            messageData: [masterParameterType.voicesCap, value]
        })
        this._voiceCap = value;
    }

    /**
     * For Black MIDI's - forces release time to 50ms
     * @param {boolean} value
     */
    set highPerformanceMode(value)
    {
        this._highPerformanceMode = value;

    }

    get highPerformanceMode()
    {
        return this._highPerformanceMode;
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
            case returnMessageType.channelProperties:
                /**
                 * @type {ChannelProperty[]}
                 */
                this.channelProperties = messageData;

                this._voicesAmount = this.channelProperties.reduce((sum, voices) => sum + voices.voicesAmount, 0);
                break;

            case returnMessageType.eventCall:
                this.eventHandler.callEvent(messageData.eventName, messageData.eventData);
                break;

            case returnMessageType.sequencerSpecific:
                if(this.sequencerCallbackFunction)
                {
                    this.sequencerCallbackFunction(messageData.messageType, messageData.messageData);
                }
                break;

            case returnMessageType.synthesizerSnapshot:
                if(this._snapshotCallback)
                {
                    this._snapshotCallback(messageData);
                }
                break;

            case returnMessageType.ready:
                this._resolveReady();
                break;

            case returnMessageType.soundfontError:
                SpessaSynthWarn(new Error(messageData));
                this.eventHandler.callEvent("soundfonterror", messageData);
        }
    }

    /**
     * Gets a complete snapshot of the synthesizer, including controllers
     * @returns {Promise<SynthesizerSnapshot>}
     */
    async getSynthesizerSnapshot()
    {
        return new Promise(resolve => {
            this._snapshotCallback = s => {
                this._snapshotCallback = undefined;
                resolve(s);
            };
            this.post({
                messageType: workletMessageType.requestSynthesizerSnapshot,
                messageData: undefined,
                channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION
            });
        });
    }

    /**
     * Adds a new channel to the synthesizer
     * @param postMessage {boolean} leave at true, set to false only at initialization
     */
    addNewChannel(postMessage = true)
    {
        this.channelProperties.push({
            voicesAmount: 0,
            pitchBend: 0,
            pitchBendRangeSemitones: 0,
            isMuted: false,
            isDrum: false
        });
        if(!postMessage)
        {
            return;
        }
        this.post({
            channelNumber: 0,
            messageType: workletMessageType.addNewChannel,
            messageData: null
        });
    }

    /**
     * @param channel {number}
     * @param value {{delay: number, depth: number, rate: number}}
     */
    setVibrato(channel, value)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.setChannelVibrato,
            messageData: value
        });
    }

    /**
     * Connects the individual audio outputs to the given audio nodes. In the app it's used by the renderer.
     * @param audioNodes {AudioNode[]}
     */
    connectIndividualOutputs(audioNodes)
    {
        if(audioNodes.length !== this._outputsAmount)
        {
            throw new Error(`input nodes amount differs from the system's outputs amount!
            Expected ${this._outputsAmount} got ${audioNodes.length}`);
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
        // rate -1 disables, see worklet_message.js line 9
        // channel -1 is all
        this.setVibrato(ALL_CHANNELS_OR_DIFFERENT_ACTION, {depth: 0, rate: -1, delay: 0});
    }

    /**
     * A message for debugging
     */
    debugMessage()
    {
        SpessaSynthInfo(this);
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
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.noteOn,
            messageData: [midiNote, velocity, enableDebugging]
        });
    }

    /**
     * Stops playing a note
     * @param channel {number} usually 0-15: the channel of the note
     * @param midiNote {number} 0-127 the key number of the note
     * @param force {boolean} instantly kills the note if true
     */
    noteOff(channel, midiNote, force = false) {
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
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.stopAll,
            messageData: force ? 1 : 0
        });

    }

    /**
     * Changes the given controller
     * @param channel {number} usually 0-15: the channel to change the controller
     * @param controllerNumber {number} 0-127 the MIDI CC number
     * @param controllerValue {number} 0-127 the controller value
     * @param force {boolean} forces the controller change, even if it's locked or gm system is set and the cc is bank select
     */
    controllerChange(channel, controllerNumber, controllerValue, force=false)
    {
        controllerValue = Math.floor(controllerValue);
        controllerNumber = Math.floor(controllerNumber);
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.ccChange,
            messageData: [controllerNumber, controllerValue, force]
        });
    }

    /**
     * Resets all controllers (for every channel)
     */
    resetControllers()
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.ccReset,
            messageData: undefined
        })
    }

    /**
     * Applies pressure to a given channel
     * @param channel {number} usually 0-15: the channel to change the controller
     * @param pressure {number} 0-127: the pressure to apply
     */
    channelPressure(channel, pressure)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.channelPressure,
            messageData: pressure
        });
    }

    /**
     * Applies pressure to a given note
     * @param channel {number} usually 0-15: the channel to change the controller
     * @param midiNote {number} 0-127: the MIDI note
     * @param pressure {number} 0-127: the pressure to apply
     */
    polyPressure(channel, midiNote, pressure)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.polyPressure,
            messageData: [midiNote, pressure]
        });
    }

    /**
     * @param data {WorkletMessage}
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
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.pitchWheel,
            messageData: [MSB, LSB],
        });
    }

    /**
     * Transposes the synthetizer's pitch by given semitones amount (percussion channels do not get affected)
     * @param semitones {number} the semitones to transpose by. Can be a floating point number for more precision
     */
    transpose(semitones)
    {
        this.transposeChannel(ALL_CHANNELS_OR_DIFFERENT_ACTION, semitones, false);
    }

    /**
     * Transposes the channel by given amount of semitones
     * @param channel {number} the channel number
     * @param semitones {number} the transposition of the channel, can be a float
     * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
     */
    transposeChannel(channel, semitones, force=false)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.transpose,
            messageData: [semitones, force]
        });
    }

    /**
     * Sets the main volume
     * @param volume {number} 0-1 the volume
     */
    setMainVolume(volume)
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.setMasterParameter,
            messageData: [masterParameterType.mainVolume, volume]
        });
    }

    /**
     * Sets the master stereo panning
     * @param pan {number} -1 to 1, the pan (-1 is left, 0 is midde, 1 is right)
     */
    setMasterPan(pan)
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.setMasterParameter,
            messageData: [masterParameterType.masterPan, pan]
        });
    }

    /**
     * Sets the channel's pitch bend range, in semitones
     * @param channel {number} usually 0-15: the channel to change
     * @param pitchBendRangeSemitones {number} the bend range in semitones
     */
    setPitchBendRange(channel, pitchBendRangeSemitones)
    {
        // set range
        this.controllerChange(channel, midiControllers.RPNMsb, 0);
        this.controllerChange(channel, midiControllers.dataEntryMsb, pitchBendRangeSemitones);

        // reset rpn
        this.controllerChange(channel, midiControllers.RPNMsb, 127);
        this.controllerChange(channel, midiControllers.RPNLsb, 127);
        this.controllerChange(channel, midiControllers.dataEntryMsb, 0);
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
     * @param controllerNumber {number} 0-127 MIDI CC number NOTE: -1 locks the preset
     * @param isLocked {boolean} true if locked, false if unlocked
     */
    lockController(channel, controllerNumber, isLocked)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.lockController,
            messageData: [controllerNumber, isLocked]
        });
    }

    /**
     * Mutes or unmutes the given channel
     * @param channel {number} usually 0-15: the channel to lock
     * @param isMuted {boolean} indicates if the channel is muted
     */
    muteChannel(channel, isMuted)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.muteChannel,
            messageData: isMuted
        });
    }

    /**
     * Reloads the sounfont.
     * @param soundFontBuffer {ArrayBuffer} the new soundfont file array buffer
     * @return {Promise<void>}
     */
    async reloadSoundFont(soundFontBuffer)
    {
        // copy and use transferable
        const bufferCopy = soundFontBuffer.slice(0);
        await new Promise(resolve => {
            this._resolveReady = resolve;
            this.worklet.port.postMessage({
                channelNumber: 0,
                messageType: workletMessageType.reloadSoundFont,
                messageData: bufferCopy
            }, [bufferCopy]);
        });
    }

    /**
     * Sends a MIDI Sysex message to the synthesizer
     * @param messageData {IndexedByteArray} the message's data (excluding the F0 byte, but including the F7 at the end)
     */
    systemExclusive(messageData)
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
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

            case messageTypes.polyPressure:
                this.polyPressure(statusByteData.channel, message[0], message[1]);
                break;

            case messageTypes.channelPressure:
                this.channelPressure(statusByteData.channel, message[1]);
                break;

            case messageTypes.systemExclusive:
                this.systemExclusive(new IndexedByteArray(message.slice(1)));
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