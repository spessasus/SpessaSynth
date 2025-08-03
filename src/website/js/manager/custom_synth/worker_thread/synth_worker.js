import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    BasicMIDI,
    BasicSoundBank,
    loadSoundFont,
    masterParameterType,
    MIDI,
    SpessaSynthCoreUtils as util,
    SpessaSynthLogging,
    SpessaSynthProcessor,
    SpessaSynthSequencer,
    SynthesizerSnapshot
} from "spessasynth_core";
import {
    returnMessageType,
    seqMessageType,
    SongChangeType,
    SpessaSynthSequencerReturnMessageType,
    workerKeyModifierMessageType,
    workerMessageType,
    WorkerSoundfontManagerMessageType
} from "./worker_message.js";
import { MIDIData } from "./midi_data.js";
import { renderAudio } from "./render_audio.js";
import { EXTRA_BANK_ID } from "../../extra_bank_id.js";
import { exportSoundBank } from "./export_sf.js";
import { exportMIDI } from "./export_midi.js";
import { exportRMIDI } from "./export_rmidi.js";


const BLOCK_SIZE = 128;
const MAX_CHUNKS_QUEUED = 16; // 16 * 128 = 2,048

/*
This file emulates the worklet_processor.js from spessasynth_lib. However, it also provides an offline rendering method to avoid copying the SF file array buffer, as these can be LARGE.
The main thread controller is replaced with CustomSynth, however, the Sequencer is left as-is, and its messages are interpreted here.
 */

class WorkerSynthEngine
{
    /**
     * @type {SpessaSynthProcessor|undefined}
     */
    synthEngine = undefined;
    
    /**
     * @type {SpessaSynthSequencer|undefined}
     */
    seqEngine = undefined;
    
    /**
     * @type {undefined|BasicSoundBank}
     */
    soundBank = undefined;
    
    /**
     * the mesage port to the playback audio worklet
     * @type {undefined|MessagePort}
     */
    workletPort = undefined;
    
    // set as nothing to render, the worklet will set to the required number
    toRender = 0;
    
    loopOn = true;
    
    /**
     * @type {null|BasicSoundBank}
     */
    extraSoundBank = null;
    /**
     * @type {number}
     */
    extraSoundBankOffset = 0;
    
    checkExtraSoundBank()
    {
        this.extraSoundBank = null;
        this.extraSoundBankOffset = 0;
        this.synthEngine.soundfontManager.soundfontList.forEach(l =>
        {
            if (l.id === EXTRA_BANK_ID)
            {
                this.extraSoundBank = l.soundfont;
                this.extraSoundBankOffset = l.bankOffset;
            }
        });
    }
    
    /**
     * @param t {returnMessageType}
     * @param d {any}
     * @param transferable {Transferable[]?}
     */
    postSyn(t, d, transferable = [])
    {
        // noinspection JSCheckFunctionSignatures
        postMessage({
            messageType: t,
            messageData: d
        }, transferable);
    };
    
    handleWorkletMessage(e)
    {
        this.toRender = Math.max(0, MAX_CHUNKS_QUEUED - e.data);
        
        
    }
    
    // we are using intervals to wait for the chunk to finish rendering, we don't want to schedule another before this one is done!
    renderLoop()
    {
        if (this.toRender < 1)
        {
            // post an empty message (request enqueued chunk count update)
            this.workletPort.postMessage(undefined);
            setTimeout(this.renderLoop.bind(this));
            return;
        }
        for (; this.toRender > 0; this.toRender--)
        {
            // data is encoded into a single f32 array as follows
            // revL, revR
            // chrL, chrR,
            // dry1L, dry1R
            // dryNL, dryNR
            // dry16L, dry16R
            // to improve performance
            
            const byteStep = BLOCK_SIZE * Float32Array.BYTES_PER_ELEMENT;
            const data = new Float32Array(BLOCK_SIZE * 36);
            let byteOffset = 0;
            const revR = new Float32Array(data.buffer, byteOffset, BLOCK_SIZE);
            byteOffset += byteStep;
            const revL = new Float32Array(data.buffer, byteOffset, BLOCK_SIZE);
            const rev = [revL, revR];
            byteOffset += byteStep;
            const chrL = new Float32Array(data.buffer, byteOffset, BLOCK_SIZE);
            byteOffset += byteStep;
            const chrR = new Float32Array(data.buffer, byteOffset, BLOCK_SIZE);
            const chr = [chrL, chrR];
            /**
             * @type {AudioChunks}
             */
            const dry = [];
            for (let i = 0; i < 16; i++)
            {
                byteOffset += byteStep;
                const dryL = new Float32Array(data.buffer, byteOffset, BLOCK_SIZE);
                byteOffset += byteStep;
                const dryR = new Float32Array(data.buffer, byteOffset, BLOCK_SIZE);
                dry.push([dryL, dryR]);
            }
            
            this.seqEngine.processTick();
            this.synthEngine.renderAudioSplit(rev, chr, dry);
            this.workletPort.postMessage(data, [data.buffer]);
        }
        this.toRender = 0;
        if (this.loopOn)
        {
            setTimeout(this.renderLoop.bind(this));
        }
    };
    
    startAudioLoop()
    {
        this.loopOn = true;
        this.renderLoop();
    }
    
    stopAudioLoop()
    {
        this.synthEngine.stopAllChannels(true);
        this.seqEngine.pause();
        this.loopOn = false;
    }
    
    syncTime()
    {
        this.synthEngine.midiAudioChannels[0].sendChannelProperty();
    }
    
    resumeSeq()
    {
        this.syncTime();
        this.seqEngine.currentTime -= 0.001;
    }
    
    async initSynthEngine(sampleRate, initialTime)
    {
        this.synthEngine = new SpessaSynthProcessor(sampleRate, {
            initialTime
        });
        this.seqEngine = new SpessaSynthSequencer(this.synthEngine);
        this.synthEngine.onEventCall = (t, d) =>
        {
            this.postSyn(returnMessageType.eventCall, {
                eventName: t,
                eventData: d
            });
        };
        this.synthEngine.onChannelPropertyChange = (p, n) => this.postSyn(
            returnMessageType.channelPropertyChange,
            [n, p, this.synthEngine.currentSynthTime]
        );
        this.synthEngine.onMasterParameterChange = (t, v) => this.postSyn(
            returnMessageType.masterParameterChange,
            [t, v]
        );
        await this.synthEngine.processorInitialized;
        
        
        const postSeq = (type, data) =>
        {
            postMessage({
                messageType: returnMessageType.sequencerSpecific,
                messageData: {
                    messageType: type,
                    messageData: data
                }
            });
        };
        // sequencer events
        this.seqEngine.onMIDIMessage = m =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.midiEvent, m);
        };
        this.seqEngine.onTimeChange = t =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.timeChange, t);
        };
        this.seqEngine.onPlaybackStop = p =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.pause, p);
        };
        this.seqEngine.onSongChange = (i, a) =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.songChange, [i, a, this.seqEngine.currentTime]);
        };
        this.seqEngine.onMetaEvent = (e, i) =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.metaEvent, [e, i]);
        };
        this.seqEngine.onLoopCountChange = c =>
        {
            postSeq(SpessaSynthSequencerReturnMessageType.loopCountChange, c);
        };
        this.seqEngine.onSongListChange = l =>
        {
            const midiDataList = l.map(s => new MIDIData(s));
            postMessage({
                messageType: returnMessageType.sequencerSpecific,
                messageData: {
                    messageType: SpessaSynthSequencerReturnMessageType.songListChange,
                    messageData: midiDataList
                }
            });
        };
        
        // initial queue
        this.startAudioLoop();
    }
    
    /**
     * @param e {MessageEvent}
     * @returns {Promise<void>}
     */
    async handleMainThreadMessage(e)
    {
        if (e.ports[0])
        {
            const port = e.ports[0];
            this.workletPort = port;
            port.onmessage = this.handleWorkletMessage.bind(this);
        }
        /**
         * @type {WorkerMessage}
         */
        const msg = e.data;
        const data = msg.messageData;
        const channel = msg.channelNumber;
        
        let channelObject;
        if (channel >= 0)
        {
            channelObject = this.synthEngine.midiAudioChannels[channel];
            if (channelObject === undefined)
            {
                util.SpessaSynthWarn(`Trying to access channel ${channel} which does not exist... ignoring!`);
                return;
            }
        }
        
        const seq = this.seqEngine;
        switch (msg.messageType)
        {
            case workerMessageType.sampleRate:
                await this.initSynthEngine(...data);
                break;
            
            case workerMessageType.initialSoundBank:
                this.soundBank = loadSoundFont(data);
                this.synthEngine.soundfontManager.addNewSoundFont(this.soundBank, "main", 0);
                break;
            
            case workerMessageType.midiMessage:
                this.synthEngine.processMessage(...data);
                break;
            
            case workerMessageType.customCcChange:
                // custom controller change
                channelObject.setCustomController(data[0], data[1]);
                break;
            
            case workerMessageType.ccReset:
                if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    this.synthEngine.resetAllControllers();
                }
                else
                {
                    channelObject.resetControllers();
                }
                break;
            
            case workerMessageType.setChannelVibrato:
                if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    for (let i = 0; i < this.synthEngine.midiAudioChannels.length; i++)
                    {
                        const chan = this.synthEngine.midiAudioChannels[i];
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
            
            case workerMessageType.stopAll:
                if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    this.synthEngine.stopAllChannels(data === 1);
                }
                else
                {
                    channelObject.stopAllNotes(data === 1);
                }
                break;
            
            case workerMessageType.killNotes:
                this.synthEngine.voiceKilling(data);
                break;
            
            case workerMessageType.muteChannel:
                channelObject.muteChannel(data);
                break;
            
            case workerMessageType.addNewChannel:
                this.synthEngine.createMidiChannel(true);
                break;
            
            case workerMessageType.debugMessage:
                console.debug(this.synthEngine);
                break;
            
            case workerMessageType.setMasterParameter:
                /**
                 * @type {masterParameterType}
                 */
                const type = data[0];
                const value = data[1];
                this.synthEngine.setMasterParameter(type, value);
                break;
            
            case workerMessageType.setDrums:
                channelObject.setDrums(data);
                break;
            
            case workerMessageType.transpose:
                if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    this.synthEngine.transposeAllChannels(data[0], data[1]);
                }
                else
                {
                    channelObject.transposeChannel(data[0], data[1]);
                }
                break;
            
            case workerMessageType.highPerformanceMode:
                this.synthEngine.highPerformanceMode = data;
                break;
            
            case workerMessageType.lockController:
                if (data[0] === ALL_CHANNELS_OR_DIFFERENT_ACTION)
                {
                    channelObject.setPresetLock(data[1]);
                }
                else
                {
                    channelObject.lockedControllers[data[0]] = data[1];
                }
                break;
            
            case workerMessageType.sequencerSpecific:
                const messageData = data.messageData;
                const messageType = data.messageType;
                switch (messageType)
                {
                    default:
                        break;
                    
                    case seqMessageType.loadNewSongList:
                        try
                        {
                            /**
                             * @type {(BasicMIDI|{binary: ArrayBuffer, altName: string})[]}
                             */
                            const sList = messageData[0];
                            const songMap = sList.map(s =>
                            {
                                if (s.duration)
                                {
                                    return s;
                                }
                                return new MIDI(s.binary, s.altName);
                            });
                            seq.loadNewSongList(songMap, messageData[1]);
                        }
                        catch (e)
                        {
                            console.error(e);
                            postMessage({
                                messageType: returnMessageType.sequencerSpecific,
                                messageData: {
                                    messageType: SpessaSynthSequencerReturnMessageType.midiError,
                                    messageData: e
                                }
                            });
                        }
                        break;
                    
                    case seqMessageType.pause:
                        seq.pause();
                        break;
                    
                    case seqMessageType.play:
                        seq.play(messageData);
                        this.syncTime();
                        break;
                    
                    case seqMessageType.stop:
                        seq.stop();
                        break;
                    
                    case seqMessageType.setTime:
                        seq.currentTime = messageData;
                        break;
                    
                    case seqMessageType.changeMIDIMessageSending:
                        seq.sendMIDIMessages = messageData;
                        break;
                    
                    case seqMessageType.setPlaybackRate:
                        seq.playbackRate = messageData;
                        break;
                    
                    case seqMessageType.setLoop:
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
                    
                    case seqMessageType.changeSong:
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
                    
                    case seqMessageType.getMIDI:
                        postMessage({
                            messageType: returnMessageType.sequencerSpecific,
                            messageData: {
                                messageType: SpessaSynthSequencerReturnMessageType.getMIDI,
                                messageData: seq.midiData
                            }
                        });
                        break;
                    
                    case seqMessageType.setSkipToFirstNote:
                        seq.skipToFirstNoteOn = messageData;
                        break;
                    
                    case seqMessageType.setPreservePlaybackState:
                        seq.preservePlaybackState = messageData;
                }
                this.syncTime();
                break;
            
            case workerMessageType.soundFontManager:
                try
                {
                    const sfManager = this.synthEngine.soundfontManager;
                    const type = data[0];
                    const messageData = data[1];
                    switch (type)
                    {
                        case WorkerSoundfontManagerMessageType.addNewSoundFont:
                            this.soundBank = loadSoundFont(messageData[0]);
                            sfManager.addNewSoundFont(this.soundBank, messageData[1], messageData[2]);
                            postMessage({
                                messageType: returnMessageType.isFullyInitialized,
                                messageData: undefined
                            });
                            break;
                        
                        case WorkerSoundfontManagerMessageType.deleteSoundFont:
                            sfManager.deleteSoundFont(messageData);
                            break;
                        
                        case WorkerSoundfontManagerMessageType.rearrangeSoundFonts:
                            sfManager.rearrangeSoundFonts(messageData);
                        
                    }
                    this.checkExtraSoundBank();
                }
                catch (e)
                {
                    postMessage({
                        messageType: returnMessageType.soundfontError,
                        messageData: e
                    });
                }
                this.syncTime();
                break;
            
            case workerMessageType.keyModifierManager:
                /**
                 * @type {workerKeyModifierMessageType}
                 */
                const keyMessageType = data[0];
                const man = this.synthEngine.keyModifierManager;
                const keyMessageData = data[1];
                switch (keyMessageType)
                {
                    default:
                        return;
                    
                    case workerKeyModifierMessageType.addMapping:
                        man.addMapping(...keyMessageData);
                        break;
                    
                    case workerKeyModifierMessageType.clearMappings:
                        man.clearMappings();
                        break;
                    
                    case workerKeyModifierMessageType.deleteMapping:
                        man.deleteMapping(...keyMessageData);
                }
                break;
            
            case workerMessageType.requestSynthesizerSnapshot:
                const snapshot = SynthesizerSnapshot.createSynthesizerSnapshot(this.synthEngine);
                postMessage({
                    messageType: returnMessageType.synthesizerSnapshot,
                    messageData: snapshot
                });
                break;
            
            case workerMessageType.setLogLevel:
                SpessaSynthLogging(data[0], data[1], data[2], data[3]);
                break;
            
            case workerMessageType.setEffectsGain:
                this.synthEngine.reverbGain = data[0];
                this.synthEngine.chorusGain = data[1];
                break;
            
            case workerMessageType.renderAudio:
                const rendered = await this.renderAudio(
                    this.extraSoundBank,
                    this.extraSoundBankOffset,
                    data.sampleRate,
                    data.separateChannels,
                    data.loopCount,
                    data.additionalTime,
                    (p) => this.postSyn(returnMessageType.renderingProgress, p)
                );
                const transfer = [];
                rendered.forEach(r => r.forEach(arr => transfer.push(arr.buffer)));
                postMessage({
                    messageType: returnMessageType.exportedData,
                    messageData: rendered
                }, transfer);
                break;
            
            case workerMessageType.exportSoundBank:
            {
                const exported = await this.exportSoundBank(
                    data.isSf2,
                    data.trim,
                    data.compress,
                    data.quality
                );
                this.postSyn(returnMessageType.exportedData, exported);
            }
                break;
            
            case workerMessageType.exportMIDI:
            {
                const exported = this.exportMIDI();
                this.postSyn(returnMessageType.exportedData, exported);
            }
                break;
            
            case workerMessageType.exportRMI:
            {
                if (data === undefined)
                {
                    // recommended settings
                    this.postSyn(returnMessageType.exportedData, this.getRecommendedRMIDISettings());
                }
                else
                {
                    const exported = await this.exportRMIDI(
                        data.compress,
                        data.quality,
                        data.metadata,
                        data.adjust
                    );
                    this.postSyn(returnMessageType.exportedData, exported);
                }
            }
                break;
            
            default:
                util.SpessaSynthWarn("Unrecognized event:", data);
                break;
        }
    }
    
    
    /**
     * @returns {{compress: boolean, adjust: boolean}}
     */
    getRecommendedRMIDISettings()
    {
        const mid = this.seqEngine.midiData;
        // pick a bank:
        // if midi has an embedded bank, use that
        // if we have an extra bank, use that
        // otherwise pick the normal bank
        const fontBuffer = mid.embeddedSoundFont || this.extraSoundBank || this.soundBank;
        
        return {
            compress: true,
            adjust: fontBuffer === this.soundBank
        };
    }
}

WorkerSynthEngine.prototype.renderAudio = renderAudio;
WorkerSynthEngine.prototype.exportSoundBank = exportSoundBank;
WorkerSynthEngine.prototype.exportMIDI = exportMIDI;
WorkerSynthEngine.prototype.exportRMIDI = exportRMIDI;

const worker = new WorkerSynthEngine();
onmessage = worker.handleMainThreadMessage.bind(worker);


