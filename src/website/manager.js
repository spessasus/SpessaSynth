import { MidiKeyboard } from './js/midi_keyboard.js'
import { Synthetizer } from '../spessasynth_lib/synthetizer/synthetizer.js'
import { Renderer } from './js/renderer/renderer.js'
import { MIDI } from '../spessasynth_lib/midi_parser/midi_loader.js'

import { SequencerUI } from './js/sequencer_ui/sequencer_ui.js'
import { SynthetizerUI } from './js/synthesizer_ui/synthetizer_ui.js'
import { MIDIDeviceHandler } from '../spessasynth_lib/midi_handler/midi_handler.js'
import { WebMidiLinkHandler } from '../spessasynth_lib/midi_handler/web_midi_link.js'
import { Sequencer } from '../spessasynth_lib/sequencer/sequencer.js'
import { SpessaSynthSettings } from './js/settings_ui/settings.js'
import { MusicModeUI } from './js/music_mode_ui.js'
//import { SoundFontMixer } from './js/soundfont_mixer.js'
import { LocaleManager } from './locale/locale_manager.js'
import { isMobile } from './js/utils/is_mobile.js'
import { SpessaSynthInfo } from '../spessasynth_lib/utils/loggin.js'
import { showNotification } from './js/notification.js'

const RENDER_AUDIO_TIME_INTERVAL = 500;

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
        let solve;
        this.ready = new Promise(resolve => solve = resolve);
        this.initializeContext(context, soundFontBuffer).then(() => {
            solve();
        });
        this.sf = soundFontBuffer;
    }

    /**
     * @param callback {function(number, number)} progress from 0 to 1, speed multiplier
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
            }, {
                reverbEnabled: true,
                chorusEnabled: true,
                chorusConfig: undefined,
                reverbImpulseResponse: this.impulseResponse
            });
        }
        catch (e) {
            showNotification(this.localeManager.getLocaleString("locale.warnings.warning"), this.localeManager.getLocaleString("locale.warnings.outOfMemory"))
            throw e;
        }
        if(callback)
        {
            const RATI_SECONDS = RENDER_AUDIO_TIME_INTERVAL / 1000;
            let rendered = synth.currentTime;
            const interval = setInterval(() => {
                let hasRendered = synth.currentTime - rendered;
                rendered = synth.currentTime;
                callback(synth.currentTime / parsedMid.duration, hasRendered / RATI_SECONDS)
            }, RENDER_AUDIO_TIME_INTERVAL);
            const buf = await offline.startRendering();
            clearInterval(interval);
            SpessaSynthInfo(buf)
            return buf;
        }
        else
        {
            return offline.startRendering();
        }

    }

    /**
     * @type {function(string)}
     */
    sfError;

    /**
     * @param context {BaseAudioContext}
     * @param soundFont {ArrayBuffer}
     * @returns {Promise<void>}
     */
    async initializeContext(context, soundFont) {

        if(!context.audioWorklet)
        {
            alert("Audio worklet is not supported on your browser. Sorry!")
            throw "Not supported."
        }
        // initialize the locale management system. do it here because we want it ready before all js classes do their things
        // get locale from user "en-US" will turn into just "en"
        let locale = navigator.language.split("-")[0].toLowerCase();
        this.localeManager = new LocaleManager(locale);


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

        // set up buffer here (if we let spessasynth use the default buffer, there's no reverb for the first second.)
        const impulseURL = new URL("../spessasynth_lib/synthetizer/audio_effects/impulse_response_2.flac", import.meta.url);
        const response = await fetch(impulseURL)
        const data = await response.arrayBuffer();
        this.impulseResponse = await context.decodeAudioData(data);

        // set up synthetizer
        this.synth = new Synthetizer(
            context.destination,
            this.soundFont,
            undefined,
            undefined,
            {
                chorusEnabled: true,
                chorusConfig: undefined,
                reverbImpulseResponse:  this.impulseResponse,
                reverbEnabled: true
            });
        this.synth.eventHandler.addEvent("soundfonterror", "manager-sf-error", e => {
            if(this.sfError)
            {
                this.sfError(e);
            }
        });

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

        this.renderer = new Renderer(this.channelColors, this.synth, canvas);
        this.renderer.render(true);

        window.addEventListener("resize", () => {
            canvas.width = window.innerWidth * window.devicePixelRatio;
            canvas.height = window.innerHeight * window.devicePixelRatio;
            this.renderer.computeColors()
        });

        // if on mobile, switch to a 5 octave keyboard

        if(isMobile)
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
        this.settingsUI = new SpessaSynthSettings(
            document.getElementById("settings_div"),
            this.synthUI,
            this.seqUI,
            this.renderer,
            this.keyboard,
            this.midHandler,
            this.playerUI,
            this.localeManager);

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
        await this.synth.isReady;

        // if on mobile, cap voices to 100
        if(isMobile)
        {
            this.synth.voiceCap = 100;
        }
    }

    /**
     * @param sf {ArrayBuffer}
     */
    async reloadSf(sf)
    {
        //this.soundFontMixer.soundFontChange(sf);
        await this.synth.reloadSoundFont(sf);
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
        this.renderer.connectSequencer(this.seq);

        // play the midi
        this.seq.play(true);
    }
}