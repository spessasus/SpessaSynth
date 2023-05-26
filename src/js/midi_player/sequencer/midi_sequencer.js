import {MidiParser} from "../../midi_parser/midi_parser.js";
import {MidiSynthetizer} from "../synthetizer/midi_synthetizer.js";
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
        this.controls = document.getElementById("sequencer_controls");

        if(!this.midiData.decodedTracks)
        {
            throw "No tracks supplied!";
        }
        // default time sig is 4/4
        this.beatsPerMeasure = 4;
        let resetButton = document.getElementById("note_killer");
        resetButton.style.display = "block";
        resetButton.onclick = () => synth.resetAll();

        // find all tempos and total time, also calculate absolute delta total
        this.tempoChanges = [{deltaTicks: 0, tempo: 120}];

        let maxTime = 0;
        console.log("Loading time and deltas");
        for (let trackNumber = 0; trackNumber < this.midiData.tracksAmount; trackNumber++) {
            let track = this.midiData.decodedTracks[trackNumber];

            let deltaTotal = 0;
            for (let event of track) {
                deltaTotal += event.delta;
                if (event.type === "Set Tempo") {
                    this.tempoChanges.push({
                        deltaTicks: deltaTotal,
                        tempo: 60000000 / this.midiData.readBytesAsNumber(Array.from(event.data), event.data.length)
                    })
                }
                event.deltaTotal = deltaTotal;

            }
            if (deltaTotal > maxTime) {
                maxTime = deltaTotal;
            }
        }
        // ms -> s
        this.duration = this.getDeltaAsMs(maxTime) / 1000;
        maxTime = Math.round(this.duration);

        // calculate notes' length and lowest and highest note
        this.maxNote = 0;
        this.minNote = 127;

        console.log("Loading notes' length")
        for (let trackNumber = 0; trackNumber < this.midiData.tracksAmount; trackNumber++) {
            let track = this.midiData.decodedTracks[trackNumber];
            console.log("for track", trackNumber);

            let playingNotes = []
            let playingNotesTimes = []

            const calculateNoteTime = event =>
            {
                for(let note of playingNotes)
                {
                    if(note.channel === event.channel && event.data[0] === note.data[0])
                    {
                        let index = playingNotes.indexOf(note);
                        playingNotes.splice(index, 1);
                        note.msLength = this.getDeltaAsMs(event.deltaTotal) - playingNotesTimes[index];
                        playingNotesTimes.splice(index, 1);
                        break;
                    }
                }
            }

            for (let event of track) {
                if(event.type === "Note On")
                {
                    if(event.data[1] !== 0)
                    {
                        playingNotes.push(event);
                        playingNotesTimes.push(this.getDeltaAsMs(event.deltaTotal));
                        if(event.data[0] > this.maxNote)
                        {
                            this.maxNote = event.data[0];
                        }
                        else if(event.data[0] < this.minNote)
                        {
                            this.minNote = event.data[0];
                        }
                    }
                    else
                    {
                        calculateNoteTime(event);
                    }
                }
                else if(event.type === "Note Off")
                {
                    calculateNoteTime(event);
                }
            }
        }
        console.log("Min note:", this.minNote, "Max note:", this.maxNote)

        this.timeouts = [];
        /**
         * @type {HTMLInputElement}
         */

        // prepare the slider
        this.createSlider();

        console.log(`TOTAL TIME: ${formatTime(maxTime).time}`);
        this.absoluteStartTimeMs = performance.now();
    }

    getDeltaAsMs(deltaTicks) {
        if (deltaTicks <= 0) {
            return 0;
        }
        let ticksPerBeat = this.midiData.timeDivision * (4 / this.beatsPerMeasure);
        // find the nearest tempo
        let tempo;
        for (let t of this.tempoChanges) {
            if (t.deltaTicks >= deltaTicks) {
                break;
            }
            tempo = t;
        }
        let timeSinceLastTempo = deltaTicks - tempo.deltaTicks;
        return this.getDeltaAsMs(deltaTicks - timeSinceLastTempo) + (timeSinceLastTempo * 60000) / (tempo.tempo * ticksPerBeat);
    }

    createSlider() {
        this.slider = document.createElement("div")
        this.slider.id = "note_progress";
        this.slider.min = (0).toString();
        this.slider.max =  this.duration.toString()
        // this.slider.onchange = () => {
        //     clearInterval(this.sliderInterval);
        //
        //     this.currentTime = (this.slider.value / this.slider.max) * this.duration;
        //
        //     this.sliderInterval = setInterval(() => {
        //         this.slider.value = ((this.currentTime / this.duration) * this.slider.max).toString();
        //     }, 200);
        // };
        //
        // this.sliderInterval = setInterval(() => {
        //     this.slider.value = ((this.currentTime / this.duration) * this.slider.max).toString();
        // }, 100);

        this.controls.appendChild(this.slider);
    }

    setSliderInterval(){
        this.sliderInterval = setInterval(() => {
            this.slider.style.width = `${(this.currentTime / this.duration) * 100}%`;
        }, 100);
    }


    /**
     * Starts playing the track
     * @param resetTime {boolean}
     * @param logEverything {boolean}
     * @return {Promise<boolean>}
     */
    async play( resetTime = false, logEverything = false) {
        this.finishedTracks = 0;

        if (resetTime) {
            this.absoluteStartTimeMs = performance.now();
            this.slider.value = "0";
        }
        //play the track
        for (let trackNumber = 0; trackNumber < this.midiData.tracksAmount; trackNumber++) {
            let track = this.midiData.decodedTracks[trackNumber];
            console.log("preparing track", trackNumber, "to play")

            // for startRendering()
            track.lastNoteId = undefined;

            for (let event of track) {
                // add the event's delta
                let currentDeltaMs = this.getDeltaAsMs(event.deltaTotal) - (performance.now() - this.absoluteStartTimeMs);
                if (currentDeltaMs < 0) {
                    // skip the not necessary events
                    if (!(event.type === "Controller Change" ||
                        event.type === "Program Change" ||
                        event.type === "End Of Track") && !resetTime) {
                        continue;
                    }
                    currentDeltaMs = 0;
                }
                switch (event.type) {
                    case "Note On":
                        // set a noteOn for the set delta
                        this.timeout(() => {
                            this.synth.NoteOn(event.channel, event.data[0], event.data[1]);
                        }, currentDeltaMs);
                        break;

                    case "Note Off":
                        // set a noteOff for the set delta
                        this.timeout(() => {
                            this.synth.NoteOff(event.channel, event.data[0]);
                        }, currentDeltaMs);
                        break;

                    case "End Of Track":
                        this.timeout(() => {
                            console.log("Finished Track", trackNumber);
                            this.finishedTracks++;
                            if (this.finishedTracks >= this.midiData.tracksAmount) {
                                clearInterval(this.sliderInterval);
                                console.log("Song ended!");
                                this.synth.resetAll();
                                if(this.onended) {
                                    this.onended();
                                }
                                setTimeout(() => this.currentTime = 0, 500);
                            }
                        }, currentDeltaMs);
                        if (currentDeltaMs > this.maxTime) {
                            this.maxTime = currentDeltaMs;
                        }
                        break;

                    // case "Text Event":
                    // case "Copyright":
                    // case "Track Name":
                    // case "Lyrics":
                    //     this.timeout(() => {
                    //         this.synth.textEvent(event);
                    //     }, currentDeltaMs);
                    //     break;
                        /*
                        textEvent(event) {
                        const td = new TextDecoder("windows-1250");
                        let decodedText = td.decode(new Uint8Array(event.data)).replace("\n", "");
                        if(event.type === "Lyrics")
                        {
                            let text = decodedText;
                            if(this.lastLyricsText)
                            {
                                text = this.lastLyricsText + " " + decodedText;
                            }
                            this.lastLyricsText = decodedText
                            document.getElementById("text_event").innerText = text;
                        }
                        else {
                            document.getElementById("text_event").innerText =
                                `${event.type}: ${decodedText}`;
                        }
                    }*/

                    case "Pitch Wheel":
                        this.timeout(() => {
                            this.synth.pitchWheel(event.channel, event.data[1], event.data[0]);
                        }, currentDeltaMs);
                        break;

                    case "Controller Change":
                        this.timeout(() => {
                            this.synth.controllerChange(event.channel, event.controllerName, event.data[1]);
                        }, currentDeltaMs);
                        break;

                    case "Program Change":
                        this.timeout(() =>{
                            this.synth.programChange(event.channel, event.data[0]);
                        }, currentDeltaMs);
                        break;

                    case "System Reset":
                        this.timeout(() => {
                            this.synth.resetAll();
                            console.log("System Reset");
                        }, currentDeltaMs);
                        break;

                    default:
                        if (logEverything) {
                            this.timeout(() => {
                                console.log("Ignoring Event:", event.type);
                            }, currentDeltaMs);
                        }
                        break;
                }
            }
        }
        this.setSliderInterval();
        return true;
    }

    set currentTime(time) {
        this.stop();
        this.absoluteStartTimeMs = performance.now() - (time * 1000);
        this.play(false).then();
    }

    get currentTime() {
        let time = (performance.now() - this.absoluteStartTimeMs) / 1000;
        if (time > this.duration) {
            return this.duration
        } else {
            return time;
        }
    }

    stop() {
        for (let t of this.timeouts) {
            clearTimeout(t);
        }
        clearInterval(this.sliderInterval);
        this.synth.resetAll();
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