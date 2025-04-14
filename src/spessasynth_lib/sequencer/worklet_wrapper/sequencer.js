import { Synthetizer } from "../../synthetizer/worklet_wrapper/synthetizer.js";
import { messageTypes } from "../../midi/midi_message.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    workletMessageType
} from "../../synthetizer/worklet_wrapper/worklet_message.js";
import {
    SongChangeType,
    SpessaSynthSequencerMessageType,
    SpessaSynthSequencerReturnMessageType
} from "./sequencer_message.js";
import { SpessaSynthWarn } from "../../utils/loggin.js";
import { DUMMY_MIDI_DATA, MIDIData } from "../../midi/midi_data.js";
import { BasicMIDI } from "../../midi/basic_midi.js";
import { readBytesAsUintBigEndian } from "../../utils/byte_functions/big_endian.js";
import { DEFAULT_SEQUENCER_OPTIONS } from "./default_sequencer_options.js";

/**
 * sequencer.js
 * purpose: plays back the midi file decoded by midi_loader.js, including support for multichannel midis
 * (adding channels when more than one midi port is detected)
 * note: this is the sequencer class that runs on the main thread
 * and only communicates with the worklet sequencer which does the actual playback
 */

/**
 * @typedef MidFile {Object}
 * @property {ArrayBuffer} binary - the binary data of the file.
 * @property {string|undefined} altName - the alternative name for the file
 */

/**
 * @typedef {BasicMIDI|MidFile} MIDIFile
 */

// noinspection JSUnusedGlobalSymbols
/**
 * @typedef {Object} SequencerOptions
 * @property {boolean|undefined} skipToFirstNoteOn - if true, the sequencer will skip to the first note
 * @property {boolean|undefined} autoPlay - if true, the sequencer will automatically start playing the MIDI
 * @property {boolean|unescape} preservePlaybackState - if true,
 * the sequencer will stay paused when seeking or changing the playback rate
 */

// noinspection JSUnusedGlobalSymbols
export class Sequencer
{
    /**
     * Executes when MIDI parsing has an error.
     * @type {function(Error)}
     */
    onError;
    
    /**
     * Fires on text event
     * @type {Function}
     * @param data {Uint8Array} the data text
     * @param type {number} the status byte of the message (the meta-status byte)
     * @param lyricsIndex {number} if the text is a lyric, the index of the lyric in midiData.lyrics, otherwise -1
     */
    onTextEvent;
    
    /**
     * The current MIDI data, with the exclusion of the embedded sound bank and event data.
     *  @type {MIDIData}
     */
    midiData;
    
    /**
     * The current MIDI data for all songs, like the midiData property.
     * @type {MIDIData[]}
     */
    songListData = [];
    
    /**
     * @type {Object<string, function(MIDIData)>}
     * @private
     */
    onSongChange = {};
    
    /**
     * Fires when CurrentTime changes
     * @type {Object<string, function(number)>} the time that was changed to
     * @private
     */
    onTimeChange = {};
    
    /**
     * @type {Object<string, function>}
     * @private
     */
    onSongEnded = {};
    
    /**
     * Fires on tempo change
     * @type {Object<string, function(number)>}
     */
    onTempoChange = {};
    
    /**
     * Fires on meta-event
     * @type {Object<string, function([number, Uint8Array, number, number])>}
     */
    onMetaEvent = {};
    
    /**
     * Current song's tempo in BPM
     * @type {number}
     */
    currentTempo = 120;
    /**
     * Current song index
     * @type {number}
     */
    songIndex = 0;
    /**
     * @type {function(BasicMIDI)}
     * @private
     */
    _getMIDIResolve = undefined;
    /**
     * Indicates if the current midiData property has fake data in it (not yet loaded)
     * @type {boolean}
     */
    hasDummyData = true;
    /**
     * Indicates whether the sequencer has finished playing a sequence
     * @type {boolean}
     */
    isFinished = false;
    /**
     * The current sequence's length, in seconds
     * @type {number}
     */
    duration = 0;
    
    /**
     * Indicates if the sequencer is paused.
     * Paused if a number, undefined if playing
     * @type {undefined|number}
     * @private
     */
    pausedTime = undefined;
    
    /**
     * Creates a new Midi sequencer for playing back MIDI files
     * @param midiBinaries {MIDIFile[]} List of the buffers of the MIDI files
     * @param synth {Synthetizer} synth to send events to
     * @param options {SequencerOptions} the sequencer's options
     */
    constructor(midiBinaries, synth, options = DEFAULT_SEQUENCER_OPTIONS)
    {
        this.ignoreEvents = false;
        this.synth = synth;
        this.highResTimeOffset = 0;
        
        /**
         * Absolute playback startTime, bases on the synth's time
         * @type {number}
         */
        this.absoluteStartTime = this.synth.currentTime;
        
        this.synth.sequencerCallbackFunction = this._handleMessage.bind(this);
        
        /**
         * @type {boolean}
         * @private
         */
        this._skipToFirstNoteOn = options?.skipToFirstNoteOn ?? true;
        /**
         * @type {boolean}
         * @private
         */
        this._preservePlaybackState = options?.preservePlaybackState ?? false;
        
        if (this._skipToFirstNoteOn === false)
        {
            // setter sends message
            this._sendMessage(SpessaSynthSequencerMessageType.setSkipToFirstNote, false);
        }
        
        if (this._preservePlaybackState === true)
        {
            this._sendMessage(SpessaSynthSequencerMessageType.setPreservePlaybackState, true);
        }
        
        this.loadNewSongList(midiBinaries, options?.autoPlay ?? true);
        
        window.addEventListener("beforeunload", this.resetMIDIOut.bind(this));
    }
    
    /**
     * Internal loop marker
     * @type {boolean}
     * @private
     */
    _loop = true;
    
    /**
     * Indicates if the sequencer is currently looping
     * @returns {boolean}
     */
    get loop()
    {
        return this._loop;
    }
    
    set loop(value)
    {
        this._sendMessage(SpessaSynthSequencerMessageType.setLoop, [value, this._loopsRemaining]);
        this._loop = value;
    }
    
    /**
     * Internal loop count marker (-1 is infinite)
     * @type {number}
     * @private
     */
    _loopsRemaining = -1;
    
    /**
     * The current remaining number of loops. -1 means infinite looping
     * @returns {number}
     */
    get loopsRemaining()
    {
        return this._loopsRemaining;
    }
    
    /**
     * The current remaining number of loops. -1 means infinite looping
     * @param val {number}
     */
    set loopsRemaining(val)
    {
        this._loopsRemaining = val;
        this._sendMessage(SpessaSynthSequencerMessageType.setLoop, [this._loop, val]);
    }
    
    /**
     * Controls the playback's rate
     * @type {number}
     * @private
     */
    _playbackRate = 1;
    
    /**
     * @returns {number}
     */
    get playbackRate()
    {
        return this._playbackRate;
    }
    
    /**
     * @param value {number}
     */
    set playbackRate(value)
    {
        this._sendMessage(SpessaSynthSequencerMessageType.setPlaybackRate, value);
        this.highResTimeOffset *= (value / this._playbackRate);
        this._playbackRate = value;
    }
    
    /**
     * @type {boolean}
     * @private
     */
    _shuffleSongs = false;
    
    /**
     * Indicates if the song order is random
     * @returns {boolean}
     */
    get shuffleSongs()
    {
        return this._shuffleSongs;
    }
    
    /**
     * Indicates if the song order is random
     * @param value {boolean}
     */
    set shuffleSongs(value)
    {
        this._shuffleSongs = value;
        if (value)
        {
            this._sendMessage(SpessaSynthSequencerMessageType.changeSong, [SongChangeType.shuffleOn]);
        }
        else
        {
            this._sendMessage(SpessaSynthSequencerMessageType.changeSong, [SongChangeType.shuffleOff]);
        }
    }
    
    /**
     * Indicates if the sequencer should skip to first note on
     * @return {boolean}
     */
    get skipToFirstNoteOn()
    {
        return this._skipToFirstNoteOn;
    }
    
    /**
     * Indicates if the sequencer should skip to first note on
     * @param val {boolean}
     */
    set skipToFirstNoteOn(val)
    {
        this._skipToFirstNoteOn = val;
        this._sendMessage(SpessaSynthSequencerMessageType.setSkipToFirstNote, this._skipToFirstNoteOn);
    }
    
    /**
     * if true,
     * the sequencer will stay paused when seeking or changing the playback rate
     * @returns {boolean}
     */
    get preservePlaybackState()
    {
        return this._preservePlaybackState;
    }
    
    /**
     * if true,
     * the sequencer will stay paused when seeking or changing the playback rate
     * @param val {boolean}
     */
    set preservePlaybackState(val)
    {
        this._preservePlaybackState = val;
        this._sendMessage(SpessaSynthSequencerMessageType.setPreservePlaybackState, val);
    }
    
    /**
     * @returns {number} Current playback time, in seconds
     */
    get currentTime()
    {
        // return the paused time if it's set to something other than undefined
        if (this.pausedTime !== undefined)
        {
            return this.pausedTime;
        }
        
        return (this.synth.currentTime - this.absoluteStartTime) * this._playbackRate;
    }
    
    set currentTime(time)
    {
        if (!this._preservePlaybackState)
        {
            this.unpause();
        }
        this._sendMessage(SpessaSynthSequencerMessageType.setTime, time);
    }
    
    /**
     * Use for visualization as it's not affected by the audioContext stutter
     * @returns {number}
     */
    get currentHighResolutionTime()
    {
        if (this.pausedTime !== undefined)
        {
            return this.pausedTime;
        }
        const highResTimeOffset = this.highResTimeOffset;
        const absoluteStartTime = this.absoluteStartTime;
        
        // sync performance.now to current time
        const performanceElapsedTime = ((performance.now() / 1000) - absoluteStartTime) * this._playbackRate;
        
        let currentPerformanceTime = highResTimeOffset + performanceElapsedTime;
        const currentAudioTime = this.currentTime;
        
        const smoothingFactor = 0.01 * this._playbackRate;
        
        // diff times smoothing factor
        const timeDifference = currentAudioTime - currentPerformanceTime;
        this.highResTimeOffset += timeDifference * smoothingFactor;
        
        // return a smoothed performance time
        currentPerformanceTime = this.highResTimeOffset + performanceElapsedTime;
        return currentPerformanceTime;
    }
    
    /**
     * true if paused, false if playing or stopped
     * @returns {boolean}
     */
    get paused()
    {
        return this.pausedTime !== undefined;
    }
    
    /**
     * Adds a new event that gets called when the song changes
     * @param callback {function(MIDIData)}
     * @param id {string} must be unique
     */
    addOnSongChangeEvent(callback, id)
    {
        this.onSongChange[id] = callback;
    }
    
    /**
     * Adds a new event that gets called when the song ends
     * @param callback {function}
     * @param id {string} must be unique
     */
    addOnSongEndedEvent(callback, id)
    {
        this.onSongEnded[id] = callback;
    }
    
    /**
     * Adds a new event that gets called when the time changes
     * @param callback {function(number)} the new time, in seconds
     * @param id {string} must be unique
     */
    addOnTimeChangeEvent(callback, id)
    {
        this.onTimeChange[id] = callback;
    }
    
    /**
     * Adds a new event that gets called when the tempo changes
     * @param callback {function(number)} the new tempo, in BPM
     * @param id {string} must be unique
     */
    addOnTempoChangeEvent(callback, id)
    {
        this.onTempoChange[id] = callback;
    }
    
    /**
     * Adds a new event that gets called when a meta-event occurs
     * @param callback {function([number, Uint8Array, number, number])} the meta-event type,
     * its data, the track number and MIDI ticks
     * @param id {string} must be unique
     */
    addOnMetaEvent(callback, id)
    {
        this.onMetaEvent[id] = callback;
    }
    
    resetMIDIOut()
    {
        if (!this.MIDIout)
        {
            return;
        }
        for (let i = 0; i < 16; i++)
        {
            this.MIDIout.send([messageTypes.controllerChange | i, 120, 0]); // all notes off
            this.MIDIout.send([messageTypes.controllerChange | i, 123, 0]); // all sound off
        }
        this.MIDIout.send([messageTypes.reset]); // reset
    }
    
    /**
     * @param messageType {SpessaSynthSequencerMessageType}
     * @param messageData {any}
     * @private
     */
    _sendMessage(messageType, messageData = undefined)
    {
        this.synth.post({
            channelNumber: ALL_CHANNELS_OR_DIFFERENT_ACTION,
            messageType: workletMessageType.sequencerSpecific,
            messageData: {
                messageType: messageType,
                messageData: messageData
            }
        });
    }
    
    /**
     * Switch to the next song in the playlist
     */
    nextSong()
    {
        this._sendMessage(SpessaSynthSequencerMessageType.changeSong, [SongChangeType.forwards]);
    }
    
    /**
     * Switch to the previous song in the playlist
     */
    previousSong()
    {
        this._sendMessage(SpessaSynthSequencerMessageType.changeSong, [SongChangeType.backwards]);
    }
    
    /**
     * Sets the song index in the playlist
     * @param index
     */
    setSongIndex(index)
    {
        const clamped = Math.max(Math.min(this.songsAmount - 1, index), 0);
        this._sendMessage(SpessaSynthSequencerMessageType.changeSong, [SongChangeType.index, clamped]);
    }
    
    /**
     * @param type {Object<string, function>}
     * @param params {any}
     * @private
     */
    _callEvents(type, params)
    {
        for (const key in type)
        {
            const callback = type[key];
            try
            {
                callback(params);
            }
            catch (e)
            {
                SpessaSynthWarn(`Failed to execute callback for ${callback[0]}:`, e);
            }
        }
    }
    
    /**
     * @param {SpessaSynthSequencerReturnMessageType} messageType
     * @param {any} messageData
     * @private
     */
    _handleMessage(messageType, messageData)
    {
        if (this.ignoreEvents)
        {
            return;
        }
        switch (messageType)
        {
            case SpessaSynthSequencerReturnMessageType.midiEvent:
                /**
                 * @type {number[]}
                 */
                let midiEventData = messageData;
                if (this.MIDIout)
                {
                    if (midiEventData[0] >= 0x80)
                    {
                        this.MIDIout.send(midiEventData);
                        return;
                    }
                }
                break;
            
            case SpessaSynthSequencerReturnMessageType.songChange:
                this.songIndex = messageData[0];
                const songChangeData = this.songListData[this.songIndex];
                this.midiData = songChangeData;
                this.hasDummyData = false;
                this.absoluteStartTime = 0;
                this.duration = this.midiData.duration;
                this._callEvents(this.onSongChange, songChangeData);
                // if is auto played, unpause
                if (messageData[1] === true)
                {
                    this.unpause();
                }
                break;
            
            case SpessaSynthSequencerReturnMessageType.timeChange:
                // message data is absolute time
                const time = messageData;
                this._callEvents(this.onTimeChange, time);
                this._recalculateStartTime(time);
                if (this.paused && this._preservePlaybackState)
                {
                    this.pausedTime = time;
                }
                else
                {
                    this.unpause();
                }
                break;
            
            case SpessaSynthSequencerReturnMessageType.pause:
                this.pausedTime = this.currentTime;
                this.isFinished = messageData;
                if (this.isFinished)
                {
                    this._callEvents(this.onSongEnded, undefined);
                }
                break;
            
            case SpessaSynthSequencerReturnMessageType.midiError:
                if (this.onError)
                {
                    this.onError(messageData);
                }
                else
                {
                    throw new Error("Sequencer error: " + messageData);
                }
                return;
            
            case SpessaSynthSequencerReturnMessageType.getMIDI:
                if (this._getMIDIResolve)
                {
                    this._getMIDIResolve(BasicMIDI.copyFrom(messageData));
                }
                break;
            
            case SpessaSynthSequencerReturnMessageType.metaEvent:
                /**
                 * @type {MIDIMessage}
                 */
                const event = messageData[0];
                switch (event.messageStatusByte)
                {
                    case messageTypes.setTempo:
                        event.messageData.currentIndex = 0;
                        const bpm = 60000000 / readBytesAsUintBigEndian(event.messageData, 3);
                        event.messageData.currentIndex = 0;
                        this.currentTempo = Math.round(bpm * 100) / 100;
                        if (this.onTempoChange)
                        {
                            this._callEvents(this.onTempoChange, this.currentTempo);
                        }
                        break;
                    
                    case messageTypes.text:
                    case messageTypes.lyric:
                    case messageTypes.copyright:
                    case messageTypes.trackName:
                    case messageTypes.marker:
                    case messageTypes.cuePoint:
                    case messageTypes.instrumentName:
                    case messageTypes.programName:
                        let lyricsIndex = -1;
                        if (event.messageStatusByte === messageTypes.lyric)
                        {
                            lyricsIndex = Math.min(
                                this.midiData.lyricsTicks.indexOf(event.ticks),
                                this.midiData.lyrics.length - 1
                            );
                        }
                        let sentStatus = event.messageStatusByte;
                        // if MIDI is a karaoke file, it uses the "text" event type or "lyrics" for lyrics (duh)
                        // why?
                        // because the MIDI standard is a messy pile of garbage,
                        // and it's not my fault that it's like this :(
                        // I'm just trying to make the best out of a bad situation.
                        // I'm sorry
                        // okay I should get back to work
                        // anyway,
                        // check for a karaoke file and change the status byte to "lyric"
                        // if it's a karaoke file
                        if (this.midiData.isKaraokeFile && (
                            event.messageStatusByte === messageTypes.text ||
                            event.messageStatusByte === messageTypes.lyric
                        ))
                        {
                            lyricsIndex = Math.min(
                                this.midiData.lyricsTicks.indexOf(event.ticks),
                                this.midiData.lyricsTicks.length
                            );
                            sentStatus = messageTypes.lyric;
                        }
                        if (this.onTextEvent)
                        {
                            this.onTextEvent(event.messageData, sentStatus, lyricsIndex, event.ticks);
                        }
                        break;
                }
                this._callEvents(this.onMetaEvent, messageData);
                break;
            
            case SpessaSynthSequencerReturnMessageType.loopCountChange:
                this._loopsRemaining = messageData;
                if (this._loopsRemaining === 0)
                {
                    this._loop = false;
                }
                break;
            
            case SpessaSynthSequencerReturnMessageType.songListChange:
                this.songListData = messageData;
                break;
            
            default:
                break;
        }
    }
    
    /**
     * @param time
     * @private
     */
    _recalculateStartTime(time)
    {
        this.absoluteStartTime = this.synth.currentTime - time / this._playbackRate;
        this.highResTimeOffset = (this.synth.currentTime - (performance.now() / 1000)) * this._playbackRate;
    }
    
    /**
     * @returns {Promise<MIDI>}
     */
    async getMIDI()
    {
        return new Promise(resolve =>
        {
            this._getMIDIResolve = resolve;
            this._sendMessage(SpessaSynthSequencerMessageType.getMIDI, undefined);
        });
    }
    
    /**
     * Loads a new song list
     * @param midiBuffers {MIDIFile[]} - the MIDI files to play
     * @param autoPlay {boolean} - if true, the first sequence will automatically start playing
     */
    loadNewSongList(midiBuffers, autoPlay = true)
    {
        this.pause();
        // add some fake data
        this.midiData = DUMMY_MIDI_DATA;
        this.hasDummyData = true;
        this.duration = 99999;
        /**
         * sanitize MIDIs
         * @type {({binary: ArrayBuffer, altName: string}|BasicMIDI)[]}
         */
        const sanitizedMidis = midiBuffers.map(m =>
        {
            if (m.binary !== undefined)
            {
                return m;
            }
            return BasicMIDI.copyFrom(m);
        });
        this._sendMessage(SpessaSynthSequencerMessageType.loadNewSongList, [sanitizedMidis, autoPlay]);
        this.songIndex = 0;
        this.songsAmount = midiBuffers.length;
        if (this.songsAmount > 1)
        {
            this.loop = false;
        }
        if (autoPlay === false)
        {
            this.pausedTime = this.currentTime;
        }
    }
    
    /**
     * @param output {MIDIOutput}
     */
    connectMidiOutput(output)
    {
        this.resetMIDIOut();
        this.MIDIout = output;
        this._sendMessage(SpessaSynthSequencerMessageType.changeMIDIMessageSending, output !== undefined);
        this.currentTime -= 0.1;
    }
    
    /**
     * Pauses the playback
     */
    pause()
    {
        if (this.paused)
        {
            SpessaSynthWarn("Already paused");
            return;
        }
        this.pausedTime = this.currentTime;
        this._sendMessage(SpessaSynthSequencerMessageType.pause);
    }
    
    unpause()
    {
        this.pausedTime = undefined;
        this.isFinished = false;
    }
    
    /**
     * Starts the playback
     * @param resetTime {boolean} If true, time is set to 0 s
     */
    play(resetTime = false)
    {
        if (this.isFinished)
        {
            resetTime = true;
        }
        this._recalculateStartTime(this.pausedTime || 0);
        this.unpause();
        this._sendMessage(SpessaSynthSequencerMessageType.play, resetTime);
    }
    
    /**
     * Stops the playback
     */
    stop()
    {
        this._sendMessage(SpessaSynthSequencerMessageType.stop);
    }
}