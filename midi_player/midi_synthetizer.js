import {MidiChannel} from "../midi_parser/midi_channel.js";
import "../midi_parser/events/midi_event.js";
import "../midi_parser/events/meta_event.js";
import "../midi_parser/events/sysex_event.js";
import {MidiParser} from "../midi_parser/midi_parser.js";
import {formatTime} from "../utils/text_formatting.js";
import {SoundFont2Parser} from "../soundfont2_parser/soundfont_parser.js";

export class MidiSynthetizer {
    /**
     * @param targetNode {AudioNode}
     * @param soundFont {SoundFont2Parser}
     */
    constructor(targetNode, soundFont) {
        this.outputNode = targetNode;
        this.soundFont = soundFont;

        // default time sig is 4/4
        this.beatsPerMeasure = 4;
        this.userChannel = new MidiChannel(this.outputNode, this.soundFont.presets[0], true);
    }

    /**
     * calls when the playback is finished
     * @type {function()}
     */
    onended;

    prepareMidi(parsedMidiObject)
    {
        /**
         * @type {MidiParser}
         */
        this.midiData = parsedMidiObject;
        if(!this.midiData.decodedTracks)
        {
            throw "No tracks supplied!";
        }
        console.log("Preparing channels");
        /**
         * @type {MidiChannel[][]}
         */
        this.trackChannels = new Array(this.midiData.tracksAmount);

        this.trackBankNumbers = [];

        // set up channels
        for (let trackNumber = 0; trackNumber < this.midiData.tracksAmount; trackNumber++) {
            this.trackBankNumbers.push(0);
            // create 16 channels for the track
            this.trackChannels[trackNumber] = new Array(16);
            for (let j = 0; j < 16; j++) {
                if(j === 9)
                {
                    // default to percussion
                    this.trackChannels[trackNumber][j] = new MidiChannel(this.outputNode, this.soundFont.getPreset(128, 0));
                }
                else {
                    // default to the first preset
                    this.trackChannels[trackNumber][j] = new MidiChannel(this.outputNode, this.soundFont.presets[0]);
                }
            }
        }

        let resetButton = document.getElementById("note_killer");
        resetButton.style.display = "block";
        resetButton.onclick = () => this.resetAll();

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
                }
                else if(event.type === "Note Off")
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

    createSlider() {
        this.slider = document.getElementsByClassName("slider")[0];
        this.slider.style.visibility = "visible";
        this.slider.onchange = e => {
            clearInterval(this.sliderUpdater);

            this.currentTime = (e.target.value / e.target.max) * this.duration;

            this.sliderUpdater = setInterval(() => {
                this.slider.value = ((this.currentTime / this.duration) * this.slider.max).toString();
            }, 200);
        };

        this.sliderUpdater = setInterval(() => {
            this.slider.value = ((this.currentTime / this.duration) * this.slider.max).toString();
        }, 100);
    }

    NoteOn(trackNumber, channel, midiNote, velocity) {
        if (velocity === 0) {
            this.NoteOff(trackNumber, channel, midiNote, 0);
            return;
        }
        let chan = this.trackChannels[trackNumber][channel];
        chan.playNote(midiNote, velocity);
        this.onNoteOn(midiNote, channel, velocity, chan.channelVolume, chan.channelExpression);
    }

    NoteOff(trackNumber, channel, midiNote) {
        this.trackChannels[trackNumber][channel].stopNote(midiNote);
        this.onNoteOff(midiNote);
    }

    /**
     * Plays when the midi note goes on
     * @param midiNote {number} 0-127
     * @param channel {number} 0-15
     * @param velocty {number} 0-127
     * @param volume {number} 0-1
     * @param expression {number} 0-1
     */
    onNoteOn;

    /**
     * Plays when the midi note goes off
     * @param midiNote {number} 0-127
     */
    onNoteOff;

    /**
     * Plays a note on the user's channel
     * @param midiNote {number}
     * @param velocity {number}
     */
    playUserNote = (midiNote, velocity) => this.userChannel.playNote(midiNote, velocity);

    /**
     * Stops a note on the user's channel
     * @param midiNote {number}
     */
    stopuserNote = midiNote => this.userChannel.stopNote(midiNote, 0);

    /**
     * @param event {MidiEvent|MetaEvent|SysexEvent}
     */
    textEvent(event) {
        let decodedText = this.midiData.readBytesAsString(Array.from(event.data), event.data.length).replace("\n", "");
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
    }

    /**
     * @param trackChannels {MidiChannel[]}
     */
    resetTrack(trackChannels) {
        for (let channel of trackChannels) {
            channel.stopAll();
        }
        for(let i = 0; i < 128; i++)
        {
            this.onNoteOff(i);
        }
    }

    resetAll() {
        for (let track of this.trackChannels) {
            this.resetTrack(track);
        }
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

    timeout(call, time) {
        this.timeouts.push(setTimeout(call, time));
    }

    set currentTime(time) {
        this.stop();
        this.absoluteStartTimeMs = performance.now() - (time * 1000);
        this.play(null, false).then();
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
        this.resetAll();
    }

    /**
     * Starts playing the track
     * @param parsedMidiObject {MidiParser}
     * @param resetTime {boolean}
     * @param logEverything {boolean}
     * @return {Promise<boolean>}
     */
    async play(parsedMidiObject, resetTime = false, logEverything = false) {
        if(!this.midiData)
        {
            if (!parsedMidiObject) {
                throw new Error("No midi object!");
            }
            this.prepareMidi(parsedMidiObject);
        }
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
                            this.NoteOn(trackNumber, event.channel, event.data[0], event.data[1]);
                        }, currentDeltaMs);
                        break;

                    case "Note Off":
                        // set a noteOff for the set delta
                        this.timeout(() => {
                            this.NoteOff(trackNumber, event.channel, event.data[0]);
                        }, currentDeltaMs);
                        break;

                    case "End Of Track":
                        this.timeout(() => {
                            console.log("Finished Track", trackNumber);
                            this.resetTrack(this.trackChannels[trackNumber]);
                            this.finishedTracks++;
                            if (this.finishedTracks >= this.midiData.tracksAmount) {
                                // clearInterval(this.sliderUpdater);
                                console.log("Song ended!");
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

                    case "Text Event":
                    case "Copyright":
                    case "Track Name":
                    case "Lyrics":
                        this.timeout(() => {
                            this.textEvent(event);
                        }, currentDeltaMs);
                        break;

                    case "Pitch Wheel":
                        this.timeout(() => {
                            this.trackChannels[trackNumber][event.channel].setPitchBend(event.data[1], event.data[0]);
                        }, currentDeltaMs);
                        break;

                    case "Controller Change":
                        let controllerValue = event.data[1];
                        switch (event.controllerName) {
                            case "Main Volume":
                                this.timeout(() => {
                                    if(logEverything)
                                    {
                                        console.log("volume change track", trackNumber, "channel", event.channel, "to", event.data[1]);
                                    }
                                    this.trackChannels[trackNumber][event.channel].setVolume(controllerValue);
                                }, currentDeltaMs);
                                break;

                            case "LSB for Control 7 (Main Volume)":
                                this.timeout(() => {
                                    let nevVol = (this.trackChannels[trackNumber][event.channel].channelVolume << 7) | controllerValue;
                                    this.trackChannels[trackNumber][event.channel].setVolume(nevVol);
                                    console.log("changing", trackNumber, "channel", event.channel, "volume to", nevVol);
                                }, currentDeltaMs);
                                break;

                            case "Sustain Pedal":
                                this.timeout(() => {
                                    if(controllerValue < 64) {
                                        this.trackChannels[trackNumber][event.channel].releaseHoldPedal();
                                        if (logEverything)
                                        {
                                            console.log("Hold pedal OFF for channel", event.channel);
                                        }
                                    }
                                    else
                                    {
                                        this.trackChannels[trackNumber][event.channel].pressHoldPedal();
                                        if (logEverything)
                                        {
                                            console.log("Hold pedal ON for channel", event.channel);
                                        }
                                    }
                                }, currentDeltaMs);
                                break;

                            case "Pan":
                                this.timeout(() => {
                                    let pan = (event.data[1] - 64) / 64;
                                    this.trackChannels[trackNumber][event.channel].changePan(pan);
                                }, currentDeltaMs);
                                break;

                            case "All Notes Off":
                            case "All Sound Off":
                                this.resetTrack(this.trackChannels[trackNumber]);
                                console.log("Resetting track", trackNumber);
                                break;

                            case "Expression Controller":
                                this.timeout(() => {
                                    this.trackChannels[trackNumber][event.channel]
                                        .setExpression(controllerValue / 127);
                                    if(logEverything) {
                                        console.log("Changing expression for track", trackNumber, "channel", event.channel, "to", controllerValue / 127);
                                    }
                                }, currentDeltaMs);
                                break;

                            case "Bank Select":
                                this.timeout(() =>{
                                    this.trackBankNumbers[trackNumber] = controllerValue
                                }, currentDeltaMs);
                                break;

                            case "Non-Registered Parameter Number MSB":
                                this.trackChannels[trackNumber][event.channel].NRPN_MSB = controllerValue;
                                break;

                            case "Non-Registered Parameter Number LSB":
                                this.trackChannels[trackNumber][event.channel].NRPN_LSB = controllerValue;
                                break;

                            case "Data Entry MSB":
                                this.trackChannels[trackNumber][event.channel].dataEntry(controllerValue);
                                break;

                            default:
                                if (logEverything) {
                                    this.timeout(() => {
                                        console.log("Ignoring Controller:", event.controllerName);
                                    }, currentDeltaMs);
                                }
                                break;
                        }
                        break;

                    case "Program Change":
                        this.timeout(() =>{
                            let bankNr = this.trackBankNumbers[trackNumber];
                            if(event.channel === 9)
                            {
                                // 128 for percussion channel
                                bankNr = 128
                            }
                            if(bankNr === 128 && event.channel !== 9)
                            {
                                // if channel is not for percussion, default to bank 0
                                bankNr = 0;
                            }
                            let preset = this.soundFont.getPreset(bankNr, event.data[0])
                            this.trackChannels[trackNumber][event.channel].changePreset(preset);
                            console.log("changing track", trackNumber, "channel", event.channel, "to bank:", bankNr,
                                "preset:", event.data[0], preset.presetName);
                        }, currentDeltaMs);
                        break;

                    /*case "TIME_SIG":
                        let numerator = event.data[0];
                        let denominator = event.data[1];
                        this.beatsPerMeasure = numerator * (Math.pow(2, denominator - 2))
                        setTimeout(() =>
                        {
                            console.log("Time signature", this.beatsPerMeasure);
                        }, currentDeltaMs);
                        break;*/

                    case "System Reset":
                        this.timeout(() => {
                            this.resetAll();
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
        return true;
    }
}