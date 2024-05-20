import {MIDI} from "../midi_parser/midi_loader.js";
import { DEFAULT_PERCUSSION, Synthetizer } from '../synthetizer/synthetizer.js';
import { getEvent, messageTypes, midiControllers, MidiMessage } from '../midi_parser/midi_message.js'
import { consoleColors, formatTime } from '../utils/other.js'
import {readBytesAsUintBigEndian} from "../utils/byte_functions.js";

const MIN_NOTE_TIME = 0.02;
const MAX_NOTEONS_PER_S = 200;

// an array with preset default values
const defaultControllerArray = new Int16Array(127);
// default values
defaultControllerArray[midiControllers.mainVolume] = 100;
defaultControllerArray[midiControllers.expressionController] = 127;
defaultControllerArray[midiControllers.pan] = 64;
defaultControllerArray[midiControllers.releaseTime] = 64;
defaultControllerArray[midiControllers.brightness] = 64;

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
        /**
         * @type {number[]}
         */
        this.eventIndex = [];

        // tracks the time that we have already played
        /**
         * @type {number}
         */
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

        /**
         * midi port number for the corresponding track
         * @type {number[]}
         */
        this.midiPorts = [];

        this.midiPortChannelOffset = 0;

        /**
         * midi port: channel offset
         * @type {Object<number, number>}
         */
        this.midiPortChannelOffsets = {};

        this.noteOnsPerS = 0;

        /**
         * @type {Object<string, function(MIDI)>}
         */
        this.onSongChange = {};

        this.loadNewSongList(parsedMidis);

        document.addEventListener("close", () => {
            if(this.MIDIout)
            {
                this.MIDIout.send([messageTypes.reset]);
            }
        })
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
        if(this.onTimeChange)
        {
            this.onTimeChange(time);
        }
        if(time < 0 || time > this.duration || time === 0)
        {
            // time is 0
            this.setTimeTicks(this.midiData.firstNoteOn - 1);
            return;
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
        //this.events = this.midiData.tracks.flat();
        //this.events.sort((e1, e2) => e1.ticks - e2.ticks);

        /**
         * @type {MidiMessage[][]}
         */
        this.tracks = this.midiData.tracks;

        // copy over the port data (can be overwritten in real time if needed)
        this.midiPorts = this.midiData.midiPorts;

        /**
         * Same as Audio.duration (seconds)
         * @type {number}
         */
        this.duration = this.ticksToSeconds(this.midiData.lastVoiceEventTick);

        console.log(`%cTOTAL TIME: ${formatTime(Math.round(this.duration)).time}`, consoleColors.recognized);
        this.midiPortChannelOffset = 0;
        this.midiPortChannelOffsets = {};

        Object.entries(this.onSongChange).forEach((callback) => callback[1](this.midiData));

        if(this.renderer)
        {
            this.calculateNoteTimes();
        }

        this.synth.resetControllers();
        this.play(true);
    }

    /**
     * Adds 16 channels to the synth
     * @private
     */
    _addNewMidiPort()
    {
        for (let i = 0; i < 16; i++) {
            this.synth.addNewChannel();
            if(i === 9)
            {
                this.synth.setDrums(this.synth.midiChannels.length - 1, true);
            }
        }
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
         *          length: number,
         *          velocity: number,
         *      }[],
         *      renderStartIndex: number
         * }[]
         * } NoteTimes
         */

        /**
         * @type {NoteTimes}
         */


        const noteTimes = [];
        let events = this.tracks.flat();
        events.sort((e1, e2) => e1.ticks - e2.ticks);
        for (let i = 0; i < 16; i++)
        {
            noteTimes.push({renderStartIndex: 0, notes: []});
        }
        let elapsedTime = 0;
        let oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
        let eventIndex = 0;

        console.log("%cLoading note times for note rendering...", consoleColors.warn);
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
                }
                else {
                    noteTimes[event.messageStatusByte & 0x0F].notes.push({
                        midiNote: event.messageData[0],
                        start: elapsedTime,
                        length: -1,
                        velocity: event.messageData[1] / 127
                    });
                }
            }
            // set tempo
            else if(event.messageStatusByte === 0x51)
            {
                oneTickToSeconds = 60 / (this.getTempo(event) * this.midiData.timeDivision);
            }

            if(++eventIndex >= events.length) break;

            elapsedTime += oneTickToSeconds * (events[eventIndex].ticks - event.ticks);
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

    _resetTimers()
    {
        this.playedTime = 0
        this.eventIndex = Array(this.tracks.length).fill(0);
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
     * @returns {number} the index of the first to the current played time
     */
    _findFirstEventIndex()
    {
        let index = 0;
        let ticks = Infinity;
        this.tracks.forEach((track, i) => {
            if(this.eventIndex[i] >= track.length)
            {
                return;
            }
            if(track[this.eventIndex[i]].ticks < ticks)
            {
                index = i;
                ticks = track[this.eventIndex[i]].ticks;
            }
        });
        return index;
    }

    /**
     * plays from start to the target time, excluding note messages (to get the synth to the correct state)
     * @private
     * @param time {number} in seconds
     * @param ticks {number} optional MIDI ticks, when given is used instead of time
     */
    _playTo(time, ticks = undefined)
    {
        this.oneTickToSeconds = 60 / (120 * this.midiData.timeDivision);
        // process every non note message from the start
        this.synth.resetControllers();
        if(this.MIDIout)
        {
            this.MIDIout.send([messageTypes.reset]);
        }

        this._resetTimers()
        /**
         * save pitch bends here and send them only after
         * @type {number[]}
         */
        const pitchBends = Array(16).fill(8192);

        /**
         * Save controllers here and send them only after
         * @type {number[][]}
         */
        const savedControllers = [];
        for (let i = 0; i < 16; i++)
        {
            savedControllers.push(Array.from(defaultControllerArray));
        }

        while(true)
        {
            // find next event
            let trackIndex = this._findFirstEventIndex();
            let event = this.tracks[trackIndex][this.eventIndex[trackIndex]];
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

            // skip note ons
            const info = getEvent(event.messageStatusByte);
            switch(info.status)
            {
                // skip note messages
                case messageTypes.noteOn:
                case messageTypes.noteOff:
                    break;

                // skip pitch bend
                case messageTypes.pitchBend:
                    pitchBends[info.channel] = event.messageData[1] << 7 | event.messageData[0];
                    break;

                case messageTypes.controllerChange:
                    // do not skip data entries
                    const controllerNumber = event.messageData[0];
                    if(
                        controllerNumber === midiControllers.dataDecrement           ||
                        controllerNumber === midiControllers.dataEntryMsb            ||
                        controllerNumber === midiControllers.dataDecrement           ||
                        controllerNumber === midiControllers.lsbForControl6DataEntry ||
                        controllerNumber === midiControllers.RPNLsb                  ||
                        controllerNumber === midiControllers.RPNMsb                  ||
                        controllerNumber === midiControllers.NRPNLsb                 ||
                        controllerNumber === midiControllers.NRPNMsb                 ||
                        controllerNumber === midiControllers.bankSelect              ||
                        controllerNumber === midiControllers.lsbForControl0BankSelect||
                        controllerNumber === midiControllers.resetAllControllers
                    )
                    {
                        if(this.MIDIout)
                        {
                            this.MIDIout.send([messageTypes.controllerChange | info.channel, controllerNumber, event.messageData[1]])
                        }
                        else
                        {
                            this.synth.controllerChange(info.channel, controllerNumber, event.messageData[1]);
                        }
                    }
                    else
                    {
                        // Keep in mind midi ports to determine channel!!
                        const channel = info.channel + (this.midiPortChannelOffsets[this.midiPorts[trackIndex]] || 0);
                        if(savedControllers[channel] === undefined)
                        {
                            savedControllers[channel] = Array.from(defaultControllerArray);
                        }
                        savedControllers[channel][controllerNumber] = event.messageData[1];
                    }
                    break;

                // midiport: handle it and make sure that the saved controllers table is the same size as synth channels
                case messageTypes.midiPort:
                    this._processEvent(event, trackIndex);
                    if(this.synth.midiChannels.length > savedControllers.length)
                    {
                        while(this.synth.midiChannels.length > savedControllers.length)
                        {
                            savedControllers.push(Array.from(defaultControllerArray));
                        }
                    }
                    break;

                default:
                    this._processEvent(event, trackIndex);
                    break;
            }

            this.eventIndex[trackIndex]++;
            // find next event
            trackIndex = this._findFirstEventIndex();
            let nextEvent = this.tracks[trackIndex][this.eventIndex[trackIndex]];
            this.playedTime += this.oneTickToSeconds * (nextEvent.ticks - event.ticks);
        }

        // restoring saved controllers
        if(this.MIDIout)
        {
            // for all 16 channels
            for (let channelNumber = 0; channelNumber < 16; channelNumber++) {
                // send saved pitch bend
                this.MIDIout.send([messageTypes.pitchBend | channelNumber, pitchBends[channelNumber] & 0x7F, pitchBends[channelNumber] >> 7]);

                // every controller that has changed
                savedControllers[channelNumber].forEach((value, index) => {
                    if(value !== defaultControllerArray[channelNumber])
                    {
                        this.MIDIout.send([messageTypes.controllerChange | channelNumber, index, value])
                    }
                })
            }
        }
        else
        {
            // for all synth channels
            this.synth.midiChannels.forEach((channel, channelNumber) => {
                // restore pitch bends
                if(pitchBends[channelNumber] !== undefined) {
                    this.synth.pitchWheel(channelNumber, pitchBends[channelNumber] >> 7, pitchBends[channelNumber] & 0x7F);
                }
                if(savedControllers[channelNumber] !== undefined)
                {
                    // every controller that has changed
                    savedControllers[channelNumber].forEach((value, index) => {
                        if(value !== defaultControllerArray[index])
                        {
                            this.synth.controllerChange(channelNumber, index, value);
                        }
                    })
                }
            })
        }
        window.abba = savedControllers;
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
            this.absoluteStartTime = this.now - this.pausedTime / this.playbackRate;
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
        setInterval( () =>this.noteOnsPerS = 0, 100);
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
        while(this.playedTime < current)
        {
            // find next event
            let trackIndex = this._findFirstEventIndex();
            let event = this.tracks[trackIndex][this.eventIndex[trackIndex]];
            this._processEvent(event, trackIndex);

            this.eventIndex[trackIndex]++;

            // find next event
            trackIndex = this._findFirstEventIndex();
            if(this.tracks[trackIndex].length <= this.eventIndex[trackIndex])
            {
                // song has ended
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
            let eventNext = this.tracks[trackIndex][this.eventIndex[trackIndex]];
            this.playedTime += this.oneTickToSeconds * (eventNext.ticks - event.ticks);

            // loop
            if((this.midiData.loop.end <= event.ticks) && this.loop)
            {
                this.setTimeTicks(this.midiData.loop.start);
                return;
            }
            // if song has ended
            else if(current > this.duration + 0.1)
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
     * @param trackIndex {number}
     * @private
     */
    _processEvent(event, trackIndex)
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
        statusByteData.channel += this.midiPortChannelOffsets[this.midiPorts[trackIndex]] || 0;
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

            case messageTypes.midiPort:
                const port = event.messageData[0];
                // assign new 16 channels if the port is not occupied yet
                if(this.midiPortChannelOffset === 0)
                {
                    this.midiPortChannelOffset += 16;
                    this.midiPortChannelOffsets[port] = 0;
                }

                if(this.midiPortChannelOffsets[port] === undefined)
                {
                    if(this.synth.midiChannels.length < this.midiPortChannelOffset + 16) {
                        this._addNewMidiPort();
                    }
                    this.midiPortChannelOffsets[port] = this.midiPortChannelOffset;
                    this.midiPortChannelOffset += 16;
                }

                this.midiPorts[trackIndex] = port;
                break;

            case messageTypes.endOfTrack:
            case messageTypes.midiChannelPrefix:
            case messageTypes.timeSignature:
            case messageTypes.songPosition:
            case messageTypes.activeSensing:
            case messageTypes.keySignature:
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