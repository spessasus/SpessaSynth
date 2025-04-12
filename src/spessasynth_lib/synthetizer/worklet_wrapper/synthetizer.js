import { consoleColors } from "../../utils/other.js";
import { messageTypes, midiControllers } from "../../midi/midi_message.js";
import { EventHandler } from "./synth_event_handler.js";
import { FancyChorus } from "../audio_effects/fancy_chorus.js";
import { getReverbProcessor } from "../audio_effects/reverb.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    masterParameterType,
    returnMessageType,
    workletMessageType
} from "../audio_engine/message_protocol/worklet_message.js";
import { SpessaSynthInfo, SpessaSynthWarn } from "../../utils/loggin.js";
import { DEFAULT_SYNTH_CONFIG } from "../audio_effects/effects_config.js";
import { SoundfontManager } from "./synth_soundfont_manager.js";
import { WorkletKeyModifierManagerWrapper } from "./key_modifier_manager.js";
import { channelConfiguration } from "../audio_engine/engine_components/controller_tables.js";
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE, MIDI_CHANNEL_COUNT, VOICE_CAP } from "../synth_constants.js";
import { BasicMIDI } from "../../midi/basic_midi.js";
import { fillWithDefaults } from "../../utils/fill_with_defaults.js";
import { DEFAULT_SEQUENCER_OPTIONS } from "../../sequencer/worklet_wrapper/default_sequencer_options.js";
import { WORKLET_PROCESSOR_NAME } from "./worklet_url.js";


/**
 * synthesizer.js
 * purpose: responds to midi messages and called functions, managing the channels and passing the messages to them
 */

/**
 * @typedef {Object} SynthMethodOptions
 * @property {number} time - the audio context time when the event should execute, in seconds.
 */

/**
 * @type {SynthMethodOptions}
 */
const DEFAULT_SYNTH_METHOD_OPTIONS = {
    time: 0
};


// the "remote controller" of the worklet processor in the audio thread from the main thread
export class Synthetizer
{
    
    /**
     * Allows setting up custom event listeners for the synthesizer
     * @type {EventHandler}
     */
    eventHandler = new EventHandler();
    
    /**
     * Synthesizer's parent AudioContext instance
     * @type {BaseAudioContext}
     */
    context;
    
    /**
     * Synthesizer's output node
     * @type {AudioNode}
     */
    targetNode;
    /**
     * @type {boolean}
     * @private
     */
    _destroyed = false;
    
    /**
     * the new channels will have their audio sent to the moduled output by this constant.
     * what does that mean?
     * e.g., if outputsAmount is 16, then channel's 16 audio data will be sent to channel 0
     * @type {number}
     * @private
     */
    _outputsAmount = MIDI_CHANNEL_COUNT;
    
    /**
     * The current number of MIDI channels the synthesizer has
     * @type {number}
     */
    channelsAmount = this._outputsAmount;
    
    /**
     * Synth's current channel properties
     * @type {ChannelProperty[]}
     */
    channelProperties = [];
    
    /**
     * The current preset list
     * @type {{presetName: string, bank: number, program: number}[]}
     */
    presetList = [];
    
    /**
     * Creates a new instance of the SpessaSynth synthesizer.
     * @param targetNode {AudioNode}
     * @param soundFontBuffer {ArrayBuffer} the soundfont file array buffer.
     * @param enableEventSystem {boolean} enables the event system.
     * Defaults to true.
     * Disable only when you're rendering audio offline with no actions from the main thread
     * @param startRenderingData {StartRenderingDataConfig} if it is set,
     * starts playing this immediately and restores the values.
     * @param synthConfig {SynthConfig} optional configuration for the synthesizer.
     */
    constructor(targetNode,
                soundFontBuffer,
                enableEventSystem = true,
                startRenderingData = undefined,
                synthConfig = DEFAULT_SYNTH_CONFIG)
    {
        SpessaSynthInfo("%cInitializing SpessaSynth synthesizer...", consoleColors.info);
        this.context = targetNode.context;
        this.targetNode = targetNode;
        
        // ensure default values for options
        enableEventSystem = enableEventSystem ?? true;
        synthConfig = synthConfig ?? DEFAULT_SYNTH_CONFIG;
        
        // initialize internal promise resolution
        this._resolveWhenReady = undefined;
        this.isReady = new Promise(resolve => this._resolveWhenReady = resolve);
        
        // create initial channels
        for (let i = 0; i < this.channelsAmount; i++)
        {
            this.addNewChannel(false);
        }
        this.channelProperties[DEFAULT_PERCUSSION].isDrum = true;
        
        // determine output mode and channel configuration
        const oneOutputMode = startRenderingData?.oneOutput ?? false;
        let processorChannelCount = Array(this._outputsAmount + 2).fill(2);
        let processorOutputsCount = this._outputsAmount + 2;
        if (oneOutputMode)
        {
            processorOutputsCount = 1;
            processorChannelCount = [32];
        }
        
        // initialize effects configuration
        this.effectsConfig = fillWithDefaults(synthConfig, DEFAULT_SYNTH_CONFIG);
        
        // process start rendering data
        const sequencerRenderingData = {};
        if (startRenderingData?.parsedMIDI !== undefined)
        {
            sequencerRenderingData.parsedMIDI = BasicMIDI.copyFrom(startRenderingData.parsedMIDI);
            if (startRenderingData?.snapshot)
            {
                const snapshot = startRenderingData.snapshot;
                if (snapshot?.effectsConfig !== undefined)
                {
                    // overwrite effects configuration with the snapshot
                    this.effectsConfig = fillWithDefaults(snapshot.effectsConfig, DEFAULT_SYNTH_CONFIG);
                    // delete effects config as it cannot be cloned to the worklet (and does not need to be)
                    delete snapshot.effectsConfig;
                }
                sequencerRenderingData.snapshot = snapshot;
            }
            if (startRenderingData?.sequencerOptions)
            {
                // sequencer options
                sequencerRenderingData.sequencerOptions = fillWithDefaults(
                    startRenderingData.sequencerOptions,
                    DEFAULT_SEQUENCER_OPTIONS
                );
            }
            
            sequencerRenderingData.loopCount = startRenderingData?.loopCount ?? 0;
        }
        
        // create the audio worklet node
        try
        {
            let workletConstructor = (synthConfig?.audioNodeCreators?.worklet) ??
                ((context, name, options) =>
                {
                    return new AudioWorkletNode(context, name, options);
                });
            this.worklet = workletConstructor(this.context, WORKLET_PROCESSOR_NAME, {
                outputChannelCount: processorChannelCount,
                numberOfOutputs: processorOutputsCount,
                processorOptions: {
                    midiChannels: oneOutputMode ? 1 : this._outputsAmount,
                    soundfont: soundFontBuffer,
                    enableEventSystem: enableEventSystem,
                    startRenderingData: sequencerRenderingData
                }
            });
        }
        catch (e)
        {
            console.error(e);
            throw new Error("Could not create the audioWorklet. Did you forget to addModule()?");
        }
        
        // set up message handling and managers
        this.worklet.port.onmessage = e => this.handleMessage(e.data);
        this.soundfontManager = new SoundfontManager(this);
        this.keyModifierManager = new WorkletKeyModifierManagerWrapper(this);
        this._snapshotCallback = undefined;
        this.sequencerCallbackFunction = undefined;
        
        // connect worklet outputs
        if (oneOutputMode)
        {
            this.worklet.connect(targetNode, 0);
        }
        else
        {
            const reverbOn = this.effectsConfig?.reverbEnabled ?? true;
            const chorusOn = this.effectsConfig?.chorusEnabled ?? true;
            if (reverbOn)
            {
                const proc = getReverbProcessor(this.context, this.effectsConfig.reverbImpulseResponse);
                this.reverbProcessor = proc.conv;
                this.isReady = Promise.all([this.isReady, proc.promise]);
                this.reverbProcessor.connect(targetNode);
                this.worklet.connect(this.reverbProcessor, 0);
            }
            if (chorusOn)
            {
                this.chorusProcessor = new FancyChorus(targetNode, this.effectsConfig.chorusConfig);
                this.worklet.connect(this.chorusProcessor.input, 1);
            }
            for (let i = 2; i < this.channelsAmount + 2; i++)
            {
                this.worklet.connect(targetNode, i);
            }
        }
        
        // attach event handlers
        this.eventHandler.addEvent("newchannel", `synth-new-channel-${Math.random()}`, () =>
        {
            this.channelsAmount++;
        });
        this.eventHandler.addEvent("presetlistchange", `synth-preset-list-change-${Math.random()}`, e =>
        {
            this.presetList = e;
        });
    }
    
    
    /**
     * @type {"gm"|"gm2"|"gs"|"xg"}
     * @private
     */
    _midiSystem = DEFAULT_SYNTH_MODE;
    
    /**
     * The current MIDI system used by the synthesizer
     * @returns {"gm"|"gm2"|"gs"|"xg"}
     */
    get midiSystem()
    {
        return this._midiSystem;
    }
    
    /**
     * The current MIDI system used by the synthesizer
     * @param value {"gm"|"gm2"|"gs"|"xg"}
     */
    set midiSystem(value)
    {
        this._midiSystem = value;
    }
    
    /**
     * current voice amount
     * @type {number}
     * @private
     */
    _voicesAmount = 0;
    
    /**
     * @returns {number} the current number of voices playing.
     */
    get voicesAmount()
    {
        return this._voicesAmount;
    }
    
    /**
     * For Black MIDI's - forces release time to 50 ms
     * @type {boolean}
     */
    _highPerformanceMode = false;
    
    get highPerformanceMode()
    {
        return this._highPerformanceMode;
    }
    
    /**
     * For Black MIDI's - forces release time to 50 ms.
     * @param {boolean} value
     */
    set highPerformanceMode(value)
    {
        this._highPerformanceMode = value;
        this.post({
            messageType: workletMessageType.highPerformanceMode,
            messageData: value
        });
    }
    
    /**
     * @type {number}
     * @private
     */
    _voiceCap = VOICE_CAP;
    
    /**
     * The maximum number of voices allowed at once.
     * @returns {number}
     */
    get voiceCap()
    {
        return this._voiceCap;
    }
    
    /**
     * The maximum number of voices allowed at once.
     * @param value {number}
     */
    set voiceCap(value)
    {
        this._setMasterParam(masterParameterType.voicesCap, value);
        this._voiceCap = value;
    }
    
    /**
     * @returns {number} the audioContext's current time.
     */
    get currentTime()
    {
        return this.context.currentTime;
    }
    
    /**
     * Sets the SpessaSynth's log level.
     * @param enableInfo {boolean} - enable info (verbose)
     * @param enableWarning {boolean} - enable warnings (unrecognized messages)
     * @param enableGroup {boolean} - enable groups (to group a lot of logs)
     * @param enableTable {boolean} - enable table (debug message)
     */
    setLogLevel(enableInfo, enableWarning, enableGroup, enableTable)
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.setLogLevel,
            messageData: [enableInfo, enableWarning, enableGroup, enableTable]
        });
    }
    
    /**
     * @param type {masterParameterType}
     * @param data {any}
     * @private
     */
    _setMasterParam(type, data)
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.setMasterParameter,
            messageData: [type, data]
        });
    }
    
    /**
     * Sets the interpolation type for the synthesizer:
     * 0. - linear
     * 1. - nearest neighbor
     * 2. - cubic
     * @param type {interpolationTypes}
     */
    setInterpolationType(type)
    {
        this._setMasterParam(masterParameterType.interpolationType, type);
    }
    
    /**
     * Handles the messages received from the worklet.
     * @param message {WorkletReturnMessage}
     * @private
     */
    handleMessage(message)
    {
        const messageData = message.messageData;
        switch (message.messageType)
        {
            case returnMessageType.channelPropertyChange:
                /**
                 * @type {number}
                 */
                const channelNumber = messageData[0];
                /**
                 * @type {ChannelProperty}
                 */
                const property = messageData[1];
                
                this.channelProperties[channelNumber] = property;
                
                this._voicesAmount = this.channelProperties.reduce((sum, voices) => sum + voices.voicesAmount, 0);
                break;
            
            case returnMessageType.eventCall:
                this.eventHandler.callEvent(messageData.eventName, messageData.eventData);
                break;
            
            case returnMessageType.sequencerSpecific:
                if (this.sequencerCallbackFunction)
                {
                    this.sequencerCallbackFunction(messageData.messageType, messageData.messageData);
                }
                break;
            
            case returnMessageType.masterParameterChange:
                /**
                 * @type {masterParameterType}
                 */
                const param = messageData[0];
                const value = messageData[1];
                switch (param)
                {
                    default:
                        break;
                    
                    case masterParameterType.midiSystem:
                        this._midiSystem = value;
                        break;
                }
                break;
            
            case returnMessageType.synthesizerSnapshot:
                if (this._snapshotCallback)
                {
                    this._snapshotCallback(messageData);
                }
                break;
            
            case returnMessageType.isFullyInitialized:
                this._resolveWhenReady();
                break;
            
            case returnMessageType.soundfontError:
                SpessaSynthWarn(new Error(messageData));
                this.eventHandler.callEvent("soundfonterror", messageData);
                break;
        }
    }
    
    /**
     * Gets a complete snapshot of the synthesizer, including controllers.
     * @returns {Promise<SynthesizerSnapshot>}
     */
    async getSynthesizerSnapshot()
    {
        return new Promise(resolve =>
        {
            this._snapshotCallback = s =>
            {
                this._snapshotCallback = undefined;
                s.effectsConfig = this.effectsConfig;
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
     * Adds a new channel to the synthesizer.
     * @param postMessage {boolean} leave at true, set to false only at initialization.
     */
    addNewChannel(postMessage = true)
    {
        this.channelProperties.push({
            voicesAmount: 0,
            pitchBend: 0,
            pitchBendRangeSemitones: 0,
            isMuted: false,
            isDrum: false,
            transposition: 0,
            program: 0,
            bank: this.channelsAmount % 16 === DEFAULT_PERCUSSION ? 128 : 0
        });
        if (!postMessage)
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
     * Connects the individual audio outputs to the given audio nodes. In the app, it's used by the renderer.
     * @param audioNodes {AudioNode[]}
     */
    connectIndividualOutputs(audioNodes)
    {
        if (audioNodes.length !== this._outputsAmount)
        {
            throw new Error(`input nodes amount differs from the system's outputs amount!
            Expected ${this._outputsAmount} got ${audioNodes.length}`);
        }
        for (let outputNumber = 0; outputNumber < this._outputsAmount; outputNumber++)
        {
            // + 2 because chorus and reverb come first!
            this.worklet.connect(audioNodes[outputNumber], outputNumber + 2);
        }
    }
    
    /**
     * Disconnects the individual audio outputs to the given audio nodes. In the app, it's used by the renderer.
     * @param audioNodes {AudioNode[]}
     */
    disconnectIndividualOutputs(audioNodes)
    {
        if (audioNodes.length !== this._outputsAmount)
        {
            throw new Error(`input nodes amount differs from the system's outputs amount!
            Expected ${this._outputsAmount} got ${audioNodes.length}`);
        }
        for (let outputNumber = 0; outputNumber < this._outputsAmount; outputNumber++)
        {
            // + 2 because chorus and reverb come first!
            this.worklet.disconnect(audioNodes[outputNumber], outputNumber + 2);
        }
    }
    
    /*
     * Disables the GS NRPN parameters like vibrato or drum key tuning.
     */
    disableGSNRPparams()
    {
        // rate -1 disables, see worklet_message.js line 9
        // channel -1 is all
        this.setVibrato(ALL_CHANNELS_OR_DIFFERENT_ACTION, { depth: 0, rate: -1, delay: 0 });
    }
    
    /**
     * A message for debugging.
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
     * sends a raw MIDI message to the synthesizer.
     * @param message {number[]|Uint8Array} the midi message, each number is a byte.
     * @param channelOffset {number} the channel offset of the message.
     * @param eventOptions {SynthMethodOptions} additional options for this command.
     */
    sendMessage(message, channelOffset = 0, eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS)
    {
        this._sendInternal(message, channelOffset, false, eventOptions);
    }
    
    /**
     * @param message {number[]|Uint8Array}
     * @param offset {number}
     * @param force {boolean}
     * @param eventOptions {SynthMethodOptions}
     * @private
     */
    _sendInternal(message, offset, force = false, eventOptions)
    {
        const opts = fillWithDefaults(eventOptions ?? {}, DEFAULT_SYNTH_METHOD_OPTIONS);
        this.post({
            messageType: workletMessageType.midiMessage,
            messageData: [new Uint8Array(message), offset, force, opts]
        });
    }
    
    
    /**
     * Starts playing a note
     * @param channel {number} usually 0-15: the channel to play the note.
     * @param midiNote {number} 0-127 the key number of the note.
     * @param velocity {number} 0-127 the velocity of the note (generally controls loudness).
     * @param eventOptions {SynthMethodOptions} additional options for this command.
     */
    noteOn(channel, midiNote, velocity, eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS)
    {
        const ch = channel % 16;
        const offset = channel - ch;
        midiNote %= 128;
        velocity %= 128;
        // check for legacy "enableDebugging"
        if (eventOptions === true)
        {
            eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS;
        }
        this.sendMessage([messageTypes.noteOn | ch, midiNote, velocity], offset, eventOptions);
    }
    
    /**
     * Stops playing a note.
     * @param channel {number} usually 0-15: the channel of the note.
     * @param midiNote {number} 0-127 the key number of the note.
     * @param force {boolean} instantly kills the note if true.
     * @param eventOptions {SynthMethodOptions} additional options for this command.
     */
    noteOff(channel, midiNote, force = false, eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS)
    {
        midiNote %= 128;
        
        const ch = channel % 16;
        const offset = channel - ch;
        this._sendInternal([messageTypes.noteOff | ch, midiNote], offset, force, eventOptions);
    }
    
    /**
     * Stops all notes.
     * @param force {boolean} if we should instantly kill the note, defaults to false.
     */
    stopAll(force = false)
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.stopAll,
            messageData: force ? 1 : 0
        });
        
    }
    
    /**
     * Changes the given controller
     * @param channel {number} usually 0-15: the channel to change the controller.
     * @param controllerNumber {number} 0-127 the MIDI CC number.
     * @param controllerValue {number} 0-127 the controller value.
     * @param force {boolean} forces the controller-change message, even if it's locked or gm system is set and the cc is bank select.
     * @param eventOptions {SynthMethodOptions} additional options for this command.
     */
    controllerChange(channel, controllerNumber, controllerValue, force = false, eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS)
    {
        if (controllerNumber > 127 || controllerNumber < 0)
        {
            throw new Error(`Invalid controller number: ${controllerNumber}`);
        }
        controllerValue = Math.floor(controllerValue) % 128;
        controllerNumber = Math.floor(controllerNumber) % 128;
        // controller change has its own message for the force property
        const ch = channel % 16;
        const offset = channel - ch;
        this._sendInternal(
            [messageTypes.controllerChange | ch, controllerNumber, controllerValue],
            offset,
            force,
            eventOptions
        );
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
        });
    }
    
    /**
     * Applies pressure to a given channel.
     * @param channel {number} usually 0-15: the channel to change the controller.
     * @param pressure {number} 0-127: the pressure to apply.
     * @param eventOptions {SynthMethodOptions} additional options for this command.
     */
    channelPressure(channel, pressure, eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS)
    {
        const ch = channel % 16;
        const offset = channel - ch;
        pressure %= 128;
        this.sendMessage([messageTypes.channelPressure | ch, pressure], offset, eventOptions);
    }
    
    /**
     * Applies pressure to a given note.
     * @param channel {number} usually 0-15: the channel to change the controller.
     * @param midiNote {number} 0-127: the MIDI note.
     * @param pressure {number} 0-127: the pressure to apply.
     * @param eventOptions {SynthMethodOptions} additional options for this command.
     */
    polyPressure(channel, midiNote, pressure, eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS)
    {
        const ch = channel % 16;
        const offset = channel - ch;
        midiNote %= 128;
        pressure %= 128;
        this.sendMessage([messageTypes.polyPressure | ch, midiNote, pressure], offset, eventOptions);
    }
    
    /**
     * Sets the pitch of the given channel.
     * @param channel {number} usually 0-15: the channel to change pitch.
     * @param MSB {number} SECOND byte of the MIDI pitchWheel message.
     * @param LSB {number} FIRST byte of the MIDI pitchWheel message.
     * @param eventOptions {SynthMethodOptions} additional options for this command.
     */
    pitchWheel(channel, MSB, LSB, eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS)
    {
        const ch = channel % 16;
        const offset = channel - ch;
        this.sendMessage([messageTypes.pitchBend | ch, LSB, MSB], offset, eventOptions);
    }
    
    /**
     * @param data {WorkletMessage}
     */
    post(data)
    {
        if (this._destroyed)
        {
            throw new Error("This synthesizer instance has been destroyed!");
        }
        this.worklet.port.postMessage(data);
    }
    
    /**
     * Transposes the synthetizer's pitch by given semitones amount (percussion channels don’t get affected).
     * @param semitones {number} the semitones to transpose by.
     * It can be a floating point number for more precision.
     */
    transpose(semitones)
    {
        this.transposeChannel(ALL_CHANNELS_OR_DIFFERENT_ACTION, semitones, false);
    }
    
    /**
     * Transposes the channel by given number of semitones.
     * @param channel {number} the channel number.
     * @param semitones {number} the transposition of the channel, it can be a float.
     * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel.
     */
    transposeChannel(channel, semitones, force = false)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.transpose,
            messageData: [semitones, force]
        });
    }
    
    /**
     * Sets the main volume.
     * @param volume {number} 0-1 the volume.
     */
    setMainVolume(volume)
    {
        this._setMasterParam(masterParameterType.mainVolume, volume);
    }
    
    /**
     * Sets the master stereo panning.
     * @param pan {number} (-1 to 1), the pan (-1 is left, 0 is midde, 1 is right)
     */
    setMasterPan(pan)
    {
        this._setMasterParam(masterParameterType.masterPan, pan);
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
     * defaults to false
     */
    programChange(channel, programNumber)
    {
        const ch = channel % 16;
        const offset = channel - ch;
        programNumber %= 128;
        this.sendMessage([messageTypes.programChange | ch, programNumber], offset);
    }
    
    /**
     * Overrides velocity on a given channel.
     * @param channel {number} usually 0-15: the channel to change.
     * @param velocity {number} 1-127, the velocity to use.
     * 0 Disables this functionality
     */
    velocityOverride(channel, velocity)
    {
        const ch = channel % 16;
        const offset = channel - ch;
        this._sendInternal(
            [messageTypes.controllerChange | ch, channelConfiguration.velocityOverride, velocity],
            offset,
            true,
            DEFAULT_SYNTH_METHOD_OPTIONS
        );
    }
    
    /**
     * Causes the given midi channel to ignore controller messages for the given controller number.
     * @param channel {number} usually 0-15: the channel to lock.
     * @param controllerNumber {number} 0-127 MIDI CC number NOTE: -1 locks the preset.
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
     * Mutes or unmutes the given channel.
     * @param channel {number} usually 0-15: the channel to lock.
     * @param isMuted {boolean} indicates if the channel is muted.
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
     * THIS IS DEPRECATED!
     * USE soundfontManager instead.
     * @param soundFontBuffer {ArrayBuffer} the new soundfont file array buffer.
     * @return {Promise<void>}
     * @deprecated Use the soundfontManager property.
     */
    async reloadSoundFont(soundFontBuffer)
    {
        SpessaSynthWarn("reloadSoundFont is deprecated. Please use the soundfontManager property instead.");
        await this.soundfontManager.reloadManager(soundFontBuffer);
    }
    
    /**
     * Sends a MIDI Sysex message to the synthesizer.
     * @param messageData {number[]|ArrayLike|Uint8Array} the message's data
     * (excluding the F0 byte, but including the F7 at the end).
     * @param channelOffset {number} channel offset for the system exclusive message, defaults to zero.
     * @param eventOptions {SynthMethodOptions} additional options for this command.
     */
    systemExclusive(messageData, channelOffset = 0, eventOptions = DEFAULT_SYNTH_METHOD_OPTIONS)
    {
        this._sendInternal(
            [messageTypes.systemExclusive, ...Array.from(messageData)],
            channelOffset,
            false,
            eventOptions
        );
    }
    
    // noinspection JSUnusedGlobalSymbols
    /**
     * Tune MIDI keys of a given program using the MIDI Tuning Standard.
     * @param program {number} 0 - 127 the MIDI program number to use.
     * @param tunings {{sourceKey: number, targetPitch: number}[]} - the keys and their tunings.
     * TargetPitch of -1 sets the tuning for this key to be tuned regularly.
     */
    tuneKeys(program, tunings)
    {
        if (tunings.length > 127)
        {
            throw new Error("Too many tunings. Maximum allowed is 127.");
        }
        const systemExclusive = [
            0x7F,           // real-time
            0x10,           // device id
            0x08,           // MIDI Tuning
            0x02,           // note change
            program,        // tuning program number
            tunings.length // number of changes
        ];
        for (const tuning of tunings)
        {
            systemExclusive.push(tuning.sourceKey); // [kk] MIDI Key number
            if (tuning.targetPitch === -1)
            {
                // no change
                systemExclusive.push(0x7F, 0x7F, 0x7F);
            }
            else
            {
                const midiNote = Math.floor(tuning.targetPitch);
                const fraction = Math.floor((tuning.targetPitch - midiNote) / 0.000061);
                systemExclusive.push(
                    midiNote,// frequency data byte 1
                    (fraction >> 7) & 0x7F, // frequency data byte 2
                    fraction & 0x7F         // frequency data byte 3
                );
            }
        }
        systemExclusive.push(0xF7);
        this.systemExclusive(systemExclusive);
    }
    
    /**
     * Toggles drums on a given channel.
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
     * Updates the reverb processor with a new impulse response.
     * @param buffer {AudioBuffer} the new reverb impulse response.
     */
    setReverbResponse(buffer)
    {
        this.reverbProcessor.buffer = buffer;
        this.effectsConfig.reverbImpulseResponse = buffer;
    }
    
    /**
     * Updates the chorus processor parameters.
     * @param config {ChorusConfig} the new chorus.
     */
    setChorusConfig(config)
    {
        this.worklet.disconnect(this.chorusProcessor.input);
        this.chorusProcessor.delete();
        delete this.chorusProcessor;
        this.chorusProcessor = new FancyChorus(this.targetNode, config);
        this.worklet.connect(this.chorusProcessor.input, 1);
        this.effectsConfig.chorusConfig = config;
    }
    
    /**
     * Changes the effects gain.
     * @param reverbGain {number} the reverb gain, 0-1.
     * @param chorusGain {number} the chorus gain, 0-1.
     */
    setEffectsGain(reverbGain, chorusGain)
    {
        // noinspection JSCheckFunctionSignatures
        this.post({
            messageType: workletMessageType.setEffectsGain,
            messageData: [reverbGain, chorusGain]
        });
    }
    
    /**
     * Destroys the synthesizer instance.
     */
    destroy()
    {
        this.reverbProcessor.disconnect();
        this.chorusProcessor.delete();
        // noinspection JSCheckFunctionSignatures
        this.post({
            messageType: workletMessageType.destroyWorklet,
            messageData: undefined
        });
        this.worklet.disconnect();
        delete this.worklet;
        delete this.reverbProcessor;
        delete this.chorusProcessor;
        this._destroyed = true;
    }
    
    // noinspection JSUnusedGlobalSymbols
    reverbateEverythingBecauseWhyNot()
    {
        for (let i = 0; i < this.channelsAmount; i++)
        {
            this.controllerChange(i, midiControllers.reverbDepth, 127);
            this.lockController(i, midiControllers.reverbDepth, true);
        }
        return "That's the spirit!";
    }
}