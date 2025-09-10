import { MIDIKeyboard } from "../midi_keyboard/midi_keyboard.js";
import {
    Sequencer,
    WebMIDILinkHandler,
    WorkerSynthesizer,
    WorkletSynthesizer
} from "spessasynth_lib";

import { Renderer } from "../renderer/renderer.js";

import { SequencerUI } from "../sequencer_ui/sequencer_ui.js";
import { SynthetizerUI } from "../synthesizer_ui/synthetizer_ui.js";
import { SpessaSynthSettings } from "../settings_ui/settings.js";
import { MusicModeUI } from "../music_mode_ui/music_mode_ui.js";
import { LocaleManager } from "../locale/locale_manager.js";
import { isMobile } from "../utils/is_mobile.js";
import { keybinds } from "../utils/keybinds.js";
import { showAudioExportMenu } from "./export_audio/export_audio.js";
import { showExportMenu } from "./export_audio/export_song.js";
import {
    closeNotification,
    showNotification
} from "../notification/notification.js";
import { DropFileHandler, type MIDIFile } from "../utils/drop_file_handler.js";
import {
    IndexedByteArray,
    SpessaSynthCoreUtils as util
} from "spessasynth_core";
import { prepareExtraBankUpload } from "./extra_bank_handling.js";

import { EXTRA_BANK_ID, SOUND_BANK_ID } from "./bank_id.ts";
import type { Synthesizer } from "../utils/synthesizer.ts";

// This enables transitions on the body because if we enable them during loading time, it flash-bangs us with white
document.body.classList.add("load");

/**
 * Manager.js
 * purpose: connects every element of spessasynth
 */

const ENABLE_DEBUG = false;

export class Manager {
    public sfError?: (err: string) => unknown;
    public enableDebug;
    public readonly ready;
    public readonly localeManager;
    public readonly workerMode = "chrome" in window;
    public synth?: Synthesizer;
    public seq?: Sequencer;
    public readonly showExportMenu = showExportMenu.bind(this);
    public seqUI?: SequencerUI;
    public sBankBuffer: ArrayBuffer;
    protected isExporting;
    protected readonly showAudioExportMenu = showAudioExportMenu.bind(this);
    /**
     * Extra sound bank upload tracking (for rendering audio and file name)
     * @protected
     */
    protected extraBank?: {
        name: string;
        offset: number;
        buffer: ArrayBuffer;
    };
    private readonly channelColors = [
        "rgba(255, 99, 71, 1)", // Tomato
        "rgba(255, 165, 0, 1)", // Orange
        "rgba(255, 215, 0, 1)", // Gold
        "rgba(50, 205, 50, 1)", // Limegreen
        "rgba(60, 179, 113, 1)", // Mediumseagreen
        "rgba(0, 128, 0, 1)", // Green
        "rgba(0, 191, 255, 1)", // Deepskyblue
        "rgba(65, 105, 225, 1)", // Royalblue
        "rgba(138, 43, 226, 1)", // Blueviolet
        "rgba(50, 120, 125, 1)", //'rgba(218, 112, 214, 1)', // percussion color
        "rgba(255, 0, 255, 1)", // Magenta
        "rgba(255, 20, 147, 1)", // Deeppink
        "rgba(218, 112, 214, 1)", // Orchid
        "rgba(240, 128, 128, 1)", // Lightcoral
        "rgba(255, 192, 203, 1)", // Pink
        "rgba(255, 255, 0, 1)" // Yellow
    ];
    private keyboard?: MIDIKeyboard;
    private renderer?: Renderer;
    private synthUI?: SynthetizerUI;
    private musicModeUI?: MusicModeUI;
    private settingsUI?: SpessaSynthSettings;
    private readonly context;
    private readonly audioDelay;

    /**
     * Creates a new midi user interface.
     */
    public constructor(
        context: AudioContext,
        sfBuffer: ArrayBuffer,
        locale: LocaleManager,
        enableDebug = ENABLE_DEBUG
    ) {
        this.localeManager = locale;
        this.context = context;
        this.enableDebug = enableDebug;
        this.isExporting = false;
        this.sBankBuffer = sfBuffer;

        this.audioDelay = new DelayNode(context, {
            delayTime: 0
        });
        this.audioDelay.connect(context.destination);

        this.ready = new Promise<void>((resolve) => {
            void this.initializeContext(context, sfBuffer).then(() => {
                resolve();
            });
        });
    }

    protected get soundBankID() {
        if (this.extraBank) {
            return EXTRA_BANK_ID;
        }
        return SOUND_BANK_ID;
    }

    protected get isLocalEdition() {
        return "isLocalEdition" in window && window.isLocalEdition;
    }

    public getDLS() {
        showNotification(
            this.localeManager.getLocaleString("locale.convertDls.title"),
            [
                {
                    type: "text",
                    textContent: this.localeManager.getLocaleString(
                        "locale.convertDls.message"
                    )
                },
                {
                    type: "button",
                    textContent:
                        this.localeManager.getLocaleString("locale.yes"),
                    onClick: (n) => {
                        closeNotification(n.id);
                        void this.downloadDesfont();
                    }
                },
                {
                    type: "button",
                    textContent:
                        this.localeManager.getLocaleString("locale.no"),
                    onClick: (n) => {
                        closeNotification(n.id);
                    }
                }
            ],
            99999999
        );
    }

    public async reloadSf(sf: ArrayBuffer) {
        if (sf === this.sBankBuffer) {
            return;
        }
        this.seq?.pause();
        const text = sf.slice(8, 12);
        const header = util.readBytesAsString(new IndexedByteArray(text), 4);
        const isDLS = header.toLowerCase() === "dls " && !this.isLocalEdition;
        await this.setSF(sf);
        if (isDLS) {
            setTimeout(() => {
                this.getDLS();
            }, 3000);
        }

        // Resets controllers and resume
        if (this.seq?.midiData) {
            this.seq.currentTime -= 0.1;
            this.seqUI?.seqPlay();
        }
    }

    /**
     * Starts playing and rendering the midi file
     */
    public play(parsedMidi: MIDIFile[]) {
        if (!this.synth || !this.seq) {
            return;
        }

        this.seq.loadNewSongList(parsedMidi);
        this.seqUI?.seqPlay();
    }

    public async downloadDesfont() {
        if (this.synth instanceof WorkerSynthesizer) {
            const sf = await this.synth?.writeSF2();
            if (!sf) {
                return;
            }
            this.saveBlob(new Blob([sf.binary]), sf.fileName);
        }
    }

    public async exportMidi() {
        const mid = await this.seq!.getMIDI();
        const snapshot = await this.synth!.getSnapshot();
        mid.applySnapshot(snapshot);
        const written = mid.writeMIDI();
        this.saveBlob(
            new Blob([written], { type: "audio/midi" }),
            `${this.seqUI!.currentSongTitle || mid.fileName}.mid`
        );
    }

    protected saveBlob(blob: Blob, name: string) {
        const url = URL.createObjectURL(blob);
        this.saveUrl(url, name);
    }

    private async setSF(sf: ArrayBuffer) {
        if (!this.synth) {
            throw new Error("Unexpected lack of synth!");
        }
        this.sBankBuffer = sf;
        if (this.synth instanceof WorkletSynthesizer) {
            console.info("Copying array buffer for reuse...");
            const copy = sf.slice();
            console.info("Copy created, transferring to worklet...");
            await this.synth.soundBankManager.addSoundBank(copy, SOUND_BANK_ID);
        } else {
            console.info("Transferring to worker directly...");
            await this.synth.soundBankManager.addSoundBank(sf, SOUND_BANK_ID);
        }
        console.info("Sound bank reloaded succesfully.");
    }

    private saveUrl(url: string, name: string) {
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        console.info(a);
    }

    /**
     * Here are the two synths:
     * Worker is used on Chromium-based browsers to reduce memory usage and to work around the WebAudio bug.
     * Firefox suffers greatly from worker but works great on worklet so it uses worklet.
     * @param context
     * @private
     */
    private async initializeSynth(context: BaseAudioContext) {
        if (this.workerMode) {
            await WorkerSynthesizer.registerPlaybackWorklet(context);
            const worker = new Worker(new URL("worker.ts", import.meta.url), {
                type: "module"
            });

            const synth = new WorkerSynthesizer(
                context,
                worker.postMessage.bind(worker)
            );
            worker.onmessage = (e) =>
                synth.handleWorkerMessage(
                    e.data as Parameters<typeof synth.handleWorkerMessage>[0]
                );
            return synth;
        } else {
            await context.audioWorklet.addModule(
                "./spessasynth_processor.min.js"
            );
            return new WorkletSynthesizer(context);
        }
    }

    private async initializeContext(
        context: AudioContext,
        soundBank: ArrayBuffer
    ): Promise<void> {
        if (!context.audioWorklet) {
            alert("Audio worklet is not supported on your browser. Sorry!");
            throw new Error("Audio worklet is not supported");
        }

        // Bind every element with translate-path to translation
        for (const element of document.querySelectorAll("*[translate-path]")) {
            this.localeManager.bindObjectProperty(
                element,
                "textContent",
                element.getAttribute("translate-path") ?? ""
            );
        }

        // Ensure that the context is running
        if (context.state !== "running") {
            document.addEventListener("mousedown", () => {
                if (context.state !== "running") {
                    void context.resume();
                }
            });
        }

        // Set the extra bank upload
        prepareExtraBankUpload.call(this);

        // Same with title
        for (const e of document.querySelectorAll("*[translate-path-title]")) {
            const element = e as HTMLElement;
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

        if (this.enableDebug) {
            console.warn("DEBUG ENABLED! DEBUGGING ENABLED!!");
        }

        // Create synth
        const synth = await this.initializeSynth(context);
        this.synth = synth;

        synth.connect(this.audioDelay);
        await synth.isReady;
        await synth.reverbProcessor?.isReady;
        await this.setSF(soundBank);

        // Create seq
        this.seq = new Sequencer(synth);

        synth.eventHandler.addEvent(
            "soundBankError",
            "manager-sf-error",
            (e) => {
                if (this.sfError) {
                    this.sfError(e.message);
                }
            }
        );

        // Set up web midi link
        // noinspection JSCheckFunctionSignatures
        new WebMIDILinkHandler(this.synth);

        // Set up keyboard
        this.keyboard = new MIDIKeyboard(this.channelColors, this.synth);

        /**
         * Set up renderer
         */
        const canvas: HTMLCanvasElement = document.getElementById(
            "note_canvas"
        ) as HTMLCanvasElement;

        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;

        this.renderer = new Renderer(
            this.channelColors,
            this.synth,
            this.seq,
            this.audioDelay,
            canvas,
            this.localeManager,
            this.workerMode,
            window.SPESSASYNTH_VERSION
        );
        this.renderer.render(true);

        let titleSwappedWithSettings = false;
        const checkResize = () => {
            this?.renderer?.updateSize();
            if (isMobile) {
                if (window.innerWidth / window.innerHeight > 1) {
                    if (!titleSwappedWithSettings) {
                        const title = document.getElementById("title_wrapper")!;
                        const settings =
                            document.getElementById("settings_div")!;
                        titleSwappedWithSettings = true;
                        title.parentElement?.insertBefore(settings, title);
                    }
                } else if (titleSwappedWithSettings) {
                    const title = document.getElementById("title_wrapper")!;
                    const settings = document.getElementById("settings_div")!;
                    titleSwappedWithSettings = false;
                    title.parentElement?.insertBefore(title, settings);
                }
            }
            this.renderer?.render(false, true);
            const h = window.location.hostname;
            // Domain correction
            if (
                h !== "spessasus.github.io" &&
                h !== "localhost" &&
                h !== "127.0.0.1"
            ) {
                window.location.href =
                    "https://spessasus.github.io/SpessaSynth";
            }
        };
        checkResize();
        window.addEventListener("resize", checkResize.bind(this));
        window.addEventListener("orientationchange", checkResize.bind(this));

        // If on mobile, switch to a 2 octave keyboard
        if (isMobile) {
            this.renderer.keyRange = { min: 48, max: 72 };
            this.keyboard.setKeyRange({ min: 48, max: 72 }, false);
        }

        // Set up synth UI
        this.synthUI = new SynthetizerUI(
            this.channelColors,
            document.getElementById("synthetizer_controls")!,
            this.localeManager,
            this.keyboard,
            this.synth,
            this.seq
        );

        // Create a UI for music player mode
        this.musicModeUI = new MusicModeUI(
            document.getElementById("player_info")!,
            this.localeManager,
            this.seq
        );

        // Create a UI for sequencer
        this.seqUI = new SequencerUI(
            document.getElementById("sequencer_controls")!,
            this.localeManager,
            this.musicModeUI,
            this.renderer,
            this.synth,
            this.seq
        );

        // Set up settings UI
        this.settingsUI = new SpessaSynthSettings(
            document.getElementById("settings_div")!,
            this.synth,
            this.seq,
            this.synthUI,
            this.seqUI,
            this.renderer,
            this.keyboard,
            this.musicModeUI,
            this.localeManager,
            this.audioDelay
        );

        this.synthUI.onProgramChange = (channel) => {
            // QoL: change the keyboard channel to the changed one when user changed it: adjust selector here
            this.keyboard?.selectChannel(channel);

            this.settingsUI!.htmlControls.keyboard.channelSelector.value =
                channel.toString();
        };

        // Transpose should also preview in pause mode #182
        this.synthUI.onTranspose = () => {
            this.renderer?.render(false, true);
        };

        // Set up drop file handler
        new DropFileHandler(async (data) => {
            if (data.length === 0) {
                return;
            }
            await this.context.resume();
            this.play(data);
            let firstName = data[0].fileName;
            if (firstName.length > 20) {
                firstName = firstName.substring(0, 21) + "...";
            }
            // Set file name
            document.getElementById("file_upload")!.textContent = firstName;
            // Show export button
            const exportButton = document.getElementById("export_button")!;
            exportButton.style.display = "flex";
            exportButton.onclick = this.showExportMenu.bind(this);
            // If demo website, hide demo songs button
            if (this.isLocalEdition) {
                document.getElementById("demo_song")!.style.display = "none";
            }
        }, this.reloadSf.bind(this));

        // Add key presses
        document.addEventListener("keydown", (e) => {
            // Check for control
            if (e.ctrlKey) {
                // Do not interrupt control shortcuts
                return;
            }
            switch (e.key.toLowerCase()) {
                case keybinds.videoMode:
                    this.seqUI?.seqPause();
                    const videoSource = window.prompt(
                        "Video mode!\n Paste the link to the video source (leave blank to disable)\n" +
                            "Note: the video will be available in console as 'video'",
                        ""
                    );
                    if (videoSource === null) {
                        return;
                    }
                    const video = document.createElement("video");
                    video.src = videoSource;
                    video.classList.add("secret_video");
                    canvas.parentElement?.appendChild(video);
                    void video.play();
                    // @ts-expect-error Globally accessible
                    window.video = video;
                    if (this.seq) {
                        video.currentTime = parseFloat(
                            window.prompt(
                                "Video offset to sync to midi, in seconds.",
                                "0"
                            ) ?? "0"
                        );
                        void video.play();
                        this.seq.currentTime = 0;
                        this.seq.play();
                    }
                    document.addEventListener("keydown", (e) => {
                        if (e.key === " ") {
                            if (video.paused) {
                                void video.play();
                            } else {
                                video.pause();
                            }
                        }
                    });

                    break;

                case keybinds.sustainPedal:
                    this.renderer!.showHoldPedal = true;
                    this.renderer!.render(false);
                    this.keyboard!.setHoldPedal(true);
            }
        });

        document.addEventListener("keyup", (e) => {
            // Check for control
            if (e.ctrlKey) {
                // Do not interrupt control shortcuts
                return;
            }
            switch (e.key.toLowerCase()) {
                case keybinds.sustainPedal:
                    this.renderer!.showHoldPedal = false;
                    this.renderer!.render(false);
                    this.keyboard!.setHoldPedal(false);
                    break;

                default:
                    break;
            }
        });

        this.renderer.render(false, true);
        // This will resume the context on first user interaction
        void context.resume();
        // ANY TEST CODE FOR THE SYNTHESIZER GOES HERE
    }
}
