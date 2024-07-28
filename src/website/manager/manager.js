import { MidiKeyboard } from '../js/midi_keyboard/midi_keyboard.js'
import { Synthetizer } from '../../spessasynth_lib/synthetizer/synthetizer.js'
import { Renderer } from '../js/renderer/renderer.js'

import { SequencerUI } from '../js/sequencer_ui/sequencer_ui.js'
import { SynthetizerUI } from '../js/synthesizer_ui/synthetizer_ui.js'
import { MIDIDeviceHandler } from '../../spessasynth_lib/midi_handler/midi_handler.js'
import { WebMidiLinkHandler } from '../../spessasynth_lib/midi_handler/web_midi_link.js'
import { Sequencer } from '../../spessasynth_lib/sequencer/sequencer.js'
import { SpessaSynthSettings } from '../js/settings_ui/settings.js'
import { MusicModeUI } from '../js/music_mode_ui.js'
//import { SoundFontMixer } from './js/soundfont_mixer.js'
import { LocaleManager } from '../locale/locale_manager.js'
import { isMobile } from '../js/utils/is_mobile.js'
import { SpessaSynthInfo } from '../../spessasynth_lib/utils/loggin.js'
import { keybinds } from '../js/keybinds.js'
import { _doExportAudioData, _exportAudioData } from './export_audio.js'
import { exportMidi } from './export_midi.js'
import { _exportSoundfont } from './export_soundfont.js'
import { exportSong } from './export_song.js'
import { _exportRMIDI } from './export_rmidi.js'
import { WORKLET_URL } from '../../spessasynth_lib/synthetizer/worklet_url.js'

// this enables transitions on body because if we enable them on load, it flashbangs us with white
document.body.classList.add("load");

/**
* manager.js
* purpose: connects every element of spessasynth together
*/

class Manager
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
     * @param context {AudioContext}
     * @param soundFontBuffer {ArrayBuffer}
     * @param locale {LocaleManager}
     */
    constructor(context, soundFontBuffer, locale)
    {
        this.localeManager = locale;
        this.context = context;
        this.isExporting = false;
        let solve;
        this.ready = new Promise(resolve => solve = resolve);
        this.initializeContext(context, soundFontBuffer).then(() => {
            solve();
        });
    }

    saveBlob(blob, name)
    {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        SpessaSynthInfo(a);
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
    async initializeContext(context, soundFont)
    {

        if(!context.audioWorklet)
        {
            alert("Audio worklet is not supported on your browser. Sorry!")
            throw "Not supported."
        }

        // bind every element with translate-path to translation
        for(const element of document.querySelectorAll("*[translate-path]"))
        {
            this.localeManager.bindObjectProperty(element, "innerText", element.getAttribute("translate-path"));
        }

        // same with title
        for(const element of document.querySelectorAll("*[translate-path-title]"))
        {
            this.localeManager.bindObjectProperty(element, "innerText", element.getAttribute("translate-path-title") + ".title");
            this.localeManager.bindObjectProperty(element, "title", element.getAttribute("translate-path-title") + ".description");
        }

        if(context.audioWorklet)
        {
            await context.audioWorklet.addModule(WORKLET_URL);
        }
        // set up soundfont
        this.soundFont = soundFont;

        // set up buffer here (if we let spessasynth use the default buffer, there's no reverb for the first second.)
        const impulseURL = new URL("../../spessasynth_lib/synthetizer/audio_effects/impulse_response_2.flac", import.meta.url);
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
                reverbImpulseResponse: this.impulseResponse,
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

        let titleSwappedWithSettings = false;
        const checkResize = () => {
            canvas.width = window.innerWidth * window.devicePixelRatio;
            canvas.height = window.innerHeight * window.devicePixelRatio;
            this.renderer.computeColors();
            if(isMobile)
            {
                if(window.innerWidth / window.innerHeight > 1)
                {
                    if(!titleSwappedWithSettings)
                    {
                        const title = document.getElementById("title_wrapper");
                        const settings = document.getElementById("settings_div");
                        titleSwappedWithSettings = true;
                        title.parentElement.insertBefore(settings, title);
                    }
                }
                else if(titleSwappedWithSettings)
                {
                    const title = document.getElementById("title_wrapper");
                    const settings = document.getElementById("settings_div");
                    titleSwappedWithSettings = false;
                    title.parentElement.insertBefore(title, settings);
                }

            }
        }
        checkResize();
        window.addEventListener("resize", checkResize.bind(this));
        window.addEventListener("orientationchange", checkResize.bind(this))

        // if on mobile, switch to a 5 octave keyboard
        if(isMobile)
        {
            this.renderer.keyRange = {min: 36, max: 96};
            this.keyboard.setKeyRange({min: 36, max: 96}, false);
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
        document.addEventListener("keydown", e => {
            switch (e.key.toLowerCase()) {
                case keybinds.cinematicMode:
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

                case keybinds.videoMode:
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
                    document.addEventListener("keydown", e => {
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
    }

    /**
     * @param sf {ArrayBuffer}
     */
    async reloadSf(sf)
    {
        //this.soundFontMixer.soundFontChange(sf);
        await this.synth.reloadSoundFont(sf);
        this.soundFont = sf;
    }

    /**
     * starts playing and rendering the midi file
     * @param parsedMidi {MIDIFile[]}
     */
    play(parsedMidi)
    {
        if (!this.synth)
        {
            return;
        }

        // create a new sequencer
        this.seq = new Sequencer(parsedMidi, this.synth);

        this.seq.onError = e => {
            document.getElementById("title").textContent = e;
        }

        // connect to the UI
        this.seqUI.connectSequencer(this.seq);

        // connect to the Player UI
        this.playerUI.connectSequencer(this.seq);

        // connect to the renderer;
        this.renderer.connectSequencer(this.seq);

        // connect to settings
        this.settingsUI.addSequencer(this.seq);

        // play the midi
        this.seq.play(true);
    }
}
Manager.prototype.exportSong = exportSong;
Manager.prototype._exportAudioData = _exportAudioData;
Manager.prototype._doExportAudioData = _doExportAudioData;
Manager.prototype.exportMidi = exportMidi;
Manager.prototype._exportSoundfont = _exportSoundfont;
Manager.prototype._exportRMIDI = _exportRMIDI;
export { Manager }