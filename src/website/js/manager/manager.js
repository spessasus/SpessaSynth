import { MidiKeyboard } from "../midi_keyboard/midi_keyboard.js";
import { MIDIDeviceHandler, Sequencer, Synthetizer, WebMIDILinkHandler } from "spessasynth_lib";

import { Renderer } from "../renderer/renderer.js";

import { SequencerUI } from "../sequencer_ui/sequencer_ui.js";
import { SynthetizerUI } from "../synthesizer_ui/synthetizer_ui.js";
import { SpessaSynthSettings } from "../settings_ui/settings.js";
import { MusicModeUI } from "../music_mode_ui/music_mode_ui.js";
import { LocaleManager } from "../locale/locale_manager.js";
import { isMobile } from "../utils/is_mobile.js";
import { keybinds } from "../utils/keybinds.js";
import { _doExportAudioData, _exportAudioData } from "./export_audio.js";
import { exportMidi } from "./export_midi.js";
import { _exportSoundfont } from "./export_soundfont.js";
import { exportSong } from "./export_song.js";
import { _exportRMIDI } from "./export_rmidi.js";
import { closeNotification, showNotification } from "../notification/notification.js";
import { DropFileHandler } from "../utils/drop_file_handler.js";
import { _exportDLS } from "./export_dls.js";
import { BasicMIDI, IndexedByteArray, loadSoundFont, SpessaSynthCoreUtils as util } from "spessasynth_core";
import { prepareExtraBankUpload } from "./extra_bank_handling.js";


/**
 * @typedef MidFile {Object}
 * @property {ArrayBuffer} binary - the binary data of the file.
 * @property {string|undefined} altName - the alternative name for the file
 */

/**
 * @typedef {BasicMIDI|MidFile} MIDIFile
 */

// this enables transitions on the body because if we enable them during loading time, it flash-bangs us with white
document.body.classList.add("load");

/**
 * manager.js
 * purpose: connects every element of spessasynth
 */

const ENABLE_DEBUG = false;

class Manager
{
    channelColors = [
        "rgba(255, 99, 71, 1)",   // tomato
        "rgba(255, 165, 0, 1)",   // orange
        "rgba(255, 215, 0, 1)",   // gold
        "rgba(50, 205, 50, 1)",   // limegreen
        "rgba(60, 179, 113, 1)",  // mediumseagreen
        "rgba(0, 128, 0, 1)",     // green
        "rgba(0, 191, 255, 1)",   // deepskyblue
        "rgba(65, 105, 225, 1)",  // royalblue
        "rgba(138, 43, 226, 1)",  // blueviolet
        "rgba(50, 120, 125, 1)",  //'rgba(218, 112, 214, 1)', // percussion color
        "rgba(255, 0, 255, 1)",   // magenta
        "rgba(255, 20, 147, 1)",  // deeppink
        "rgba(218, 112, 214, 1)", // orchid
        "rgba(240, 128, 128, 1)", // lightcoral
        "rgba(255, 192, 203, 1)", // pink
        "rgba(255, 255, 0, 1)"    // yellow
    ];
    /**
     * @type {function(string)}
     */
    sfError;
    /**
     * @type {EncodeVorbisFunction}
     */
    compressionFunction = undefined;
    
    /**
     * Creates a new midi user interface.
     * @param context {AudioContext}
     * @param soundFontBuffer {ArrayBuffer}
     * @param locale {LocaleManager}
     * @param enableDebug {boolean}
     */
    constructor(context, soundFontBuffer, locale, enableDebug = ENABLE_DEBUG)
    {
        this.localeManager = locale;
        this.context = context;
        this.enableDebug = enableDebug;
        this.isExporting = false;
        
        let solve;
        this.ready = new Promise(resolve => solve = resolve);
        this.initializeContext(context, soundFontBuffer).then(() =>
        {
            solve();
        });
    }
    
    /**
     * @returns {EncodeVorbisFunction}
     */
    async getVorbisEncodeFunction()
    {
        if (this.compressionFunction !== undefined)
        {
            return this.compressionFunction;
        }
        this.compressionFunction = (await import("../../externals/libvorbis/encode_vorbis.js")).encodeVorbis;
        return this.compressionFunction;
    }
    
    saveBlob(blob, name)
    {
        const url = URL.createObjectURL(blob);
        /**
         * @type {HTMLAnchorElement}
         */
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        console.info(a);
    }
    
    /**
     * @param context {BaseAudioContext}
     * @param soundFont {ArrayBuffer}
     * @returns {Promise<void>}
     */
    async initializeContext(context, soundFont)
    {
        
        if (!context.audioWorklet)
        {
            alert("Audio worklet is not supported on your browser. Sorry!");
            throw new Error("Audio worklet is not supported");
        }
        
        // bind every element with translate-path to translation
        for (const element of document.querySelectorAll("*[translate-path]"))
        {
            this.localeManager.bindObjectProperty(element, "textContent", element.getAttribute("translate-path"));
        }
        
        // set the extra bank upload
        prepareExtraBankUpload.call(this);
        
        // same with title
        for (const element of document.querySelectorAll("*[translate-path-title]"))
        {
            this.localeManager.bindObjectProperty(
                element,
                "textContent",
                element.getAttribute("translate-path-title") + ".title"
            );
            this.localeManager.bindObjectProperty(
                element,
                "title",
                element.getAttribute("translate-path-title") + ".description"
            );
        }
        
        /**
         * set up soundfont
         * @type {ArrayBuffer}
         */
        this.soundFont = soundFont;
        
        
        if (this.enableDebug)
        {
            console.warn("DEBUG ENABLED! DEBUGGING ENABLED!!");
        }
        const WORKLET_PATH = "website/minified/worklet_processor.min.js";
        const prePath = window.isLocalEdition ? "../../" : "../../";
        this.workletPath = prePath + WORKLET_PATH;
        if (context.audioWorklet)
        {
            await context.audioWorklet.addModule(new URL(this.workletPath, import.meta.url));
        }
        
        this.audioDelay = new DelayNode(context, {
            delayTime: 0
        });
        this.audioDelay.connect(context.destination);
        
        // set up synthetizer
        this.synth = new Synthetizer(
            this.audioDelay,
            this.soundFont,
            undefined,
            undefined,
            {
                chorusEnabled: true,
                chorusConfig: undefined,
                reverbEnabled: true,
                audioNodeCreators: undefined
            }
        );
        this.synth.eventHandler.addEvent("soundfonterror", "manager-sf-error", e =>
        {
            if (this.sfError)
            {
                this.sfError(e.message);
            }
        });
        
        // set up midi access
        this.midHandler = new MIDIDeviceHandler();
        
        // set up web midi link
        new WebMIDILinkHandler(this.synth);
        
        // set up keyboard
        this.keyboard = new MidiKeyboard(this.channelColors, this.synth);
        
        /**
         * set up renderer
         * @type {HTMLCanvasElement}
         */
        const canvas = document.getElementById("note_canvas");
        
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        
        this.renderer = new Renderer(
            this.channelColors,
            this.synth,
            canvas,
            this.localeManager,
            window.SPESSASYNTH_VERSION
        );
        this.renderer.render(true);
        
        let titleSwappedWithSettings = false;
        const checkResize = () =>
        {
            this.renderer.updateSize();
            if (isMobile)
            {
                if (window.innerWidth / window.innerHeight > 1)
                {
                    if (!titleSwappedWithSettings)
                    {
                        const title = document.getElementById("title_wrapper");
                        const settings = document.getElementById("settings_div");
                        titleSwappedWithSettings = true;
                        title.parentElement.insertBefore(settings, title);
                    }
                }
                else if (titleSwappedWithSettings)
                {
                    const title = document.getElementById("title_wrapper");
                    const settings = document.getElementById("settings_div");
                    titleSwappedWithSettings = false;
                    title.parentElement.insertBefore(title, settings);
                }
                
            }
            this.renderer.render(false, true);
        };
        checkResize();
        window.addEventListener("resize", checkResize.bind(this));
        window.addEventListener("orientationchange", checkResize.bind(this));
        
        // if on mobile, switch to a 2 octave keyboard
        if (isMobile)
        {
            this.renderer.keyRange = { min: 48, max: 72 };
            this.keyboard.setKeyRange({ min: 48, max: 72 }, false);
        }
        
        // set up synth UI
        this.synthUI = new SynthetizerUI(
            this.channelColors,
            document.getElementById("synthetizer_controls"),
            this.localeManager
        );
        this.synthUI.connectSynth(this.synth);
        this.synthUI.connectKeyboard(this.keyboard);
        
        // create a UI for music player mode
        this.musicModeUI = new MusicModeUI(document.getElementById("player_info"), this.localeManager);
        
        // create a UI for sequencer
        this.seqUI = new SequencerUI(
            document.getElementById("sequencer_controls"),
            this.localeManager,
            this.musicModeUI,
            this.renderer
        );
        
        // set up settings UI
        this.settingsUI = new SpessaSynthSettings(
            document.getElementById("settings_div"),
            this.synthUI,
            this.seqUI,
            this.renderer,
            this.keyboard,
            this.midHandler,
            this.musicModeUI,
            this.localeManager,
            this.audioDelay
        );
        
        this.synthUI.onProgramChange = channel =>
        {
            // QoL: change the keyboard channel to the changed one when user changed it: adjust selector here
            this.keyboard.selectChannel(channel);
            this.settingsUI.htmlControls.keyboard.channelSelector.value = channel;
        };
        
        // set up drop file handler
        new DropFileHandler(async data =>
        {
            if (data.length === 0)
            {
                return;
            }
            await this.context.resume();
            this.play(data);
            let firstName = data[0].altName;
            if (firstName > 20)
            {
                firstName = firstName.substring(0, 21) + "...";
            }
            // set file name
            document.getElementById("file_upload").textContent = firstName;
            // show export button
            const exportButton = document.getElementById("export_button");
            exportButton.style.display = "flex";
            exportButton.onclick = this.exportSong.bind(this);
            // if demo website, hide demo songs button
            if (!window.isLocalEdition)
            {
                document.getElementById("demo_song").style.display = "none";
            }
        }, buf =>
        {
            this.reloadSf(buf);
        });
        
        // add key presses
        document.addEventListener("keydown", e =>
        {
            // check for control
            if (e.ctrlKey)
            {
                // do not interrupt control shortcuts
                return;
            }
            switch (e.key.toLowerCase())
            {
                case keybinds.videoMode:
                    if (this.seq)
                    {
                        this.seq.pause();
                    }
                    const videoSource = window.prompt(
                        "Video mode!\n Paste the link to the video source (leave blank to disable)\n" +
                        "Note: the video will be available in console as 'video'",
                        ""
                    );
                    if (videoSource === null)
                    {
                        return;
                    }
                    /**
                     * @type {HTMLVideoElement}
                     */
                    const video = document.createElement("video");
                    video.src = videoSource;
                    video.classList.add("secret_video");
                    canvas.parentElement.appendChild(video);
                    video.play();
                    window.video = video;
                    if (this.seq)
                    {
                        video.currentTime = parseFloat(window.prompt("Video offset to sync to midi, in seconds.", "0"));
                        video.play();
                        this.seq.currentTime = 0;
                    }
                    document.addEventListener("keydown", e =>
                    {
                        if (e.key === " ")
                        {
                            if (video.paused)
                            {
                                video.play();
                            }
                            else
                            {
                                video.pause();
                            }
                        }
                    });
                    
                    break;
                
                case keybinds.sustainPedal:
                    this.renderer.showHoldPedal = true;
                    this.renderer.render(false);
                    this.keyboard.setHoldPedal(true);
            }
        });
        
        document.addEventListener("keyup", e =>
        {
            // check for control
            if (e.ctrlKey)
            {
                // do not interrupt control shortcuts
                return;
            }
            switch (e.key.toLowerCase())
            {
                case keybinds.sustainPedal:
                    this.renderer.showHoldPedal = false;
                    this.renderer.render(false);
                    this.keyboard.setHoldPedal(false);
                    break;
                
                default:
                    break;
            }
        });
        
        await this.synth.isReady;
        
        this.renderer.render(false, true);
        // ANY TEST CODE FOR THE SYNTHESIZER GOES HERE
    }
    
    doDLSCheck()
    {
        if (window.isLocalEdition !== true)
        {
            const text = this.soundFont.slice(8, 12);
            const header = util.readBytesAsString(new IndexedByteArray(text), 4);
            if (header.toLowerCase() === "dls ")
            {
                showNotification(
                    this.localeManager.getLocaleString("locale.convertDls.title"),
                    [
                        {
                            type: "text",
                            textContent: this.localeManager.getLocaleString("locale.convertDls.message")
                        },
                        {
                            type: "button",
                            textContent: this.localeManager.getLocaleString("locale.yes"),
                            onClick: n =>
                            {
                                closeNotification(n.id);
                                this.downloadDesfont();
                            }
                        },
                        {
                            type: "button",
                            textContent: this.localeManager.getLocaleString("locale.no"),
                            onClick: n =>
                            {
                                closeNotification(n.id);
                            }
                        }
                    ],
                    99999999
                );
            }
        }
    }
    
    /**
     * @param sf {ArrayBuffer}
     */
    async reloadSf(sf)
    {
        await this.synth.soundfontManager.addNewSoundFont(sf, "main");
        this.soundFont = sf;
        setTimeout(() =>
        {
            this.doDLSCheck();
        }, 3000);
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
        
        if (this.seq)
        {
            this.seq.loadNewSongList(parsedMidi);
            this.seq.play(true);
            return;
        }
        
        // create a new sequencer
        this.seq = new Sequencer(parsedMidi, this.synth);
        
        this.seq.onError = e =>
        {
            console.error(e);
            document.getElementById("title").textContent = e.message;
        };
        
        // connect to the UI
        this.seqUI.connectSequencer(this.seq);
        
        // connect to the music mode ui
        this.musicModeUI.connectSequencer(this.seq);
        
        // connect to the renderer
        this.renderer.connectSequencer(this.seq);
        
        // connect to settings
        this.settingsUI.addSequencer(this.seq);
        
        // connect to synthui
        
        this.synthUI.connectSequencer(this.seq);
        
        // play the midi
        this.seq.play(true);
    }
    
    // noinspection JSUnusedGlobalSymbols
    async downloadDLSRMI()
    {
        const mid = await this.seq.getMIDI();
        const sf = loadSoundFont(this.soundFont);
        const out = mid.writeRMIDI(
            sf.writeDLS(),
            sf
        );
        const blob = new Blob([out.buffer], { type: "audio/rmid" });
        this.saveBlob(blob, `${mid.midiName}.rmi`);
    }
    
    downloadDesfont()
    {
        const soundfont = loadSoundFont(this.soundFont);
        const binary = soundfont.write();
        const blob = new Blob([binary.buffer], { type: "audio/soundfont" });
        this.saveBlob(blob, `${soundfont.soundFontInfo["INAM"]}.sf2`);
    }
}

Manager.prototype.exportSong = exportSong;
Manager.prototype._exportAudioData = _exportAudioData;
Manager.prototype._doExportAudioData = _doExportAudioData;
Manager.prototype.exportMidi = exportMidi;
Manager.prototype._exportSoundfont = _exportSoundfont;
Manager.prototype._exportDLS = _exportDLS;
Manager.prototype._exportRMIDI = _exportRMIDI;
export { Manager };