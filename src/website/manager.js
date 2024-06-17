import { MidiKeyboard } from './ui/midi_keyboard.js'
import { Synthetizer } from '../spessasynth_lib/synthetizer/synthetizer.js'
import { Renderer } from './ui/renderer/renderer.js'
import { MIDI } from '../spessasynth_lib/midi_parser/midi_loader.js'

import { SequencerUI } from './ui/sequencer_ui/sequencer_ui.js'
import { SynthetizerUI } from './ui/synthesizer_ui/synthetizer_ui.js'
import { MIDIDeviceHandler } from '../spessasynth_lib/midi_handler/midi_handler.js'
import { WebMidiLinkHandler } from '../spessasynth_lib/midi_handler/web_midi_link.js'
import { Sequencer } from '../spessasynth_lib/sequencer/sequencer.js'
import { Settings } from './ui/settings_ui/settings.js'
import { MusicModeUI } from './ui/music_mode_ui.js'
//import { SoundFontMixer } from './ui/soundfont_mixer.js'
import { LocaleManager } from './locale/locale_manager.js'
import { DEFAULT_LOCALE, localeList } from './locale/locale_files/locale_list.js'
import { isMobile } from '../spessasynth_lib/utils/other.js'
import { SpessaSynthInfo, SpessaSynthWarn } from '../spessasynth_lib/utils/loggin.js'

/**
 * manager.js
 * purpose: connects every element of spessasynth together
 */

    export class Manager {
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
        'rgba(50, 120, 125, 1)',  //'rgba(218, 112, 214, 1)', // percission color
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
     * @param soundFontBuffer {ArrayBuffer}
     */
    constructor(context, soundFontBuffer) {
        this.context = context;
        this.initializeContext(context, soundFontBuffer).then();
        this.ready = false;
        this.sf = soundFontBuffer;
    }

    /**
     * @param callback {function(number)} progress from 0 to 1
     * @returns {Promise<AudioBuffer>}
     */
    async renderAudio(callback=undefined)
    {
        if(!this.seq)
        {
            throw new Error("No sequencer active");
        }
        const parsedMid = this.seq.midiData;
        // prepare audio context
        const offline = new OfflineAudioContext({
            numberOfChannels: 2,
            sampleRate: this.context.sampleRate,
            length: this.context.sampleRate * (parsedMid.duration + 1)
        });
        const workletURL = new URL("../spessasynth_lib/synthetizer/worklet_system/worklet_processor.js", import.meta.url).href;
        await offline.audioWorklet.addModule(workletURL);

        /**
         * take snapshot of the real synth
         * @type {SynthesizerSnapshot}
         */
        const snapshot = await this.synth.getSynthesizerSnapshot();
        /**
         * Prepare synthesizer
         * @type {Synthetizer}
         */
        let synth;
        try
        {
            synth = new Synthetizer(offline.destination, this.sf, false, {
                parsedMIDI: parsedMid,
                snapshot: snapshot
            });
        }
        catch (e) {
            window.alert(this.localeManager.getLocaleString("locale.outOfMemory"));
            throw e;
        }
        if(callback)
        {
            const interval = setInterval(() => callback(synth.currentTime / parsedMid.duration), 100);
            const buf = await offline.startRendering();
            clearInterval(interval);
            return buf;
        }
        else
        {
            return offline.startRendering();
        }

    }

    async initializeContext(context, soundFont) {

        // initialize the locale management system. do it here because we want it ready before all ui classes do their things
        // get locale from user "en-US" will turn into just "en"
        let locale = navigator.language.split("-")[0].toLowerCase();
        if(localeList[locale])
        {
            SpessaSynthInfo(`Locale ${locale} found! using it.`)
        }
        else
        {
            SpessaSynthWarn(`Locale ${locale} not found. Using ${DEFAULT_LOCALE}.`)
            locale = DEFAULT_LOCALE;
        }
        this.localeManager = new LocaleManager(localeList[locale]);


        // bind every element with translate-path to translation
        for(const element of document.querySelectorAll("*[translate-path]"))
        {
            this.localeManager.bindObjectProperty(element, "innerText", element.getAttribute("translate-path"));
        }

        if(context.audioWorklet) {
            const workletURL = new URL("../spessasynth_lib/synthetizer/worklet_system/worklet_processor.js", import.meta.url).href;
            await context.audioWorklet.addModule(workletURL);
        }
        // set up soundfont
        this.soundFont = soundFont;

        // set up synthetizer
        this.synth = new Synthetizer(context.destination, this.soundFont);

        // set up midi access
        this.midHandler = new MIDIDeviceHandler();

        // set up web midi link
        this.wml = new WebMidiLinkHandler(this.synth);

        // set up keyboard
        this.keyboard = new MidiKeyboard(this.channelColors, this.synth);

        // set up renderer
        const canvas = document.getElementById("note_canvas");

        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;

        window.addEventListener("resize", () => {
            canvas.width = window.innerWidth * window.devicePixelRatio;
            canvas.height = window.innerHeight * window.devicePixelRatio;
        });

        this.renderer = new Renderer(this.channelColors, this.synth, canvas);
        this.renderer.render(true);

        // if on mobile, switch to a 5 octave keyboard

        if(isMobile())
        {
            this.renderer.keyRange = {min: 36, max: 96};
            this.keyboard.keyRange = {min: 36, max: 96};
        }

        // set up synth UI
        this.synthUI = new SynthetizerUI(this.channelColors, document.getElementById("synthetizer_controls"), this.localeManager);
        this.synthUI.connectSynth(this.synth);

        // create an UI for sequencer
        this.seqUI = new SequencerUI(document.getElementById("sequencer_controls"), this.localeManager);

        // create an UI for music player mode
        this.playerUI = new MusicModeUI(document.getElementById("player_info"), this.localeManager);

        // set up settings UI
        this.settingsUI = new Settings(
            document.getElementById("settings_div"),
            this.synthUI,
            this.seqUI,
            this.renderer,
            this.keyboard,
            this.midHandler,
            this.playerUI,
            this.localeManager,
            localeList);

        // set up soundfont mixer (unfinished)
        //this.soundFontMixer = new SoundFontMixer(document.getElementsByClassName("midi_and_sf_controller")[0], this.synth, this.synthUI);
        //this.soundFontMixer.soundFontChange(soundFont);

        // add keypresses
        document.addEventListener("keypress", e => {
            switch (e.key.toLowerCase()) {
                case "c":
                    e.preventDefault();
                    if(this.seq)
                    {
                        this.seq.pause();
                    }
                    const response = window.prompt("Cinematic mode activated!\n Paste the link to the image for canvas (leave blank to disable)", "");
                    if(this.seq)
                    {
                        this.seq.play();
                    }
                    if (response === null) {
                        return;
                    }
                    canvas.style.background = `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), center center / cover url("${response}")`;
                    document.getElementsByClassName("top_part")[0].style.display = "none";
                    document.getElementsByClassName("bottom_part")[0].style.display = "none";
                    document.body.requestFullscreen().then();
                    break;

                case "v":
                    e.preventDefault();
                    if(this.seq)
                    {
                        this.seq.pause();
                    }
                    const videoSource = window.prompt("Video mode!\n Paste the link to the video source (leave blank to disable)\n" +
                        "Note: the video will be available in console as 'video'", "");
                    if (videoSource === null) {
                        return;
                    }
                    const video = document.createElement("video");
                    video.src = videoSource;
                    video.classList.add("secret_video");
                    canvas.parentElement.appendChild(video);
                    video.play();
                    window.video = video;
                    if(this.seq)
                    {
                        video.currentTime = parseFloat(window.prompt("Video offset to sync to midi, in seconds.", "0"));
                        video.play();
                        this.seq.currentTime = 0;
                    }
                    document.addEventListener("keypress", e => {
                        if(e.key === " ")
                        {
                            if(video.paused)
                            {
                                video.play();
                            }
                            else
                            {
                                video.pause();
                            }
                        }
                    })

                    break;
            }
        });
        this.ready = true;
    }

    /**
     * @param sf {ArrayBuffer}
     */
    reloadSf(sf)
    {
        //this.soundFontMixer.soundFontChange(sf);
        this.synth.reloadSoundFont(sf);
        this.sf = sf;
    }

    /**
     * starts playing and rendering the midi file
     * @param parsedMidi {MIDI[]}
     */
    play(parsedMidi)
    {
        if (!this.synth)
        {
            return;
        }

        // create a new sequencer
        this.seq = new Sequencer(parsedMidi, this.synth);

        // connect to the UI
        this.seqUI.connectSequencer(this.seq);

        // connect to the Player UI
        this.playerUI.connectSequencer(this.seq);

        // connect to the renderer;
        this.seq.connectRenderer(this.renderer);

        // play the midi
        this.seq.play(true);
    }
}