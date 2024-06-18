import {MIDI} from "../midi_parser/midi_loader.js";
import { DEFAULT_PERCUSSION, Synthetizer } from '../synthetizer/synthetizer.js';
import {  messageTypes, MidiMessage } from '../midi_parser/midi_message.js'
import { consoleColors } from '../utils/other.js'
import { workletMessageType } from '../synthetizer/worklet_system/worklet_utilities/worklet_message.js'
import {
    WorkletSequencerMessageType,
    WorkletSequencerReturnMessageType,
} from './worklet_sequencer/sequencer_message.js'
import { readBytesAsUintBigEndian } from '../utils/byte_functions.js'
import { ShiftableByteArray } from '../utils/shiftable_array.js'
import { SpessaSynthInfo, SpessaSynthWarn } from '../utils/loggin.js'

/**
 * sequencer.js
 * purpose: plays back the midi file decoded by midi_loader.js, including support for multi-channel midis (adding channels when more than 1 midi port is detected)
 */

const MIN_NOTE_TIME = 0.02;
export class Sequencer {
    /**
     * Creates a new Midi sequencer for playing back MIDI files
     * @param parsedMidis {MIDI[]} List of the parsed midi
     * @param synth {Synthetizer} synth to send events to
     */
    constructor(parsedMidis, synth)
    {
        this.ignoreEvents = false;
        this.synth = synth;
        this.performanceNowTimeOffset = synth.currentTime - (performance.now() / 1000);

        /**
         * Absolute playback startTime, bases on the synth's time
         * @type {number}
         */
        this.absoluteStartTime = this.synth.currentTime;

        /**
         * Controls the playback's rate
         * @type {number}
         */
        this._playbackRate = 1;

        this._loop = true;

        /**
         * Indicates whether the sequencer has finished playing a sequence
         * @type {boolean}
         */
        this.isFinished = false;

        /**
         * The current sequence's length, in seconds
         * @type {number}
         */
        this.duration = 0;

        /**
         * @type {Object<string, function(MIDI)>}
         */
        this.onSongChange = {};

        this.synth.sequencerCallbackFunction = this._handleMessage.bind(this);

        this.loadNewSongList(parsedMidis);

        document.addEventListener("close", () => {
            if(this.MIDIout)
            {
                this.MIDIout.send([messageTypes.reset]);
            }
        })
    }

    set loop(value)
    {
        this._sendMessage(WorkletSequencerMessageType.setLoop, value);
        this._loop = value;
    }

    get loop()
    {
        return this._loop;
    }

    /**
     * @param messageType {WorkletSequencerMessageType}
     * @param messageData {any}
     * @private
     */
    _sendMessage(messageType, messageData = undefined)
    {
        this.synth.post({
            channelNumber: -1,
            messageType: workletMessageType.sequencerSpecific,
            messageData: {
                messageType: messageType,
                messageData: messageData
            }
        });
    }

    /**
     * @param {WorkletSequencerReturnMessageType} messageType
     * @param {any} messageData
     * @private
     */
    _handleMessage(messageType, messageData)
    {
        if(this.ignoreEvents)
        {
            return;
        }
        switch (messageType)
        {
            default:
                break;

            case WorkletSequencerReturnMessageType.midiEvent:
                /**
                 * @type {number[]}
                 */
                let midiEventData = messageData;
                if (this.MIDIout) {
                    if (midiEventData[0] >= 0x80) {
                        this.MIDIout.send(midiEventData);
                        return;
                    }
                }
                break;

            case WorkletSequencerReturnMessageType.songChange:
                // messageData is expected to be {MIDI}
                /**
                 * @type {MIDI}
                 */
                let songChangeData = messageData[0];
                this.songIndex = messageData[1];
                this.midiData = songChangeData;
                this.duration = this.midiData.duration;
                this.calculateNoteTimes(songChangeData.tracks);
                Object.entries(this.onSongChange).forEach((callback) => callback[1](songChangeData));
                this.unpause()
                break;

            case WorkletSequencerReturnMessageType.textEvent:
                /**
                 * @type {[Uint8Array, number]}
                 */
                let textEventData = messageData;
                if (this.onTextEvent) {
                    this.onTextEvent(textEventData[0], textEventData[1]);
                }
                break;

            case WorkletSequencerReturnMessageType.timeChange:
                /**
                 * @type {number}
                 */
                const time = messageData;
                if(this.onTimeChange)
                {
                    this.onTimeChange(time);
                }
                this.unpause()
                this._recalculateStartTime(time);
                break;

            case WorkletSequencerReturnMessageType.resetRendererIndexes:
                this.resetRendererIndexes();
                break;

            case WorkletSequencerReturnMessageType.pause:
                this.pausedTime = this.currentTime;
                this.isFinished = messageData;
        }
    }


    /**
     * @private
     */
    _adjustPeformanceNowTime()
    {
        this.performanceNowTimeOffset = (this.synth.currentTime - (performance.now() / 1000)) * this._playbackRate;
    }

    /**
     * @param time
     * @private
     */
    _recalculateStartTime(time)
    {
        this.absoluteStartTime = this.synth.currentTime - time / this._playbackRate;
        this._adjustPeformanceNowTime()
    }

    /**
     * @param value {number}
     */
    set playbackRate(value)
    {
        this._sendMessage(WorkletSequencerMessageType.setPlaybackRate, value);
        this._playbackRate = value;
    }

    /**
     * @returns {number}
     */
    get playbackRate()
    {
        return this._playbackRate;
    }

    /**
     * Adds a new event that gets called when the song changes
     * @param callback {function(MIDI)}
     * @param id {string} must be unique
     */
    addOnSongChangeEvent(callback, id)
    {
        this.onSongChange[id] = callback;
        callback(this.midiData);
    }

    /**
     * @param parsedMidis {MIDI[]}
     */
    loadNewSongList(parsedMidis)
    {
        this.midiData = parsedMidis[0];
        this.duration = parsedMidis[0].duration;
        this._sendMessage(WorkletSequencerMessageType.loadNewSongList, parsedMidis);
        this.songIndex = 0;
    }

    nextSong()
    {
        this._sendMessage(WorkletSequencerMessageType.changeSong, true);
        this.songIndex++;
    }

    previousSong()
    {
        this._sendMessage(WorkletSequencerMessageType.changeSong, false);
    }

    /**
     * @returns {number} Current playback time, in seconds
     */
    get currentTime()
    {
        // return the paused time if it's set to something other than undefined
        if(this.pausedTime)
        {
            return this.pausedTime;
        }

        return (this.synth.currentTime - this.absoluteStartTime) * this._playbackRate;
    }


    /**
     * Use for visualization as it's not affected by the audioContext stutter
     * @returns {number}
     */
    get currentHighResolutionTime()
    {
        if (this.pausedTime) {
            return this.pausedTime;
        }

        // sync performance.now to current time
        const performanceNow = performance.now() / 1000;
        let currentPerformanceTime = this.performanceNowTimeOffset + (performanceNow - this.absoluteStartTime) * this._playbackRate;
        let currentAudioTime = this.currentTime;

        const smoothingFactor = 0.01;

        // diff times smoothing factor
        this.performanceNowTimeOffset += (currentAudioTime - currentPerformanceTime) * smoothingFactor;

        currentPerformanceTime = this.performanceNowTimeOffset + (performanceNow - this.absoluteStartTime) * this._playbackRate;

        return currentPerformanceTime;
    }

    set currentTime(time)
    {
        this.unpause()
        this._sendMessage(WorkletSequencerMessageType.setTime, time);
    }

    resetRendererIndexes()
    {
        if(!this.renderer)
        {
            return;
        }
        this.renderer.noteStartTime = this.absoluteStartTime;
        this.renderer.noteTimes.forEach(n => n.renderStartIndex = 0);
    }

    /**
     * Connects a midi renderer
     * @param renderer {Renderer}
     */
    connectRenderer(renderer)
    {
        this.renderer = renderer;
        this.calculateNoteTimes(this.midiData.tracks);
    }

    /**
     * @param trackData {MidiMessage[][]}
     */
    calculateNoteTimes(trackData)
    {
        if(this.midiData === undefined)
        {
            return;
        }

        /**
         * gets tempo from the midi message
         * @param event {MidiMessage}
         * @return {number} the tempo in bpm
         */
        function getTempo(event)
        {
            // simulate shiftableByteArray
            event.messageData = new ShiftableByteArray(event.messageData.buffer);
            event.messageData.currentIndex = 0;
            return 60000000 / readBytesAsUintBigEndian(event.messageData, 3);
        }

        /**
         * an array of 16 arrays (channels) and the notes are stored there
         * @typedef {{
         *          midiNote: number,
         *          start: number,
         *          length: number,
         *          velocity: number,
         *      }} NoteTime
         *
         * @typedef {{
         *      notes: NoteTime[],
         *      renderStartIndex: number
         * }[]} NoteTimes
         */

        /**
         * @type {NoteTimes}
         */


        const noteTimes = [];
        let events = trackData.flat();
        events.sort((e1, e2) => e1.ticks - e2.ticks);
        for (let i = 0; i < 16; i++)
        {
            noteTimes.push({renderStartIndex: 0, notes: []});
        }
        let elapsedTime = 0;
        let oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
        let eventIndex = 0;
        let unfinished = 0;
        while(eventIndex < events.length)
        {
            const event = events[eventIndex];

            const status = event.messageStatusByte >> 4;
            const channel = event.messageStatusByte & 0x0F;

            // note off
            if(status === 0x8)
            {
                const note = noteTimes[channel].notes.findLast(n => n.midiNote === event.messageData[0] && n.length === -1)
                if(note) {
                    const time = elapsedTime - note.start;
                    note.length = (time < MIN_NOTE_TIME && channel === DEFAULT_PERCUSSION ? MIN_NOTE_TIME : time);
                }
                unfinished--;
            }
            // note on
            else if(status === 0x9)
            {
                if(event.messageData[1] === 0)
                {
                    // nevermind, its note off
                    const note = noteTimes[channel].notes.findLast(n => n.midiNote === event.messageData[0] && n.length === -1)
                    if(note) {
                        const time = elapsedTime - note.start;
                        note.length = (time < MIN_NOTE_TIME && channel === DEFAULT_PERCUSSION ? MIN_NOTE_TIME : time);
                    }
                    unfinished--;
                }
                else {
                    noteTimes[event.messageStatusByte & 0x0F].notes.push({
                        midiNote: event.messageData[0],
                        start: elapsedTime,
                        length: -1,
                        velocity: event.messageData[1] / 127
                    });
                    unfinished++;
                }
            }
            // set tempo
            else if(event.messageStatusByte === 0x51)
            {
                oneTickToSeconds = 60 / (getTempo(event) * this.midiData.timeDivision);
            }

            if(++eventIndex >= events.length) break;

            elapsedTime += oneTickToSeconds * (events[eventIndex].ticks - event.ticks);
        }

        // finish the unfinished notes
        if(unfinished > 0)
        {
            // for every channel, for every note that is unfinished (has -1 length)
            noteTimes.forEach((channel, channelNumber) =>
                channel.notes.filter(n => n.length === -1).forEach(note =>
                {
                    const time = elapsedTime - note.start;
                    note.length = (time < MIN_NOTE_TIME && channelNumber === DEFAULT_PERCUSSION ? MIN_NOTE_TIME : time);
                })
            )
        }

        SpessaSynthInfo(`%cFinished loading note times and ready to render the sequence!`, consoleColors.info);
        if(this.renderer)
        {
            this.renderer.connectSequencer(noteTimes, this);
        }
    }

    /**
     * @param output {MIDIOutput}
     */
    connectMidiOutput(output)
    {
        if(this.MIDIout)
        {
            for (let i = 0; i < 16; i++) {
                this.MIDIout.send([messageTypes.controllerChange | i, 120, 0]); // all notes off
                this.MIDIout.send([messageTypes.controllerChange | i, 123, 0]); // all sound off
            }
        }
        this.MIDIout = output;
        this._sendMessage(WorkletSequencerMessageType.changeMIDIMessageSending, output !== undefined);
        this.currentTime -= 0.1;
    }

    /**
     * Pauses the playback
     */
    pause()
    {
        if(this.paused)
        {
            SpessaSynthWarn("Already paused");
            return;
        }
        this.pausedTime = this.currentTime;
        this._sendMessage(WorkletSequencerMessageType.pause);
    }

    unpause()
    {
        this.pausedTime = undefined;
        this.isFinished = false;
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
     * Starts the playback
     * @param resetTime {boolean} If true, time is set to 0s
     */
    play(resetTime = false)
    {
        if(this.isFinished)
        {
            resetTime = true;
        }
        this._recalculateStartTime(this.pausedTime);
        this.unpause()
        this._sendMessage(WorkletSequencerMessageType.play, resetTime);
    }

    /**
     * Stops the playback
     */
    stop()
    {
        this._sendMessage(WorkletSequencerMessageType.stop);
    }

    /**
     * Fires on text event
     * @param data {Uint8Array} the data text
     * @param type {number} the status byte of the message (the meta status byte)
     */
    onTextEvent;

    /**
     * Fires when CurrentTime changes
     * @param time {number} the time that was changed to
     */
    onTimeChange;
}