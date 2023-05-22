import {MidiKeyboard} from "./midi_keyboard.js";
import {MidiSynthetizer} from "../midi_player/midi_synthetizer.js";
import {MidiRenderer} from "./midi_renderer.js";
import {MidiParser} from "../midi_parser/midi_parser.js";
import "../midi_parser/events/midi_event.js";
import "../midi_parser/events/meta_event.js";
import "../midi_parser/events/sysex_event.js";

import {SoundFont2Parser} from "../soundfont2_parser/soundfont_parser.js";

export class MidiManager
{
    channelColors = [
        'rgba(255, 99, 71, 1)',   // tomato
        'rgba(255, 165, 0, 1)',   // orange
        'rgba(255, 215, 0, 1)',   // gold
        'rgba(50, 205, 50, 1)',   // limegreen
        'rgba(60, 179, 113, 1)',  // mediumseagreen
        'rgba(0, 128, 0, 1)',     // green
        'rgba(0, 191, 255, 1)',   // deepskyblue
        'rgba(65, 105, 225, 1)',  // royalblue
        'rgba(138, 43, 226, 1)',  // blueviolet
        'rgba(50, 120, 125, 1)', //'rgba(218, 112, 214, 1)', // percission color
        'rgba(255, 0, 255, 1)',   // magenta
        'rgba(255, 20, 147, 1)',  // deeppink
        'rgba(218, 112, 214, 1)', // orchid
        'rgba(240, 128, 128, 1)', // lightcoral
        'rgba(255, 192, 203, 1)', // pink
        'rgba(255, 255, 0, 1)'    // yellow
    ];

    /**
     * Creates a new midi user interface.
     * @param context {BaseAudioContext}
     * @param soundFont {SoundFont2Parser}
     */
    constructor(context, soundFont) {
        this.analyser = context.createAnalyser();
        this.analyser.connect(context.destination);
        // set up synth, keyboard and renderer
        this.soundFont = soundFont;
        this.synth = new MidiSynthetizer(this.analyser, this.soundFont);

        this.keyboard = new MidiKeyboard(this.channelColors);

        this.renderer = new MidiRenderer(this.channelColors, this.analyser);
        this.renderer.render(t => document.getElementById("title").innerText = t)

        // connect the keyboard to synth
        this.keyboard.onNotePressed = (note, vel) => this.synth.playUserNote(note, vel);
        this.keyboard.onNoteRelased = note => this.synth.stopuserNote(note);

        this.keyboard.onHoldPressed = () => this.synth.userChannel.pressHoldPedal();
        this.keyboard.onHoldReleased = () => this.synth.userChannel.releaseHoldPedal();

        // connect the synth to keyboard
        this.synth.onNoteOn = (note, chan, vel, vol, exp) => this.keyboard.pressNote(note, chan, vel, vol, exp);
        this.synth.onNoteOff = note => this.keyboard.releaseNote(note);

        document.getElementById("preset_selector").onchange = e => {
            this.synth.userChannel.changePreset(this.soundFont.getPresetByName(e.target.value));
            console.log("Changing user preset to:", e.target.value);
        }
    }

    /**
     * starts playing and rendering the midi file
     * @param parsedMidi {MidiParser}
     * @param resetTime {boolean}
     * @param debugMode {boolean}
     */
    play(parsedMidi, resetTime= false, debugMode= false)
    {
        this.synth.play(parsedMidi, resetTime, debugMode).then(() => {
            this.renderer.startSynthRendering(this.synth);
        })
    }
}