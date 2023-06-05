import {MidiKeyboard} from "./ui/midi_keyboard.js";
import {Synthetizer} from "./midi_player/synthetizer/synthetizer.js";
import {MidiRenderer} from "./ui/midi_renderer.js";
import {Sequencer} from "./midi_player/sequencer/sequencer.js";
import {MIDI} from "./midi_parser/midi_loader.js";

import {SoundFont2} from "./soundfont/soundfont_parser.js";
import {SequencerUI} from "./ui/sequencer_ui.js";
import {SynthetizerUI} from "./ui/synthetizer_ui.js";

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
     * @param soundFont {SoundFont2}
     */
    constructor(context, soundFont) {

        // set up soundfont
        this.soundFont = soundFont;

        // set up synthetizer
        this.synth = new Synthetizer(context.destination, this.soundFont);

        // set up keyboard
        this.keyboard = new MidiKeyboard(this.channelColors, this.synth);

        // set up renderer
        this.renderer = new MidiRenderer(this.channelColors, this.synth);
        this.renderer.render(t => document.getElementById("title").innerText = t)

        // connect the synth to keyboard
        this.synth.onNoteOn = (note, chan, vel, vol, exp) => this.keyboard.pressNote(note, chan, vel, vol, exp);
        this.synth.onNoteOff = note => this.keyboard.releaseNote(note);

        // set up synth UI
        this.synthUI = new SynthetizerUI(this.channelColors);
        this.synthUI.connectSynth(this.synth);

        // create an UI for sequencer
        this.seqUI = new SequencerUI();
    }

    /**
     * starts playing and rendering the midi file
     * @param parsedMidi {MIDI}
     * @param resetTime {boolean}
     */
    play(parsedMidi, resetTime = false)
    {
        // create a new sequencer
        this.seq = new Sequencer(parsedMidi, this.synth);

        // connect to the UI
        this.seqUI.connectSequencer(this.seq);

        // connect to the renderer;
        this.seq.connectRenderer(this.renderer);

        // play the midi
        this.seq.play(resetTime);
    }
}