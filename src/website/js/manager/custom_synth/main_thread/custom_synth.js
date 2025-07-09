import { FancyChorus, getReverbProcessor } from "spessasynth_lib";
import { returnMessageType, workerMessageType } from "../worker_thread/worker_message.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    channelConfiguration,
    DEFAULT_PERCUSSION,
    DEFAULT_SYNTH_MODE,
    interpolationTypes,
    masterParameterType,
    messageTypes,
    midiControllers,
    SpessaSynthCoreUtils,
    SynthesizerSnapshot,
    VOICE_CAP
} from "spessasynth_core";
import { EventHandler } from "./synth_event_handler.js";
import { SoundfontManager } from "./synth_soundfont_manager.js";
import { WorkerKeyModifierManagerWrapper } from "./key_modifier_manager.js";

/*
custom_synth.js
purpose: a custom recreation of spessasynth_lib's `Synthetizer` class that uses a web worker instead of audio worklet,
to allow offline rendering without parsing the same sound bank twice
 */

/**
 * @typedef {Object} ChorusConfig
 * @property {number?} nodesAmount - the amount of delay nodes (for each channel) and the corresponding oscillators
 * @property {number?} defaultDelay - the initial delay, in seconds
 * @property {number?} delayVariation - the difference between delays in the delay nodes
 * @property {number?} stereoDifference - the difference of delays between two channels (added to the left channel and subtracted from the right)
 * @property {number?} oscillatorFrequency - the initial delay time oscillator frequency, in Hz
 * @property {number?} oscillatorFrequencyVariation - the difference between frequencies of oscillators, in Hz
 * @property {number?} oscillatorGain - how much will oscillator alter the delay in delay nodes, in seconds
 */

/**
 * @typedef {Object} ChannelProperty
 * @property {number} voicesAmount - the channel's current voice amount
 * @property {number} pitchBend - the channel's current pitch bend from -8192 do 8192
 * @property {number} pitchBendRangeSemitones - the pitch bend's range, in semitones
 * @property {boolean} isMuted - indicates whether the channel is muted
 * @property {boolean} isDrum - indicates whether the channel is a drum channel
 * @property {number} transposition - the channel's transposition, in semitones
 * @property {number} bank - the bank number of the current preset
 * @property {number} program - the MIDI program number of the current preset
 */

/**
 * @typedef {Object} SynthConfig
 * @property {boolean?} chorusEnabled - indicates if the chorus effect is enabled
 * @property {ChorusConfig?} chorusConfig - the configuration for chorus
 * @property {boolean?} reverbEnabled - indicates if the reverb effect is enabled
 * @property {AudioBuffer?} reverbImpulseResponse - the impulse response for the reverb
 */

// syn
export class CustomSynth
{
    
    /**
     * @type {BaseAudioContext}
     */
    context;
    
    /**
     * @type {AudioNode}
     */
    target;
    
    /**
     * @type {Worker}
     */
    worker;
    
    /**
     * @type {function|undefined}
     */
    sequencerCallbackFunction = undefined;
    
    /**
     * @type {AudioWorkletNode}
     */
    worklet;
    
    channelsAmount = 16;
    
    /**
     * @type {ConvolverNode}
     */
    reverbProcessor;
    
    /**
     * @type {FancyChorus}
     */
    chorus;
    
    /**
     * @type {EventHandler}
     */
    eventHandler = new EventHandler();
    
    /**
     * @type {WorkerKeyModifierManagerWrapper}
     */
    keyModifierManager;
    
    /**
     * @type {SoundfontManager}
     */
    soundfontManager;
    
    /**
     * @type {undefined|function}
     * @private
     */
    _snapshotCallback = undefined;
    
    /**
     * @type {SynthConfig}
     */
    effectsConfig = {
        chorusEnabled: true,
        chorusConfig: {
            nodesAmount: 4,
            defaultDelay: 0.03,
            delayVariation: 0.01,
            stereoDifference: 0.02,
            oscillatorFrequency: 0.2,
            oscillatorFrequencyVariation: 0.05,
            oscillatorGain: 0.003
        },
        
        reverbEnabled: true,
        reverbImpulseResponse: undefined, // will load the integrated one
        audioNodeCreators: undefined
    };
    
    /**
     * The current preset list
     * @type {{presetName: string, bank: number, program: number}[]}
     */
    presetList = [];
    
    
    /**
     * Synth's current channel properties
     * @type {ChannelProperty[]}
     */
    channelProperties = [];
    /**
     * initialize internal promise resolution
     * @type {function|undefined}
     */
    _resolveWhenReady = undefined;
    
    /**
     * Time difference between audioContext's time and worker's synth time
     * @type {number}
     * @private
     */
    _timeDifference = 0;
    /**
     * @type {(p: number) => unknown}
     */
    workerProgressCallback;
    /**
     * @type {(d: ArrayBuffer|AudioChunks) => unknown}
     */
    workerFinishCallback;
    
    /**
     * @param target {AudioNode}
     */
    constructor(target)
    {
        this.context = target.context;
        this.target = target;
    }
    
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
            messageType: workerMessageType.highPerformanceMode,
            messageData: value
        });
    }
    
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
    
    // noinspection JSUnusedGlobalSymbols
    /**
     * @returns {number} the audioContext's current time.
     */
    get currentTime()
    {
        return this.context.currentTime + this._timeDifference;
    }
    
    /**
     *  @param soundBank {ArrayBuffer}
     */
    async init(soundBank)
    {
        if (this.context.audioWorklet)
        {
            await this.context.audioWorklet.addModule(new URL(
                "../worklet_thread/playback_worklet.js",
                import.meta.url
            ));
        }
        
        // create initial channels
        for (let i = 0; i < this.channelsAmount; i++)
        {
            this.addNewChannel(false);
        }
        this.channelProperties[DEFAULT_PERCUSSION].isDrum = true;
        
        // effects
        const r = getReverbProcessor(this.context);
        this.reverbProcessor = r.conv;
        await r.promise;
        this.reverbProcessor.connect(this.target);
        this.chorus = new FancyChorus(this.target);
        
        // message channel
        const messageChannel = new MessageChannel();
        const workerPort = messageChannel.port1;
        const workletPort = messageChannel.port2;
        
        // worklet: plays back the 18 stereo outputs (reverb, chorus, 16 audio nodes)
        this.worklet = new AudioWorkletNode(this.context, "playback-processor", {
            numberOfOutputs: 18,
            outputChannelCount: Array(18).fill(2)
        });
        this.worklet.port.postMessage(null, [workletPort]);
        // connect effects
        this.worklet.connect(this.reverbProcessor, 0);
        this.worklet.connect(this.chorus.input, 1);
        // connect dry
        for (let i = 2; i < 18; i++)
        {
            this.worklet.connect(this.target, i);
        }
        
        // worker: the actual audio engine lies there
        this.worker = new Worker(new URL("../worker_thread/synth_worker.js", import.meta.url), { type: "module" });
        
        // attach event handlers
        this.eventHandler.addEvent("newchannel", `synth-new-channel-${Math.random()}`, () =>
        {
            this.channelsAmount++;
        });
        this.eventHandler.addEvent("presetlistchange", `synth-preset-list-change-${Math.random()}`, e =>
        {
            this.presetList = e;
        });
        
        this.worker.onmessage = this.handleMessage.bind(this);
        
        // set up managers
        this.keyModifierManager = new WorkerKeyModifierManagerWrapper(this);
        this.soundfontManager = new SoundfontManager(this);
        
        this.worker.postMessage({
            messageType: workerMessageType.sampleRate,
            messageData: [this.context.sampleRate, this.context.currentTime]
        }, [workerPort]); // transfer the port
        
        this.worker.postMessage({
            messageData: soundBank,
            messageType: workerMessageType.initialSoundBank
        }, [soundBank]);
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
            messageType: workerMessageType.addNewChannel,
            messageData: null
        });
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
                messageType: workerMessageType.requestSynthesizerSnapshot,
                messageData: undefined,
                channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION
            });
        });
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
            messageType: workerMessageType.setLogLevel,
            messageData: [enableInfo, enableWarning, enableGroup, enableTable]
        });
    }
    
    /**
     * @param data {WorkerMessage}
     */
    post(data)
    {
        this.worker.postMessage(data);
    }
    
    /**
     * sends a raw MIDI message to the synthesizer.
     * @param message {number[]|Uint8Array} the midi message, each number is a byte.
     * @param channelOffset {number} the channel offset of the message.
     */
    sendMessage(message, channelOffset = 0)
    {
        this._sendInternal(message, channelOffset, false);
    }
    
    /**
     * @param message {number[]|Uint8Array}
     * @param offset {number}
     * @param force {boolean}
     * @private
     */
    _sendInternal(message, offset, force = false)
    {
        this.post({
            messageType: workerMessageType.midiMessage,
            messageData: [new Uint8Array(message), offset, force]
        });
    }
    
    /**
     * Starts playing a note
     * @param channel {number} usually 0-15: the channel to play the note.
     * @param midiNote {number} 0-127 the key number of the note.
     * @param velocity {number} 0-127 the velocity of the note (generally controls loudness).
     */
    noteOn(channel, midiNote, velocity)
    {
        const ch = channel % 16;
        const offset = channel - ch;
        midiNote %= 128;
        velocity %= 128;
        this.sendMessage([messageTypes.noteOn | ch, midiNote, velocity], offset);
    }
    
    /**
     * Stops playing a note.
     * @param channel {number} usually 0-15: the channel of the note.
     * @param midiNote {number} 0-127 the key number of the note.
     * @param force {boolean} instantly kills the note if true.
     */
    noteOff(channel, midiNote, force = false)
    {
        midiNote %= 128;
        
        const ch = channel % 16;
        const offset = channel - ch;
        this._sendInternal([messageTypes.noteOff | ch, midiNote], offset, force);
    }
    
    /**
     * Stops all notes.
     * @param force {boolean} if we should instantly kill the note, defaults to false.
     */
    stopAll(force = false)
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workerMessageType.stopAll,
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
        controllerValue = Math.floor(controllerValue) % 128;
        controllerNumber = Math.floor(controllerNumber) % 128;
        // controller change has its own message for the force property
        const ch = channel % 16;
        const offset = channel - ch;
        this._sendInternal(
            [messageTypes.controllerChange | ch, controllerNumber, controllerValue],
            offset,
            force
        );
    }
    
    /**
     * Resets all controllers (for every channel)
     */
    resetControllers()
    {
        this.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workerMessageType.ccReset,
            messageData: undefined
        });
    }
    
    /**
     * Sets the pitch of the given channel.
     * @param channel {number} usually 0-15: the channel to change pitch.
     * @param MSB {number} SECOND byte of the MIDI pitchWheel message.
     * @param LSB {number} FIRST byte of the MIDI pitchWheel message.
     */
    pitchWheel(channel, MSB, LSB)
    {
        const ch = channel % 16;
        const offset = channel - ch;
        this.sendMessage([messageTypes.pitchBend | ch, LSB, MSB], offset);
    }
    
    /**
     * Transposes the synthesizer's pitch by given the semitone amount (percussion channels don’t get affected).
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
            messageType: workerMessageType.transpose,
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
     * @param pan {number} (-1 to 1), the pan (-1 is left, 0 is middle, 1 is right)
     */
    setMasterPan(pan)
    {
        this._setMasterParam(masterParameterType.masterPan, pan);
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
    
    // noinspection JSUnusedGlobalSymbols
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
            true
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
            messageType: workerMessageType.lockController,
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
            messageType: workerMessageType.muteChannel,
            messageData: isMuted
        });
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
            messageType: workerMessageType.setDrums,
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
        this.chorusProcessor = new FancyChorus(this.target, config);
        this.worklet.connect(this.chorusProcessor.input, 1);
        this.effectsConfig.chorusConfig = config;
    }
    
    /**
     * @param sampleRate {number}
     * @param additionalTime {number}
     * @param separateChannels {boolean}
     * @param loopCount {number}
     * @param callback {(progress: number) => void}
     * @returns {Promise<AudioChunks>}
     */
    async renderAudio(sampleRate, additionalTime, separateChannels, loopCount, callback)
    {
        /**
         * @type {Promise<AudioChunks>}
         */
        const promise = new Promise(r => this.workerFinishCallback = r);
        this.workerProgressCallback = callback;
        this.post({
            messageType: workerMessageType.renderAudio,
            messageData: {
                sampleRate,
                additionalTime,
                separateChannels,
                loopCount
            }
        });
        return promise;
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
            messageType: workerMessageType.setEffectsGain,
            messageData: [reverbGain, chorusGain]
        });
    }
    
    /**
     * Handles the messages received from the worker.
     * @param e {MessageEvent}
     * @private
     */
    handleMessage(e)
    {
        /**
         * @type {WorkerReturnMessage}
         */
        const message = e.data;
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
                
                const time = messageData[2];
                this._timeDifference = time - this.context.currentTime;
                
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
                this?._resolveWhenReady();
                break;
            
            case returnMessageType.renderingProgress:
                this?.workerProgressCallback(messageData);
                break;
            
            case returnMessageType.soundfontError:
                SpessaSynthCoreUtils.SpessaSynthWarn(new Error(messageData));
                this.eventHandler.callEvent("soundfonterror", messageData);
                break;
            
            case returnMessageType.renderedSong:
                this?.workerFinishCallback(messageData);
                break;
        }
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
            messageType: workerMessageType.setMasterParameter,
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
     * @param channel {number}
     * @param value {{delay: number, depth: number, rate: number}}
     */
    setVibrato(channel, value)
    {
        this.post({
            channelNumber: channel,
            messageType: workerMessageType.setChannelVibrato,
            messageData: value
        });
    }
    
    /*
     * Disables the GS NRPN parameters like vibrato or drum key tuning.
     */
    disableGSNRPparams()
    {
        // rate -1 disables, see worker_message.js line 9
        // channel -1 is all
        this.setVibrato(ALL_CHANNELS_OR_DIFFERENT_ACTION, { depth: 0, rate: -1, delay: 0 });
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
