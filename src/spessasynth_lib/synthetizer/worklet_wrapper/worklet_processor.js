import { consoleColors } from "../../utils/other.js";
import { SpessaSynthInfo, SpessaSynthLogging, SpessaSynthWarn } from "../../utils/loggin.js";
import { SpessaSynthProcessor } from "../audio_engine/main_processor.js";
import { ALL_CHANNELS_OR_DIFFERENT_ACTION, returnMessageType, workletMessageType } from "./worklet_message.js";
import { SynthesizerSnapshot } from "../audio_engine/snapshot/synthesizer_snapshot.js";
import { WORKLET_PROCESSOR_NAME } from "./worklet_url.js";
import { MIDI_CHANNEL_COUNT } from "../synth_constants.js";
import { workletKeyModifierMessageType } from "../audio_engine/engine_components/key_modifier_manager.js";
import { masterParameterType } from "../audio_engine/engine_methods/controller_control/master_parameters.js";
import { WorkletSoundfontManagerMessageType } from "./sfman_message.js";
import {
    SongChangeType,
    SpessaSynthSequencerMessageType,
    SpessaSynthSequencerReturnMessageType
} from "../../sequencer/worklet_wrapper/sequencer_message.js";
import { SpessaSynthSequencer } from "../../sequencer/sequencer_engine/sequencer_engine.js";
import { fillWithDefaults } from "../../utils/fill_with_defaults.js";
import { DEFAULT_SEQUENCER_OPTIONS } from "../../sequencer/worklet_wrapper/default_sequencer_options.js";
import { MIDIData } from "../../midi/midi_data.js";


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
        
        // prepare synthesizer connections
        /**
         * @param t {returnMessageType}
         * @param d {any}
         */
        const postSyn = (t, d) =>
        {
            // noinspection JSCheckFunctionSignatures
            this.postMessageToMainThread({
                messageType: t,
                messageData: d
            });
        };
        
        // noinspection JSUnresolvedReference
        /**
         * Initialize the synthesis engine
         * @type {SpessaSynthProcessor}
         */
        this.synthesizer = new SpessaSynthProcessor(
            MIDI_CHANNEL_COUNT,                      // midi channel count (16)
            opts.soundfont,                          // initial sound bank
            sampleRate,                              // AudioWorkletGlobalScope
            {
                eventCall: (t, d) =>
                {
                    postSyn(returnMessageType.eventCall, {
                        eventName: t,
                        eventData: d
                    });
                },
                ready: this.postReady.bind(this),
                channelPropertyChange: (p, n) => postSyn(returnMessageType.channelPropertyChange, [n, p]),
                masterParameterChange: (t, v) => postSyn(returnMessageType.masterParameterChange, [t, v])
            },
            !this.oneOutputMode,                     // one output mode disables effects
            opts?.enableEventSystem,                 // enable message port?
            currentTime                              // AudioWorkletGlobalScope, sync with audioContext time
        );
        
        // initialize the sequencer engine
        this.sequencer = new SpessaSynthSequencer(this.synthesizer);
        
        const postSeq = (type, data) =>
        {
            this.postMessageToMainThread({
                messageType: returnMessageType.sequencerSpecific,
                messageData: {
                    messageType: type,
                    messageData: data
                }
            });
        };
        
        // receive messages from the main thread
        this.port.onmessage = e => this.handleMessage(e.data);
        
        // sequencer events
        this.sequencer.onMIDIMessage = m =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.midiEvent, m);
        };
        this.sequencer.onTimeChange = t =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.timeChange, t);
        };
        this.sequencer.onPlaybackStop = p =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.pause, p);
        };
        this.sequencer.onSongChange = (i, a) =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.songChange, [i, a]);
        };
        this.sequencer.onMetaEvent = (e, i) =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.metaEvent, [e, i]);
        };
        this.sequencer.onLoopCountChange = c =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.loopCountChange, c);
        };
        this.sequencer.onSongListChange = l =>
        {
            const midiDatas = l.map(s => new MIDIData(s));
            this.postMessageToMainThread({
                messageType: returnMessageType.sequencerSpecific,
                messageData: {
                    messageType: SpessaSynthSequencerReturnMessageType.songListChange,
                    messageData: midiDatas
                }
            });
        };
        
        // start rendering data
        const startRenderingData = opts?.startRenderingData;
        /**
         * The snapshot that synth was restored from
         * @type {SynthesizerSnapshot|undefined}
         * @private
         */
        const snapshot = startRenderingData?.snapshot;
        
        // if sent, start rendering
        if (startRenderingData)
        {
            if (snapshot !== undefined)
            {
                this.synthesizer.applySynthesizerSnapshot(snapshot);
            }
            
            SpessaSynthInfo("%cRendering enabled! Starting render.", consoleColors.info);
            if (startRenderingData.parsedMIDI)
            {
                if (startRenderingData?.loopCount !== undefined)
                {
                    this.sequencer.loopCount = startRenderingData?.loopCount;
                    this.sequencer.loop = true;
                }
                else
                {
                    this.sequencer.loop = false;
                }
                // set voice cap to unlimited
                this.synthesizer.voiceCap = Infinity;
                this.synthesizer.processorInitialized.then(() =>
                {
                    /**
                     * set options
                     * @type {SequencerOptions}
                     */
                    const seqOptions = fillWithDefaults(
                        startRenderingData.sequencerOptions,
                        DEFAULT_SEQUENCER_OPTIONS
                    );
                    this.sequencer.skipToFirstNoteOn = seqOptions.skipToFirstNoteOn;
                    this.sequencer.preservePlaybackState = seqOptions.preservePlaybackState;
                    // autoplay is ignored
                    try
                    {
                        this.sequencer.loadNewSongList([startRenderingData.parsedMIDI]);
                    }
                    catch (e)
                    {
                        console.error(e);
                        postSeq(SpessaSynthSequencerReturnMessageType.midiEvent, e);
                    }
                });
            }
        }
    }
    
    postReady()
    {
        this.postMessageToMainThread({
            messageType: returnMessageType.isFullyInitialized,
            messageData: undefined
        });
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
                const seq = this.sequencer;
                const messageData = data.messageData;
                const messageType = data.messageType;
                switch (messageType)
                {
                    default:
                        break;
                    
                    case SpessaSynthSequencerMessageType.loadNewSongList:
                        try
                        {
                            seq.loadNewSongList(messageData[0], messageData[1]);
                        }
                        catch (e)
                        {
                            console.error(e);
                        }
                        break;
                    
                    case SpessaSynthSequencerMessageType.pause:
                        seq.pause();
                        break;
                    
                    case SpessaSynthSequencerMessageType.play:
                        seq.play(messageData);
                        break;
                    
                    case SpessaSynthSequencerMessageType.stop:
                        seq.stop();
                        break;
                    
                    case SpessaSynthSequencerMessageType.setTime:
                        seq.currentTime = messageData;
                        break;
                    
                    case SpessaSynthSequencerMessageType.changeMIDIMessageSending:
                        seq.sendMIDIMessages = messageData;
                        break;
                    
                    case SpessaSynthSequencerMessageType.setPlaybackRate:
                        seq.playbackRate = messageData;
                        break;
                    
                    case SpessaSynthSequencerMessageType.setLoop:
                        const [loop, count] = messageData;
                        seq.loop = loop;
                        if (count === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                        {
                            seq.loopCount = Infinity;
                        }
                        else
                        {
                            seq.loopCount = count;
                        }
                        break;
                    
                    case SpessaSynthSequencerMessageType.changeSong:
                        switch (messageData[0])
                        {
                            case SongChangeType.forwards:
                                seq.nextSong();
                                break;
                            
                            case SongChangeType.backwards:
                                seq.previousSong();
                                break;
                            
                            case SongChangeType.shuffleOff:
                                seq.shuffleMode = false;
                                seq.songIndex = seq.shuffledSongIndexes[seq.songIndex];
                                break;
                            
                            case SongChangeType.shuffleOn:
                                seq.shuffleMode = true;
                                seq.shuffleSongIndexes();
                                seq.songIndex = 0;
                                seq.loadCurrentSong();
                                break;
                            
                            case SongChangeType.index:
                                seq.songIndex = messageData[1];
                                seq.loadCurrentSong();
                                break;
                        }
                        break;
                    
                    case SpessaSynthSequencerMessageType.getMIDI:
                        this.postMessageToMainThread({
                            messageType: returnMessageType.sequencerSpecific,
                            messageData: {
                                messageType: SpessaSynthSequencerReturnMessageType.getMIDI,
                                messageData: seq.midiData
                            }
                        });
                        break;
                    
                    case SpessaSynthSequencerMessageType.setSkipToFirstNote:
                        seq.skipToFirstNoteOn = messageData;
                        break;
                    
                    case SpessaSynthSequencerMessageType.setPreservePlaybackState:
                        seq.preservePlaybackState = messageData;
                }
                break;
            
            case workletMessageType.soundFontManager:
                try
                {
                    const sfman = this.synthesizer.soundfontManager;
                    const type = data[0];
                    const messageData = data[1];
                    switch (type)
                    {
                        case WorkletSoundfontManagerMessageType.addNewSoundFont:
                            sfman.addNewSoundFont(messageData[0], messageData[1], messageData[2]);
                            break;
                        
                        case WorkletSoundfontManagerMessageType.reloadSoundFont:
                            sfman.reloadManager(messageData);
                            break;
                        
                        case WorkletSoundfontManagerMessageType.deleteSoundFont:
                            sfman.deleteSoundFont(messageData);
                            break;
                        
                        case WorkletSoundfontManagerMessageType.rearrangeSoundFonts:
                            sfman.rearrangeSoundFonts(messageData);
                    }
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
                const keyMessageData = data[1];
                switch (keyMessageType)
                {
                    default:
                        return;
                    
                    case workletKeyModifierMessageType.addMapping:
                        man.addMapping(...keyMessageData);
                        break;
                    
                    case workletKeyModifierMessageType.clearMappings:
                        man.clearMappings();
                        break;
                    
                    case workletKeyModifierMessageType.deleteMapping:
                        man.deleteMapping(...keyMessageData);
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
                delete this.synthesizer;
                delete this.sequencer.midiData;
                delete this.sequencer;
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
        // process sequencer
        this.sequencer.processTick();
        
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