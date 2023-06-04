import {MidiParser} from "../../midi_parser/midi_parser.js";
import {MidiSynthetizer} from "../synthetizer/midi_synthetizer.js";
import {MidiRenderer} from "../../ui/midi_renderer.js";
import {MidiEvent} from "../../midi_parser/events/midi_event.js";
import {formatTime} from "../../utils/other.js";

export class MidiSequencer{
    /**
     * Creates a new Midi sequencer for playing back midi
     * @param parsedMidi {MidiParser} Parsed MidiParser object
     * @param synth {MidiSynthetizer} target synth
     */
    constructor(parsedMidi, synth) {
        this.synth = synth;
        this.midiData = parsedMidi;
        this.pauseTime = 0;
        this.playbackOffsetMs = 0;

        if(!this.midiData.decodedTracks)
        {
            throw "No tracks supplied!";
        }
        // default time sig is 4/4
        this.beatsPerMeasure = 4;

        let maxTime = Math.max(...this.midiData.decodedTracks.map(t => t[t.length - 1].ticks));
        // ms -> s
        this.duration = this.getDeltaAsMs(maxTime) / 1000;
        maxTime = Math.round(this.duration);

        this.timeouts = [];

        console.log(`TOTAL TIME: ${formatTime(maxTime).time}`);
        this.absoluteStartTimeMs = performance.now();
    }

    getDeltaAsMs(deltaTicks) {
        if (deltaTicks <= 0) {
            return 0;
        }
        let ticksPerBeat = this.midiData.timeDivision * (4 / this.beatsPerMeasure);
        // find the nearest tempo
        let tempo = this.midiData.tempoChanges.find(v => v.ticks < deltaTicks);

        let timeSinceLastTempo = deltaTicks - tempo.ticks;
        return this.getDeltaAsMs(deltaTicks - timeSinceLastTempo) + (timeSinceLastTempo * 60000) / (tempo.tempo * ticksPerBeat);
    }

    /**
     * Connects a midi renderer
     * @param renderer {MidiRenderer}
     */
    connectRenderer(renderer)
    {
        this.renderer = renderer;
        this.playbackOffsetMs = renderer.noteFallingSpeed;
    }

    pause()
    {
        if(this.paused)
        {
            console.warn("Already paused");
            return;
        }

        if(this.renderer)
        {
            this.renderer.pause();
        }
        // prevent playingnotes from beign erased
        const pN = this.playingNotes;
        this.stop(false);
        this.pauseTime = this.currentTime;
        this.playingNotes = pN;
    }

    /**
     * @returns {boolean}
     */
    get paused()
    {
        return this.pauseTime !== undefined;
    }

    /**
     * @param event {MidiEvent}
     * @param timeMs {number}
     */
    sendNoteOn(event, timeMs)
    {
        // main note (skip if 0 to prevent burst of notes when resuming as we aren't skipping the notes because of rendering.)
        if(timeMs > 0) {
            this.timeout(() => {
                this.synth.NoteOn(event.channel, event.data[0], event.data[1]);
            }, timeMs);
        }

        if(!this.renderer)
        {
            return;
        }

        // 500 = 500 ms later, -500 = 500 ms earlier
        const offset = timeMs - this.playbackOffsetMs;
        if(offset < 0)
        {
            // the note should be -offset miliseconds early
            this.renderer.startNoteFall(event.data[0], event.channel, -offset);
        }
        else {
            // the note should be offset miliseconds late
            this.timeout(() => {
                this.renderer.startNoteFall(event.data[0], event.channel);
            }, offset);
        }
    }

    /**
     * @param event {MidiEvent}
     * @param timeMs {number}
     */
    sendnoteOff(event, timeMs)
    {
        // set a noteOff for the set ticks
        // main note (skip if 0 to prevent burst of notes when resuming as we aren't skipping the notes because of rendering.)
        if(timeMs > 0) {
            this.timeout(() => {
                this.synth.NoteOff(event.channel, event.data[0]);
            }, timeMs);
        }

        if(!this.renderer)
        {
            return;
        }

        // 500 = 500 ms later, -500 = 500 ms earlier
        const offset = timeMs - this.playbackOffsetMs;
        if(offset < 0)
        {
            // the note should be -offset miliseconds early
            this.renderer.stopNoteFall(event.data[0], event.channel, -offset);
        }
        else
        {
            // the note should be offset miliseconds late
            this.timeout(() => {
                this.renderer.stopNoteFall(event.data[0], event.channel);
            }, offset);
        }
    }


    /**
     * Starts playing the track
     * @param resetTime {boolean}
     * @param logEverything {boolean}
     * @param playbackOffsetMs {number} in miliseconds, specifies the delay before the playback begins
     */
    play(resetTime = false, logEverything = false, playbackOffsetMs = 100) {
        // resume
        if(this.pauseTime !== undefined)
        {
            this.absoluteStartTimeMs = performance.now() - (this.pauseTime * 1000);
            this.pauseTime = undefined;
        }
        this.finishedTracks = 0;

        if (resetTime) {
            this.absoluteStartTimeMs = performance.now();
        }

        if(this.renderer)
        {
            this.playbackOffsetMs = this.renderer.noteFallingSpeed;
            this.renderer.clearNotes();
        }

        //play the track
        for (let trackNumber = 0; trackNumber < this.midiData.tracksAmount; trackNumber++) {
            let track = this.midiData.decodedTracks[trackNumber];
            console.log("preparing track", trackNumber, "to play")

            for (let event of track) {
                // add the event's ticks
                let eventTimeMs = this.getDeltaAsMs(event.ticks) - (performance.now() - this.absoluteStartTimeMs);
                eventTimeMs += playbackOffsetMs;
                if (eventTimeMs < 0) {
                    // skip the not necessary events
                    if (!(event.type === "Controller Change" ||
                        event.type === "Program Change" ||
                        event.type === "End Of Track")) {
                        continue;
                    }
                    eventTimeMs = 0;
                }
                switch (event.type) {
                    case "Note On":
                        // set a noteOn for the set ticks
                        const velocity = event.data[1];
                        if(velocity > 0) {
                            this.sendNoteOn(event, eventTimeMs);
                        }
                        else
                        {
                            this.sendnoteOff(event, eventTimeMs);
                        }
                        break;

                    case "Note Off":
                        this.sendnoteOff(event, eventTimeMs);
                        break;

                    case "End Of Track":
                        this.timeout(() => {
                            console.log("Finished Track", trackNumber);
                            this.finishedTracks++;
                            if (this.finishedTracks >= this.midiData.tracksAmount) {
                                console.log("Song ended!");
                                this.synth.stopAll();
                                if(this.onended) {
                                    this.onended();
                                }
                                setTimeout(() => this.currentTime = 0, 500);
                            }
                        }, eventTimeMs);
                        break;

                    case "Pitch Wheel":
                        this.timeout(() => {
                            this.synth.pitchWheel(event.channel, event.data[1], event.data[0]);
                        }, eventTimeMs);
                        break;

                    case "Controller Change":
                        this.timeout(() => {
                            this.synth.controllerChange(event.channel, event.controllerName, event.data[1]);
                        }, eventTimeMs);
                        break;

                    case "Program Change":
                        this.timeout(() =>{
                            this.synth.programChange(event.channel, event.data[0]);
                        }, eventTimeMs);
                        break;

                    case "System Reset":
                        this.timeout(() => {
                            this.synth.stopAll();
                            console.log("System Reset");
                        }, eventTimeMs);
                        break;

                    default:
                        if (logEverything) {
                            this.timeout(() => {
                                console.log("Ignoring Event:", event.type);
                            }, eventTimeMs);
                        }
                        break;
                }
            }
        }

        if(this.renderer)
        {
            this.renderer.resume();
        }
    }

    set currentTime(time) {
        this.stop(true);
        this.absoluteStartTimeMs = performance.now() - (time * 1000);
        this.play(false).then();
    }

    get currentTime() {
        if(this.pauseTime)
        {
            return this.pauseTime;
        }
        let time = (performance.now() - this.absoluteStartTimeMs) / 1000;
        if (time > this.duration) {
            return this.duration
        } else {
            return time;
        }
    }

    /**
     * Stops the playback. To pause, use pause()
     * @param clearRenderer {boolean} if the seq should clear the notes from the connected renderer's screen. Defaults to true.
     */
    stop(clearRenderer = true) {
        for (let t of this.timeouts) {
            clearTimeout(t);
        }
        if(this.renderer && clearRenderer)
        {
            this.renderer.clearNotes();
        }
        this.synth.stopAll();
    }

    timeout(call, time) {
        this.timeouts.push(setTimeout(call, time));
    }

    /**
     * Calls when playback is finished
     * @type {function()}
     */
    onended;
}