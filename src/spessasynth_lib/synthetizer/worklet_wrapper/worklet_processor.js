import { consoleColors } from "../../utils/other.js";
import { SpessaSynthInfo, SpessaSynthLogging, SpessaSynthWarn } from "../../utils/loggin.js";
import { SpessaSynthProcessor } from "../audio_engine/main_processor.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    returnMessageType,
    workletMessageType
} from "../audio_engine/message_protocol/worklet_message.js";
import { SynthesizerSnapshot } from "../audio_engine/snapshot/synthesizer_snapshot.js";
import { WORKLET_PROCESSOR_NAME } from "./worklet_url.js";
import { MIDI_CHANNEL_COUNT } from "../synth_constants.js";
import { workletKeyModifierMessageType } from "../audio_engine/engine_components/key_modifier_manager.js";
import { masterParameterType } from "../audio_engine/engine_methods/controller_control/master_parameters.js";


// a worklet processor wrapper for the synthesizer core
class WorkletSpessaProcessor extends AudioWorkletProcessor
{
    /**
     * If the worklet is alive
     * @type {boolean}
     */
    alive = true;
    
    /**
     * Instead of 18 stereo outputs, there's one with 32 channels (no effects)
     * @type {boolean}
     */
    oneOutputMode = false;
    
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param options {{
     * processorOptions: {
     *      midiChannels: number,
     *      soundfont: ArrayBuffer,
     *      enableEventSystem: boolean,
     *      startRenderingData: StartRenderingDataConfig
     * }}}
     */
    constructor(options)
    {
        super();
        const opts = options.processorOptions;
        
        
        // one output is indicated by setting midiChannels to 1
        this.oneOutputMode = opts.midiChannels === 1;
        
        // noinspection JSUnresolvedReference
        /**
         * Initialize the synthesis engine
         * @type {SpessaSynthProcessor}
         */
        this.synthesizer = new SpessaSynthProcessor(
            MIDI_CHANNEL_COUNT,                      // midi channel count (16)
            opts.soundfont,                          // initial sound bank
            sampleRate,                              // AudioWorkletGlobalScope
            this.postMessageToMainThread.bind(this), // connect to message port
            !this.oneOutputMode,                     // one output mode disables effects
            opts?.enableEventSystem,                 // enable message port?
            opts?.startRenderingData,                // start rendering?
            currentTime                              // AudioWorkletGlobalScope, sync with audioContext time
        );
        
        // receive messages from the main thread
        this.port.onmessage = e => this.handleMessage(e.data);
    }
    
    /**
     * @param data {WorkletReturnMessage}
     */
    postMessageToMainThread(data)
    {
        this.port.postMessage(data);
    }
    
    /**
     * @this {WorkletSpessaProcessor}
     * @param message {WorkletMessage}
     */
    handleMessage(message)
    {
        const data = message.messageData;
        const channel = message.channelNumber;
        /**
         * @type {MidiAudioChannel}
         */
        let channelObject;
        if (channel >= 0)
        {
            channelObject = this.synthesizer.midiAudioChannels[channel];
            if (channelObject === undefined)
            {
                SpessaSynthWarn(`Trying to access channel ${channel} which does not exist... ignoring!`);
                return;
            }
        }
        switch (message.messageType)
        {
            case workletMessageType.midiMessage:
                this.synthesizer.processMessage(...data);
                break;
            
            case workletMessageType.customcCcChange:
                // custom controller change
                channelObject.setCustomController(data[0], data[1]);
                channelObject.updateChannelTuning();
                break;
            
            case workletMessageType.ccReset:
                if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    this.synthesizer.resetAllControllers();
                }
                else
                {
                    channelObject.resetControllers();
                }
                break;
            
            case workletMessageType.setChannelVibrato:
                if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    for (let i = 0; i < this.synthesizer.midiAudioChannels.length; i++)
                    {
                        const chan = this.synthesizer.midiAudioChannels[i];
                        if (data.rate === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                        {
                            chan.disableAndLockGSNRPN();
                        }
                        else
                        {
                            chan.setVibrato(data.depth, data.rate, data.delay);
                        }
                    }
                }
                else if (data.rate === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    channelObject.disableAndLockGSNRPN();
                }
                else
                {
                    channelObject.setVibrato(data.depth, data.rate, data.delay);
                }
                break;
            
            case workletMessageType.stopAll:
                if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    this.synthesizer.stopAllChannels(data === 1);
                }
                else
                {
                    channelObject.stopAllNotes(data === 1);
                }
                break;
            
            case workletMessageType.killNotes:
                this.synthesizer.voiceKilling(data);
                break;
            
            case workletMessageType.muteChannel:
                channelObject.muteChannel(data);
                break;
            
            case workletMessageType.addNewChannel:
                this.synthesizer.createWorkletChannel(true);
                break;
            
            case workletMessageType.debugMessage:
                this.synthesizer.debugMessage();
                break;
            
            case workletMessageType.setMasterParameter:
                /**
                 * @type {masterParameterType}
                 */
                const type = data[0];
                const value = data[1];
                this.synthesizer.setMasterParameter(type, value);
                break;
            
            case workletMessageType.setDrums:
                channelObject.setDrums(data);
                break;
            
            case workletMessageType.transpose:
                if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    this.synthesizer.transposeAllChannels(data[0], data[1]);
                }
                else
                {
                    channelObject.transposeChannel(data[0], data[1]);
                }
                break;
            
            case workletMessageType.highPerformanceMode:
                this.synthesizer.highPerformanceMode = data;
                break;
            
            case workletMessageType.lockController:
                if (data[0] === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    channelObject.setPresetLock(data[1]);
                }
                else
                {
                    channelObject.lockedControllers[data[0]] = data[1];
                }
                break;
            
            case workletMessageType.sequencerSpecific:
                this.synthesizer.sequencer.processMessage(data.messageType, data.messageData);
                break;
            
            case workletMessageType.soundFontManager:
                try
                {
                    this.synthesizer.soundfontManager.handleMessage(data[0], data[1]);
                }
                catch (e)
                {
                    this.postMessageToMainThread({
                        messageType: returnMessageType.soundfontError,
                        messageData: e
                    });
                }
                this.synthesizer.clearSoundFont(true, false);
                break;
            
            case workletMessageType.keyModifierManager:
                /**
                 * @type {workletKeyModifierMessageType}
                 */
                const keyMessageType = data[0];
                const man = this.synthesizer.keyModifierManager;
                switch (keyMessageType)
                {
                    default:
                        return;
                    
                    case workletKeyModifierMessageType.addMapping:
                        man.addMapping(...data);
                        break;
                    
                    case workletKeyModifierMessageType.clearMappings:
                        man.clearMappings();
                        break;
                    
                    case workletKeyModifierMessageType.deleteMapping:
                        man.deleteMapping(...data);
                }
                break;
            
            case workletMessageType.requestSynthesizerSnapshot:
                const snapshot = SynthesizerSnapshot.createSynthesizerSnapshot(this.synthesizer);
                this.postMessageToMainThread({
                    messageType: returnMessageType.synthesizerSnapshot,
                    messageData: snapshot
                });
                break;
            
            case workletMessageType.setLogLevel:
                SpessaSynthLogging(data[0], data[1], data[2], data[3]);
                break;
            
            case workletMessageType.setEffectsGain:
                this.synthesizer.reverbGain = data[0];
                this.synthesizer.chorusGain = data[1];
                break;
            
            case workletMessageType.destroyWorklet:
                this.alive = false;
                this.synthesizer.destroySynthProcessor();
                break;
            
            default:
                SpessaSynthWarn("Unrecognized event:", data);
                break;
        }
    }
    
    // noinspection JSUnusedGlobalSymbols
    /**
     * the audio worklet processing logic
     * @param inputs {Float32Array[][]} required by WebAudioAPI
     * @param outputs {Float32Array[][]} the outputs to write to, only the first two channels are populated
     * @returns {boolean} true unless it's not alive
     */
    process(inputs, outputs)
    {
        if (!this.alive)
        {
            return false;
        }
        if (this.oneOutputMode)
        {
            const out = outputs[0];
            // 1 output with 32 channels.
            // channels are ordered as follows:
            // midiChannel1L, midiChannel1R,
            // midiChannel2L, midiChannel2R
            // and so on
            /**
             * @type {Float32Array[][]}
             */
            const channelMap = [];
            for (let i = 0; i < 32; i += 2)
            {
                channelMap.push([out[i], out[i + 1]]);
            }
            this.synthesizer.renderAudioSplit(
                [], [], // effects are disabled
                channelMap
            );
        }
        else
        {
            // 18 outputs, each a stereo one
            // 0: reverb
            // 1: chorus
            // 2: channel 1
            // 3: channel 2
            // and so on
            this.synthesizer.renderAudioSplit(
                outputs[0], // reverb
                outputs[1], // chorus
                outputs.slice(2)
            );
        }
        return true;
    }
}

// noinspection JSUnresolvedReference
registerProcessor(WORKLET_PROCESSOR_NAME, WorkletSpessaProcessor);
SpessaSynthInfo("%cProcessor succesfully registered!", consoleColors.recognized);