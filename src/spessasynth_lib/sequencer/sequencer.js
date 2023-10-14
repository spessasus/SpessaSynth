import {MIDI} from "../midi_parser/midi_loader.js";
import { DEFAULT_PERCUSSION, Synthetizer } from '../synthetizer/synthetizer.js';
import { getEvent, messageTypes, midiControllers, MidiMessage } from '../midi_parser/midi_message.js'
import { consoleColors, formatTime } from '../utils/other.js'
import {readBytesAsUintBigEndian} from "../utils/byte_functions.js";

const MIN_NOTE_TIME = 0.02;
const MAX_NOTEONS_PER_S = 200;

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

        // event's number in this.events
        this.eventIndex = 0;

        // tracks the time that we have already played
        this.playedTime = 0;

        /**
         * The (relative) time when the sequencer was paused. If it's not paused then it's undefined.
         * @type {number}
         */
        this.pausedTime = 0;

        /**
         * Absolute playback startTime, bases on the synth's time
         * @type {number}
         */
        this.absoluteStartTime = this.now;

        /**
         * Controls the playback's rate
         * @type {number}
         */
        this.playbackRate = 1;

        /**
         * Currently playing notes (for pausing and resuming)
         * @type {{
         *     midiNote: number,
         *     channel: number,
         *     velocity: number
         * }[]}
         */
        this.playingNotes = [];

        // controls if the sequencer loops (defaults to true)
        this.loop = true;

        this.noteOnsPerS = 0;

        this.loadNewSongList(parsedMidis);
    }

    /**
     * @param parsedMidis {MIDI[]}
     */
    loadNewSongList(parsedMidis)
    {
        this.songs = parsedMidis;
        this.songIndex = 0;
        this.loadNewSequence(this.songs[this.songIndex]);
    }

    nextSong()
    {
        this.songIndex++;
        this.songIndex %= this.songs.length;
        this.loadNewSequence(this.songs[this.songIndex]);
    }

    previousSong()
    {
        this.songIndex--;
        if(this.songIndex < 0)
        {
            this.songIndex = this.songs.length - 1;
        }
        this.loadNewSequence(this.songs[this.songIndex]);
    }

    get now()
    {
        return performance.now() / 1000
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
        return (this.now - this.absoluteStartTime) * this.playbackRate;
    }

    set currentTime(time)
    {
        if(time < 0 || time > this.duration)
        {
            time = 0;
        }
        this.stop();
        this.playingNotes = [];
        this.pausedTime = undefined;
        this._playTo(time);
        this.absoluteStartTime = this.now - time / this.playbackRate;
        this.play();
        if(this.renderer)
        {
            this.renderer.noteStartTime = this.absoluteStartTime;
            this.resetRendererIndexes();
        }
        if(this.onTimeChange)
        {
            this.onTimeChange(time);
        }
    }

    resetRendererIndexes()
    {
        this.renderer.noteTimes.forEach(n => n.renderStartIndex = 0);
    }

    /**
     * Connects a midi renderer
     * @param renderer {Renderer}
     */
    connectRenderer(renderer)
    {
        this.renderer = renderer;
        this.calculateNoteTimes();
    }

    /**
     * Loads a new sequence
     * @param parsedMidi {MIDI}
     */
    loadNewSequence(parsedMidi)
    {
        this.stop();
        if (!parsedMidi.tracks) {
            throw "No tracks supplied!";
        }

        this.oneTickToSeconds = 60 / (120 * parsedMidi.timeDivision)

        this.midiData = parsedMidi;

        /**
         * merge the tracks
         * @type {MidiMessage[]}
         */
        this.events = this.midiData.tracks.flat();
        this.events.sort((e1, e2) => e1.ticks - e2.ticks);

        /**
         * Same as Audio.duration (seconds)
         * @type {number}
         */
        this.duration = this.ticksToSeconds(this.events.findLast(e => e.messageStatusByte >> 4 === 8 || (e.messageStatusByte >> 4 === 9 && e.messageData[1] === 0)).ticks);

        console.log(`%cTOTAL TIME: ${formatTime(Math.round(this.duration)).time}`, consoleColors.recognized);

        if(this.renderer)
        {
            this.calculateNoteTimes();
        }

        this.synth.resetControllers();
        this.play(true);
    }

    calculateNoteTimes()
    {
        /**
         * an array of 16 arrays (channels) and the notes are stored there
         * @typedef {
         * {
         *      notes: {
         *          midiNote: number,
         *          start: number,
         *          length: number
         *      }[],
         *      renderStartIndex: number
         * }[]
         * } NoteTimes
         */

        /**
         * @type {NoteTimes}
         */
        const noteTimes = [];
        for (let i = 0; i < 16; i++)
        {
            noteTimes.push({renderStartIndex: 0, notes: []});
        }
        let elapsedTime = 0;
        let oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
        let eventIndex = 0;

        console.log("%cLoading note times for note rendering...", consoleColors.warn);
        while(eventIndex < this.events.length)
        {
            const event = this.events[eventIndex];

            const status = event.messageStatusByte >> 4;
            const channel = event.messageStatusByte & 0x0F;

            // note off
            if(status === 0x8)
            {
                const note = noteTimes[channel].notes.findLast(n => n.midiNote === event.messageData[0] && n.length === -1)
                if(note) {
                    const time = elapsedTime - note.start;
                    note.length = (time < MIN_NOTE_TIME  ? MIN_NOTE_TIME : time);
                }
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
                        note.length = (time < MIN_NOTE_TIME ? MIN_NOTE_TIME : time);
                    }
                }
                else {
                    noteTimes[event.messageStatusByte & 0x0F].notes.push({
                        midiNote: event.messageData[0],
                        start: elapsedTime,
                        length: -1
                    });
                }
            }
            // set tempo
            else if(event.messageStatusByte === 0x51)
            {
                oneTickToSeconds = 60 / (this.getTempo(event) * this.midiData.timeDivision);
            }

            if(++eventIndex >= this.events.length) break;

            elapsedTime += oneTickToSeconds * (this.events[eventIndex].ticks - event.ticks);
        }

        console.log("%cFinished loading note times and ready to render the sequence!", consoleColors.info);
        this.renderer.connectSequencer(noteTimes, this);
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
        this.currentTime -= 0.1;
    }

    /**
     * Pauses the playback
     */
    pause()
    {
        if(this.paused)
        {
            console.warn("Already paused");
            return;
        }
        this.pausedTime = this.currentTime;
        this.stop();
    }

    /**
     * Coverts ticks to time in seconds
     * @param ticks {number}
     * @returns {number}
     */
    ticksToSeconds(ticks) {
        if (ticks <= 0) {
            return 0;
        }

        // find the last tempo change that has occured
        let tempo = this.midiData.tempoChanges.find(v => v.ticks < ticks);

        let timeSinceLastTempo = ticks - tempo.ticks;
        return this.ticksToSeconds(ticks - timeSinceLastTempo) + (timeSinceLastTempo * 60) / (tempo.tempo * this.midiData.timeDivision);
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
     * plays from start to the target time, excluding note messages (to get the synth to the correct state)
     * @private
     * @param time {number} in seconds
     * @param ticks {number} optional MIDI ticks, when given is used instead of time
     */
    _playTo(time, ticks = undefined)
    {
        this.playedTime = 0;
        this.eventIndex = 0;
        this.oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
        // process every non note message from the start
        this.synth.resetControllers();
        if(this.MIDIout)
        {
            this.MIDIout.send([messageTypes.reset]);
        }

        // optimize to call pitchwheels 16 times only
        const pitches = new Uint16Array(16);

        // optimize program changes to call 16 times only
        const programs = new Uint8Array(16);

        for(let i = 0; i < 16; i++)
        {
            pitches[i] = 8192;
        }
        let event = this.events[this.eventIndex];
        while(true) {
            const type = event.messageStatusByte >> 4;
            const channel = event.messageStatusByte & 0x0F;
            if (type === 0x8 || type === 0x9) {
                this.eventIndex++;
                this.playedTime += this.oneTickToSeconds * (this.events[this.eventIndex].ticks - event.ticks);
                event = this.events[this.eventIndex];
            }
            else
            // pitch wheel
            if(type === 0xE)
            {
                pitches[channel] = (event.messageData[1] << 7 ) | event.messageData[0];
                this.eventIndex++;
                this.playedTime += this.oneTickToSeconds * (this.events[this.eventIndex].ticks - event.ticks);
                event = this.events[this.eventIndex];
            }
            else
            // program change
            if(type === 0xC)
            {
                programs[channel] = event.messageData[0];
                this.eventIndex++;
                this.playedTime += this.oneTickToSeconds * (this.events[this.eventIndex].ticks - event.ticks);
                event = this.events[this.eventIndex];
            }
            else {
                this._processEvent(event);

                this.eventIndex++;
                this.playedTime += this.oneTickToSeconds * (this.events[this.eventIndex].ticks - event.ticks);
                event = this.events[this.eventIndex];
            }

            if(ticks !== undefined)
            {
                if(event.ticks >= ticks)
                {
                    break;
                }
            }
            else
            {
                if(this.playedTime >= time)
                {
                    break;
                }
            }
        }

        for(let i = 0; i < 16; i++)
        {
            if(this.MIDIout)
            {
                this.MIDIout.send([messageTypes.pitchBend | i, pitches[i] & 0x7F, pitches[i] >> 7]);
                this.MIDIout.send([messageTypes.programChange | i, programs[i]]);
            }
            else
            {
                this.synth.pitchWheel(i, pitches[i] >> 7, pitches[i] & 0x7F);
                this.synth.programChange(i, programs[i]);
            }
        }
    }

    /**
     * Starts the playback
     * @param resetTime {boolean} If true, time is set to 0s
     */
    play(resetTime = false)
    {

        // reset the time if necesarry
        if(resetTime) {
            this.currentTime = 0;
            return;
        }

        if(this.currentTime >= this.duration)
        {
            this.currentTime = 0;
            return;
        }

        // unpause if paused
        if(this.paused)
        {
            // adjust the start time
            this.absoluteStartTime = this.now - this.pausedTime;
            this.pausedTime = undefined;
        }

        this.playingNotes.forEach(n => {
            // if(this.renderer)
            // {
            //     this.renderer.startNoteFall(n.midiNote, n.channel, this.renderer.noteFallingTimeMs);
            // }
            this.synth.noteOn(n.channel, n.midiNote, n.velocity);
        });

        this.playbackInterval = setInterval(this._processTick.bind(this));
        this.noteCounterClearInterval = setInterval( () =>this.noteOnsPerS = 0, 100);
    }

    setTimeTicks(ticks)
    {
        this.stop();
        this.playingNotes = [];
        this.pausedTime = undefined;
        this._playTo(0, ticks);
        this.absoluteStartTime = this.now - this.playedTime / this.playbackRate;
        this.play();
        if(this.renderer)
        {
            this.renderer.noteStartTime = this.absoluteStartTime;
            this.resetRendererIndexes();
        }
        if(this.onTimeChange)
        {
            this.onTimeChange(this.currentTime);
        }
    }

    /**
     * Processes a single tick
     * @private
     */
    _processTick()
    {
        let current = this.currentTime;
        if(this.eventIndex >= this.events.length || current > this.duration + 0.1)
        {
            if(this.loop)
            {
                this.setTimeTicks(this.midiData.loop.start);
                return;
            }
            this.pause();
            if(this.songs.length > 1)
            {
                this.nextSong();
            }
            return;
        }
        let event = this.events[this.eventIndex];
        while(this.playedTime <= current)
        {
            this._processEvent(event);
            ++this.eventIndex;

            // loop
            if((this.midiData.loop.end <= event.ticks) && this.loop)
            {
                this.setTimeTicks(this.midiData.loop.start);
                return;
            }
            // if song has ended
            else if(this.eventIndex >= this.events.length ||
                current > this.duration + 0.1)
            {
                if(this.loop)
                {
                    this.setTimeTicks(this.midiData.loop.start);
                    return;
                }
                this.pause();
                if(this.songs.length > 1)
                {
                    this.nextSong();
                }
                return;
            }

            this.playedTime += this.oneTickToSeconds * (this.events[this.eventIndex].ticks - event.ticks);
            event = this.events[this.eventIndex];
        }
    }

    /**
     * gets tempo from the midi message
     * @param event {MidiMessage}
     * @return {number} the tempo in bpm
     */
    getTempo(event)
    {
        event.messageData.currentIndex = 0;
        return 60000000 / readBytesAsUintBigEndian(event.messageData, 3);
    }

    /**
     * Processes a single event
     * @param event {MidiMessage}
     * @private
     */
    _processEvent(event)
    {
        if(this.ignoreEvents) return;
        if(this.MIDIout)
        {
            if(event.messageStatusByte >= 0x80) {
                this.MIDIout.send([event.messageStatusByte, ...event.messageData]);
                return;
            }
        }
        const statusByteData = getEvent(event.messageStatusByte);
        // process the event
        switch (statusByteData.status) {
            case messageTypes.noteOn:
                const velocity = event.messageData[1];
                if(velocity > 0) {
                    if(this.synth.highPerformanceMode && (this.noteOnsPerS > MAX_NOTEONS_PER_S && velocity < 40) || this.noteOnsPerS > MAX_NOTEONS_PER_S * 2)
                    {
                        return;
                    }
                    this.noteOnsPerS++;
                    this.synth.noteOn(statusByteData.channel, event.messageData[0], velocity);
                    this.playingNotes.push({
                        midiNote: event.messageData[0],
                        channel: statusByteData.channel,
                        velocity: velocity
                    });
                }
                else
                {
                    this.synth.noteOff(statusByteData.channel, event.messageData[0]);
                    this.playingNotes.splice(this.playingNotes.findIndex(n =>
                        n.midiNote === event.messageData[0] && n.channel === statusByteData.channel), 1);
                }
                break;

            case messageTypes.noteOff:
                this.synth.noteOff(statusByteData.channel, event.messageData[0]);
                this.playingNotes.splice(this.playingNotes.findIndex(n =>
                    n.midiNote === event.messageData[0] && n.channel === statusByteData.channel), 1);
                break;

            case messageTypes.setTempo:
                this.oneTickToSeconds = 60 / (this.getTempo(event) * this.midiData.timeDivision);
                if(this.oneTickToSeconds === 0)
                {
                    this.oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
                    console.warn("invalid tempo! falling back to 120 BPM");
                }
                break;

            case messageTypes.endOfTrack:
            case messageTypes.midiChannelPrefix:
            case messageTypes.timeSignature:
            case messageTypes.songPosition:
            case messageTypes.activeSensing:
            case messageTypes.keySignature:
            case messageTypes.midiPort:
                break;

            default:
                console.log(`%cUnrecognized Event: %c${event.messageStatusByte}%c status byte: %c${Object.keys(messageTypes).find(k => messageTypes[k] === statusByteData.status)}`,
                    consoleColors.warn,
                    consoleColors.unrecognized,
                    consoleColors.warn,
                    consoleColors.value);
                break;

            case messageTypes.pitchBend:
                this.synth.pitchWheel(statusByteData.channel, event.messageData[1], event.messageData[0]);
                break;

            case messageTypes.controllerChange:
                this.synth.controllerChange(statusByteData.channel, event.messageData[0], event.messageData[1]);
                break;

            case messageTypes.programChange:
                this.synth.programChange(statusByteData.channel, event.messageData[0]);
                break;

            case messageTypes.systemExclusive:
                this.synth.systemExclusive(event.messageData);
                break;

            case messageTypes.text:
            case messageTypes.lyric:
            case messageTypes.copyright:
            case messageTypes.trackName:
            case messageTypes.marker:
            case messageTypes.cuePoint:
            case messageTypes.instrumentName:
                if(this.onTextEvent)
                {
                    this.onTextEvent(event.messageData, statusByteData.status);
                }
                break;

            case messageTypes.reset:
                this.synth.stopAll();
                this.synth.resetControllers();
                break;
        }
    }


    /**
     * Stops the playback
     */
    stop()
    {
        clearInterval(this.playbackInterval);
        this.playbackInterval = undefined;
        // disable sustain
        for (let i = 0; i < 16; i++) {
            this.synth.controllerChange(i, midiControllers.sustainPedal, 0);
        }
        this.synth.stopAll();
        if(this.MIDIout)
        {
            for (let c = 0; c < 16; c++)
            {
                this.MIDIout.send([messageTypes.controllerChange | c, 120, 0]); // all notes off
                this.MIDIout.send([messageTypes.controllerChange | c, 123, 0]); // all sound off
            }
        }
    }

    /**
     * Fires on text event
     * @param data {ShiftableByteArray} the data text
     * @param type {number} the status byte of the message (the meta status byte)
     */
    onTextEvent;

    /**
     * Fires when CurrentTime changes
     * @param time {number} the time that was changed to
     */
    onTimeChange;
}