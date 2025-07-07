import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    BasicMIDI,
    BasicSoundBank,
    loadSoundFont,
    masterParameterType,
    MIDI,
    MIDISequenceData,
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

/*
This file emulates the worklet_processor.js from spessasynth_lib. However, it also provides an offline rendering method to avoid copying the SF file array buffer, as these can be LARGE
The main thread controller is replaced with CustomSynth, however, the Sequencer is left as-is, and its messages are interpreted here.
 */

/**
 * @type {SpessaSynthProcessor|undefined}
 */
let synthEngine = undefined;

/**
 * @type {SpessaSynthSequencer|undefined}
 */
let seqEngine = undefined;

/**
 * @type {undefined|BasicSoundBank}
 */
let soundBank = undefined;


const BLOCK_SIZE = 128;
const MAX_CHUNKS_QUEUED = 16; // 16 * 128 = 2,048


/**
 * @param t {returnMessageType}
 * @param d {any}
 */
const postSyn = (t, d) =>
{
    // noinspection JSCheckFunctionSignatures
    postMessage({
        messageType: t,
        messageData: d
    });
};
/**
 * @type {undefined|MessagePort}
 */
let workletPort = undefined;

const renderLoop = (queuedChunks) =>
{
    if (queuedChunks >= MAX_CHUNKS_QUEUED)
    {
        return;
    }
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
    
    seqEngine.processTick();
    synthEngine.renderAudioSplit(rev, chr, dry);
    workletPort.postMessage(data, [data.buffer]);
};


class MIDIData extends MIDISequenceData
{
    
    /**
     * A boolean indicating if the MIDI file contains an embedded soundfont.
     * If the embedded soundfont is undefined, this will be false.
     * @type {boolean}
     */
    isEmbedded = false;
    
    /**
     * Constructor that copies data from a BasicMIDI instance.
     * @param {BasicMIDI} midi - The BasicMIDI instance to copy data from.
     */
    constructor(midi)
    {
        super();
        this._copyFromSequence(midi);
        
        // Set isEmbedded based on the presence of an embeddedSoundFont
        this.isEmbedded = midi.embeddedSoundFont !== undefined;
    }
}

const initSynthEngine = async (sampleRate, initialTime) =>
{
    synthEngine = new SpessaSynthProcessor(sampleRate, {
        initialTime
    });
    seqEngine = new SpessaSynthSequencer(synthEngine);
    synthEngine.onEventCall = (t, d) =>
    {
        postSyn(returnMessageType.eventCall, {
            eventName: t,
            eventData: d
        });
    };
    synthEngine.onChannelPropertyChange = (p, n) => postSyn(
        returnMessageType.channelPropertyChange,
        [n, p, synthEngine.currentSynthTime]
    );
    synthEngine.onMasterParameterChange = (t, v) => postSyn(returnMessageType.masterParameterChange, [t, v]);
    await synthEngine.processorInitialized;
    
    
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
    seqEngine.onMIDIMessage = m =>
    {
        postSeq(SpessaSynthSequencerReturnMessageType.midiEvent, m);
    };
    seqEngine.onTimeChange = t =>
    {
        postSeq(SpessaSynthSequencerReturnMessageType.timeChange, t);
    };
    seqEngine.onPlaybackStop = p =>
    {
        postSeq(SpessaSynthSequencerReturnMessageType.pause, p);
    };
    seqEngine.onSongChange = (i, a) =>
    {
        postSeq(SpessaSynthSequencerReturnMessageType.songChange, [i, a]);
    };
    seqEngine.onMetaEvent = (e, i) =>
    {
        postSeq(SpessaSynthSequencerReturnMessageType.metaEvent, [e, i]);
    };
    seqEngine.onLoopCountChange = c =>
    {
        postSeq(SpessaSynthSequencerReturnMessageType.loopCountChange, c);
    };
    seqEngine.onSongListChange = l =>
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
    for (let i = 0; i < MAX_CHUNKS_QUEUED; i++)
    {
        renderLoop(0);
    }
};


onmessage = async e =>
{
    if (e.ports[0])
    {
        workletPort = e.ports[0];
        workletPort.onmessage = async ev =>
        {
            renderLoop(ev.data);
        };
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
        channelObject = synthEngine.midiAudioChannels[channel];
        if (channelObject === undefined)
        {
            util.SpessaSynthWarn(`Trying to access channel ${channel} which does not exist... ignoring!`);
            return;
        }
    }
    switch (msg.messageType)
    {
        case workerMessageType.sampleRate:
            await initSynthEngine(...data);
            break;
        
        case workerMessageType.initialSoundBank:
            soundBank = loadSoundFont(data);
            synthEngine.soundfontManager.addNewSoundFont(soundBank, "main", 0);
            break;
        
        case workerMessageType.midiMessage:
            synthEngine.processMessage(...data);
            break;
        
        case workerMessageType.customCcChange:
            // custom controller change
            channelObject.setCustomController(data[0], data[1]);
            break;
        
        case workerMessageType.ccReset:
            if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                synthEngine.resetAllControllers();
            }
            else
            {
                channelObject.resetControllers();
            }
            break;
        
        case workerMessageType.setChannelVibrato:
            if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                for (let i = 0; i < synthEngine.midiAudioChannels.length; i++)
                {
                    const chan = synthEngine.midiAudioChannels[i];
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
                synthEngine.stopAllChannels(data === 1);
            }
            else
            {
                channelObject.stopAllNotes(data === 1);
            }
            break;
        
        case workerMessageType.killNotes:
            synthEngine.voiceKilling(data);
            break;
        
        case workerMessageType.muteChannel:
            channelObject.muteChannel(data);
            break;
        
        case workerMessageType.addNewChannel:
            synthEngine.createMidiChannel(true);
            break;
        
        case workerMessageType.debugMessage:
            console.debug(synthEngine);
            break;
        
        case workerMessageType.setMasterParameter:
            /**
             * @type {masterParameterType}
             */
            const type = data[0];
            const value = data[1];
            synthEngine.setMasterParameter(type, value);
            break;
        
        case workerMessageType.setDrums:
            channelObject.setDrums(data);
            break;
        
        case workerMessageType.transpose:
            if (channel === ALL_CHANNELS_OR_DIFFERENT_ACTION)
            {
                synthEngine.transposeAllChannels(data[0], data[1]);
            }
            else
            {
                channelObject.transposeChannel(data[0], data[1]);
            }
            break;
        
        case workerMessageType.highPerformanceMode:
            synthEngine.highPerformanceMode = data;
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
            const seq = seqEngine;
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
            break;
        
        case workerMessageType.soundFontManager:
            try
            {
                const sfManager = synthEngine.soundfontManager;
                const type = data[0];
                const messageData = data[1];
                let font;
                switch (type)
                {
                    case WorkerSoundfontManagerMessageType.addNewSoundFont:
                        font = loadSoundFont(messageData[0]);
                        sfManager.addNewSoundFont(font, messageData[1], messageData[2]);
                        postMessage({
                            messageType: returnMessageType.isFullyInitialized,
                            messageData: undefined
                        });
                        break;
                }
            }
            catch (e)
            {
                postMessage({
                    messageType: returnMessageType.soundfontError,
                    messageData: e
                });
            }
            break;
        
        case workerMessageType.keyModifierManager:
            /**
             * @type {workerKeyModifierMessageType}
             */
            const keyMessageType = data[0];
            const man = synthEngine.keyModifierManager;
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
            const snapshot = SynthesizerSnapshot.createSynthesizerSnapshot(synthEngine);
            postMessage({
                messageType: returnMessageType.synthesizerSnapshot,
                messageData: snapshot
            });
            break;
        
        case workerMessageType.setLogLevel:
            SpessaSynthLogging(data[0], data[1], data[2], data[3]);
            break;
        
        case workerMessageType.setEffectsGain:
            synthEngine.reverbGain = data[0];
            synthEngine.chorusGain = data[1];
            break;
        
        default:
            util.SpessaSynthWarn("Unrecognized event:", data);
            break;
    }
};


