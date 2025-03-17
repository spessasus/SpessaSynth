import { IndexedByteArray } from "../utils/indexed_array.js";
import { consoleColors } from "../utils/other.js";
import { getEvent, messageTypes, midiControllers } from "../midi_parser/midi_message.js";
import { EventHandler } from "./synth_event_handler.js";
import { FancyChorus } from "./audio_effects/fancy_chorus.js";
import { getReverbProcessor } from "./audio_effects/reverb.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    masterParameterType,
    returnMessageType,
    workletMessageType
} from "./worklet_system/message_protocol/worklet_message.js";
import { SpessaSynthInfo, SpessaSynthWarn } from "../utils/loggin.js";
import { DEFAULT_SYNTH_CONFIG } from "./audio_effects/effects_config.js";
import { SoundfontManager } from "./synth_soundfont_manager.js";
import { KeyModifierManager } from "./key_modifier_manager.js";
import { channelConfiguration } from "./worklet_system/worklet_utilities/controller_tables.js";


/**
 * synthesizer.js
 * purpose: responds to midi messages and called functions, managing the channels and passing the messages to them
 */

/**
 * @typedef {Object} StartRenderingDataConfig
 * @property {BasicMIDI} parsedMIDI - the MIDI to render
 * @property {SynthesizerSnapshot} snapshot - the snapshot to apply
 * @property {boolean|undefined} oneOutput - if synth should use one output with 32 channels (2 audio channels for each midi channel).
 * this disabled chorus and reverb.
 * @property {number|undefined} loopCount - the times to loop the song
 */

export const WORKLET_PROCESSOR_NAME = "spessasynth-worklet-system";

export const VOICE_CAP = 350;

export const DEFAULT_PERCUSSION = 9;
export const MIDI_CHANNEL_COUNT = 16;
export const DEFAULT_SYNTH_MODE = "gs";


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
     * Creates a new instance of the SpessaSynth synthesizer.
     * @param targetNode {AudioNode}
     * @param soundFontBuffer {ArrayBuffer} the soundfont file array buffer.
     * @param enableEventSystem {boolean} enables the event system.
     * Defaults to true.
     * @param startRenderingData {StartRenderingDataConfig} if set, starts playing this immediately and restores the values.
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
        const oneOutputMode = startRenderingData?.oneOutput === true;
        
        /**
         * @private
         * @type {function}
         */
        this._resolveWhenReady = undefined;
        
        /**
         * Indicates if the synth is fully ready
         * @type {Promise<void>}
         */
        this.isReady = new Promise(resolve => this._resolveWhenReady = resolve);
        
        
        for (let i = 0; i < this.channelsAmount; i++)
        {
            this.addNewChannel(false);
        }
        this.channelProperties[DEFAULT_PERCUSSION].isDrum = true;
        
        // create a worklet processor
        let processorChannelCount = Array(this._outputsAmount + 2).fill(2);
        let processorOutputsCount = this._outputsAmount + 2;
        if (oneOutputMode)
        {
            processorOutputsCount = 1;
            processorChannelCount = [32];
        }
        
        // check for config data in snapshot
        if (startRenderingData?.snapshot?.effectsConfig !== undefined)
        {
            /**
             * @type {SynthConfig}
             */
            this.effectsConfig = startRenderingData.snapshot.effectsConfig;
            // remove from config as it can't be cloned
            delete startRenderingData.snapshot.effectsConfig;
        }
        else
        {
            /**
             * @type {SynthConfig}
             */
            this.effectsConfig = synthConfig;
        }
        
        // first two outputs: reverb, chorus, the others are the channel outputs
        try
        {
            let workletConstructor = synthConfig?.audioNodeCreators?.worklet;
            if (!workletConstructor)
            {
                workletConstructor = (ctx, name, opts) =>
                {
                    // noinspection JSCheckFunctionSignatures
                    return new AudioWorkletNode(ctx, name, opts);
                };
            }
            this.worklet = workletConstructor(this.context, WORKLET_PROCESSOR_NAME, {
                outputChannelCount: processorChannelCount,
                numberOfOutputs: processorOutputsCount,
                processorOptions: {
                    midiChannels: this._outputsAmount,
                    soundfont: soundFontBuffer,
                    enableEventSystem: enableEventSystem,
                    startRenderingData: startRenderingData
                }
            });
        }
        catch (e)
        {
            console.error(e);
            throw new Error("Could not create the audioWorklet. Did you forget to addModule()?");
        }
        
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
         * The synth's soundfont manager
         * @type {SoundfontManager}
         */
        this.soundfontManager = new SoundfontManager(this);
        
        /**
         * The synth's key modifier manager
         * @type {KeyModifierManager}
         */
        this.keyModifierManager = new KeyModifierManager(this);
        
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
        
        if (oneOutputMode)
        {
            // one output mode: one output (duh)
            this.worklet.connect(targetNode, 0);
        }
        else
        {
            // add reverb and chorus processors
            const reverbOn = this.effectsConfig?.reverbEnabled ?? true;
            const chorusOn = this.effectsConfig?.chorusEnabled ?? true;
            if (reverbOn)
            {
                this.reverbProcessor = getReverbProcessor(this.context, this.effectsConfig.reverbImpulseResponse);
                this.reverbProcessor.connect(targetNode);
                this.worklet.connect(this.reverbProcessor, 0);
            }
            
            if (chorusOn)
            {
                this.chorusProcessor = new FancyChorus(targetNode, this.effectsConfig.chorusConfig);
                this.worklet.connect(this.chorusProcessor.input, 1);
            }
            
            // connect all outputs to the output node
            for (let i = 2; i < this.channelsAmount + 2; i++)
            {
                this.worklet.connect(targetNode, i);
            }
        }
        
        // attach a new channel to keep track of channels count
        this.eventHandler.addEvent("newchannel", "synth-new-channel", () =>
        {
            this.channelsAmount++;
        });
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
                if (this.sequencerCallbackFunction)
                {
                    this.sequencerCallbackFunction(messageData.messageType, messageData.messageData);
                }
                break;
            
            case returnMessageType.synthesizerSnapshot:
                if (this._snapshotCallback)
                {
                    this._snapshotCallback(messageData);
                }
                break;
            
            case returnMessageType.ready:
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
            transposition: 0
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
     * Starts playing a note
     * @param channel {number} usually 0-15: the channel to play the note.
     * @param midiNote {number} 0-127 the key number of the note.
     * @param velocity {number} 0-127 the velocity of the note (generally controls loudness).
     * @param enableDebugging {boolean} set to true to log technical details to console.
     */
    noteOn(channel, midiNote, velocity, enableDebugging = false)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.noteOn,
            messageData: [midiNote, velocity, enableDebugging]
        });
    }
    
    /**
     * Stops playing a note.
     * @param channel {number} usually 0-15: the channel of the note.
     * @param midiNote {number} 0-127 the key number of the note.
     * @param force {boolean} instantly kills the note if true.
     */
    noteOff(channel, midiNote, force = false)
    {
        if (force)
        {
            this.post({
                channelNumber: channel,
                messageType: workletMessageType.killNote,
                messageData: midiNote
            });
        }
        else
        {
            this.post({
                channelNumber: channel,
                messageType: workletMessageType.noteOff,
                messageData: midiNote
            });
        }
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
     */
    controllerChange(channel, controllerNumber, controllerValue, force = false)
    {
        if (controllerNumber > 127 || controllerNumber < 0)
        {
            throw new Error(`Invalid controller number: ${controllerNumber}`);
        }
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
        });
    }
    
    /**
     * Applies pressure to a given channel.
     * @param channel {number} usually 0-15: the channel to change the controller.
     * @param pressure {number} 0-127: the pressure to apply.
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
     * Applies pressure to a given note.
     * @param channel {number} usually 0-15: the channel to change the controller.
     * @param midiNote {number} 0-127: the MIDI note.
     * @param pressure {number} 0-127: the pressure to apply.
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
        if (this._destroyed)
        {
            throw new Error("This synthesizer instance has been destroyed!");
        }
        this.worklet.port.postMessage(data);
    }
    
    /**
     * Sets the pitch of the given channel.
     * @param channel {number} usually 0-15: the channel to change pitch.
     * @param MSB {number} SECOND byte of the MIDI pitchWheel message.
     * @param LSB {number} FIRST byte of the MIDI pitchWheel message.
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.pitchWheel,
            messageData: [MSB, LSB]
        });
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
     * @param userChange {boolean} indicates if user has called the program change.
     * defaults to false
     */
    programChange(channel, programNumber, userChange = false)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.programChange,
            messageData: [programNumber, userChange]
        });
    }
    
    /**
     * Overrides velocity on a given channel.
     * @param channel {number} usually 0-15: the channel to change.
     * @param velocity {number} 1-127, the velocity to use.
     * 0 Disables this functionality
     */
    velocityOverride(channel, velocity)
    {
        this.post({
            channelNumber: channel,
            messageType: workletMessageType.ccChange,
            messageData: [channelConfiguration.velocityOverride, velocity, true]
        });
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
     */
    systemExclusive(messageData, channelOffset = 0)
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.systemExclusive,
            messageData: [Array.from(messageData), channelOffset]
        });
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
     * sends a raw MIDI message to the synthesizer.
     * @param message {number[]|Uint8Array} the midi message, each number is a byte.
     * @param channelOffset {number} the channel offset of the message.
     */
    sendMessage(message, channelOffset = 0)
    {
        // discard as soon as possible if high perf
        const statusByteData = getEvent(message[0]);
        
        statusByteData.channel += channelOffset;
        // process the event
        switch (statusByteData.status)
        {
            case messageTypes.noteOn:
                const velocity = message[2];
                if (velocity > 0)
                {
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