import { WorkletSequencerReturnMessageType } from "./sequencer_message.js";
import { _addNewMidiPort, _processEvent } from "./process_event.js";
import { _findFirstEventIndex, processTick } from "./process_tick.js";
import { assignMIDIPort, loadNewSequence, loadNewSongList, nextSong, previousSong } from "./song_control.js";
import { _playTo, _recalculateStartTime, play, setTimeTicks } from "./play.js";
import { messageTypes, midiControllers } from "../../midi_parser/midi_message.js";
import {
    post,
    processMessage,
    sendMIDICC,
    sendMIDIMessage,
    sendMIDIPitchWheel,
    sendMIDIProgramChange,
    sendMIDIReset
} from "./events.js";
import { SpessaSynthWarn } from "../../utils/loggin.js";

import { MIDI_CHANNEL_COUNT } from "../../synthetizer/synth_constants.js";

class WorkletSequencer
{
    /**
     * All the sequencer's songs
     * @type {BasicMIDI[]}
     */
    songs = [];
    
    /**
     * Current song index
     * @type {number}
     */
    songIndex = 0;
    
    /**
     * shuffled song indexes
     * @type {number[]}
     */
    shuffledSongIndexes = [];
    
    /**
     * the synth to use
     * @type {SpessaSynthProcessor}
     */
    synth;
    
    /**
     * if the sequencer is active
     * @type {boolean}
     */
    isActive = false;
    
    /**
     * If the event should instead be sent back to the main thread instead of synth
     * @type {boolean}
     */
    sendMIDIMessages = false;
    
    /**
     * sequencer's loop count
     * @type {number}
     */
    loopCount = Infinity;
    
    /**
     * event's number in this.events
     * @type {number[]}
     */
    eventIndex = [];
    
    /**
     * tracks the time that has already been played
     * @type {number}
     */
    playedTime = 0;
    
    /**
     * The (relative) time when the sequencer was paused. If it's not paused, then it's undefined.
     * @type {number}
     */
    pausedTime = undefined;
    
    /**
     * Absolute playback startTime, bases on the synth's time
     * @type {number}
     */
    absoluteStartTime = 0;
    /**
     * Currently playing notes (for pausing and resuming)
     * @type {{
     *     midiNote: number,
     *     channel: number,
     *     velocity: number
     * }[]}
     */
    playingNotes = [];
    
    /**
     * controls if the sequencer loops (defaults to true)
     * @type {boolean}
     */
    loop = true;
    
    /**
     * controls if the songs are ordered randomly
     * @type {boolean}
     */
    shuffleMode = false;
    
    /**
     * the current track data
     * @type {BasicMIDI}
     */
    midiData = undefined;
    
    /**
     * midi port number for the corresponding track
     * @type {number[]}
     */
    midiPorts = [];
    midiPortChannelOffset = 0;
    /**
     * stored as:
     * Object<midi port, channel offset>
     * @type {Object<number, number>}
     */
    midiPortChannelOffsets = {};
    
    /**
     * @type {boolean}
     */
    skipToFirstNoteOn = true;
    
    /**
     * If true, seq will stay paused when seeking or changing the playback rate
     * @type {boolean}
     */
    preservePlaybackState = false;
    
    /**
     * @param spessasynthProcessor {SpessaSynthProcessor}
     */
    constructor(spessasynthProcessor)
    {
        this.synth = spessasynthProcessor;
        this.absoluteStartTime = this.synth.currentSynthTime;
    }
    
    /**
     * Controls the playback's rate
     * @type {number}
     * @private
     */
    _playbackRate = 1;
    
    /**
     * @param value {number}
     */
    set playbackRate(value)
    {
        const time = this.currentTime;
        this._playbackRate = value;
        this.currentTime = time;
    }
    
    get currentTime()
    {
        // return the paused time if it's set to something other than undefined
        if (this.pausedTime !== undefined)
        {
            return this.pausedTime;
        }
        
        return (this.synth.currentSynthTime - this.absoluteStartTime) * this._playbackRate;
    }
    
    set currentTime(time)
    {
        if (time > this.duration || time < 0)
        {
            // time is 0
            if (this.skipToFirstNoteOn)
            {
                this.setTimeTicks(this.midiData.firstNoteOn - 1);
            }
            else
            {
                this.setTimeTicks(0);
            }
            return;
        }
        if (this.skipToFirstNoteOn)
        {
            if (time < this.firstNoteTime)
            {
                this.setTimeTicks(this.midiData.firstNoteOn - 1);
                return;
            }
        }
        this.stop();
        this.playingNotes = [];
        const wasPaused = this.paused && this.preservePlaybackState;
        this.pausedTime = undefined;
        this.post(WorkletSequencerReturnMessageType.timeChange, this.synth.currentSynthTime - time);
        if (this.midiData.duration === 0)
        {
            SpessaSynthWarn("No duration!");
            this.post(WorkletSequencerReturnMessageType.pause, true);
            return;
        }
        this._playTo(time);
        this._recalculateStartTime(time);
        if (wasPaused)
        {
            this.pause();
        }
        else
        {
            this.play();
        }
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
     * Pauses the playback
     * @param isFinished {boolean}
     */
    pause(isFinished = false)
    {
        if (this.paused)
        {
            SpessaSynthWarn("Already paused");
            return;
        }
        this.pausedTime = this.currentTime;
        this.stop();
        this.post(WorkletSequencerReturnMessageType.pause, isFinished);
    }
    
    /**
     * Stops the playback
     */
    stop()
    {
        this.clearProcessHandler();
        // disable sustain
        for (let i = 0; i < 16; i++)
        {
            this.synth.controllerChange(i, midiControllers.sustainPedal, 0);
        }
        this.synth.stopAllChannels();
        if (this.sendMIDIMessages)
        {
            for (let note of this.playingNotes)
            {
                this.sendMIDIMessage([messageTypes.noteOff | (note.channel % 16), note.midiNote]);
            }
            for (let c = 0; c < MIDI_CHANNEL_COUNT; c++)
            {
                this.sendMIDICC(c, midiControllers.allNotesOff, 0);
            }
        }
    }
    
    loadCurrentSong(autoPlay = true)
    {
        let index = this.songIndex;
        if (this.shuffleMode)
        {
            index = this.shuffledSongIndexes[this.songIndex];
        }
        this.loadNewSequence(this.songs[index], autoPlay);
    }
    
    _resetTimers()
    {
        this.playedTime = 0;
        this.eventIndex = Array(this.tracks.length).fill(0);
    }
    
    setProcessHandler()
    {
        this.isActive = true;
    }
    
    clearProcessHandler()
    {
        this.isActive = false;
    }
    
    shuffleSongIndexes()
    {
        const indexes = this.songs.map((_, i) => i);
        this.shuffledSongIndexes = [];
        while (indexes.length > 0)
        {
            const index = indexes[Math.floor(Math.random() * indexes.length)];
            this.shuffledSongIndexes.push(index);
            indexes.splice(indexes.indexOf(index), 1);
        }
    }
}

// Web MIDI sending
WorkletSequencer.prototype.sendMIDIMessage = sendMIDIMessage;
WorkletSequencer.prototype.sendMIDIReset = sendMIDIReset;
WorkletSequencer.prototype.sendMIDICC = sendMIDICC;
WorkletSequencer.prototype.sendMIDIProgramChange = sendMIDIProgramChange;
WorkletSequencer.prototype.sendMIDIPitchWheel = sendMIDIPitchWheel;
WorkletSequencer.prototype.assignMIDIPort = assignMIDIPort;

WorkletSequencer.prototype.post = post;
WorkletSequencer.prototype.processMessage = processMessage;

WorkletSequencer.prototype._processEvent = _processEvent;
WorkletSequencer.prototype._addNewMidiPort = _addNewMidiPort;
WorkletSequencer.prototype.processTick = processTick;
WorkletSequencer.prototype._findFirstEventIndex = _findFirstEventIndex;

WorkletSequencer.prototype.loadNewSequence = loadNewSequence;
WorkletSequencer.prototype.loadNewSongList = loadNewSongList;
WorkletSequencer.prototype.nextSong = nextSong;
WorkletSequencer.prototype.previousSong = previousSong;

WorkletSequencer.prototype.play = play;
WorkletSequencer.prototype._playTo = _playTo;
WorkletSequencer.prototype.setTimeTicks = setTimeTicks;
WorkletSequencer.prototype._recalculateStartTime = _recalculateStartTime;

export { WorkletSequencer };