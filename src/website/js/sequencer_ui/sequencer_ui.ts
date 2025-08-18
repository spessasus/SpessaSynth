import { formatTime } from "../utils/other.js";
import { supportedEncodings } from "../utils/encodings.js";
import {
    getBackwardSvg,
    getForwardSvg,
    getLoopSvg,
    getPauseSvg,
    getPlaySvg,
    getShuffleSvg,
    getSpeedSvg,
    getTextSvg
} from "../utils/icons.js";
import { getSeqUIButton } from "./sequi_button.js";
import { keybinds } from "../utils/keybinds.js";
import { updateTitleAndMediaStatus } from "./title_and_media_status.js";
import { sanitizeKarLyrics, setLyricsText } from "./lyrics.js";
import { createSlider } from "../settings_ui/sliders.js";
import type { LocaleManager } from "../locale/locale_manager.ts";
import type { MusicModeUI } from "../music_mode_ui/music_mode_ui.ts";
import type { Renderer } from "../renderer/renderer.ts";
import {
    type MIDIMessage,
    type MIDIMessageType,
    midiMessageTypes,
    SpessaSynthCoreUtils,
    synthDisplayTypes
} from "spessasynth_core";
import type { Sequencer, WorkerSynthesizer } from "spessasynth_lib";
import { AssManager } from "../utils/ass_manager/ass_manager.ts";
import type { InterfaceMode } from "../../server/saved_settings.ts";

/**
 * Sequencer_ui.js
 * purpose: manages the GUI for the sequencer class, adding buttons for pause/play, lyrics, next, previous etc.
 */

const ICON_SIZE = 32;

const ICON_COLOR = "#ccc";
const ICON_DISABLED_COLOR = "#555";

const ICON_COLOR_L = "#333";
const ICON_DISABLED_COLOR_L = "#ddd";

const DEFAULT_ENCODING = "Shift_JIS";

// Zero width space
const ZWSP = "\u200b";

// Parser for turning MIDI status bytes into text
const reversedMIDITypes = new Map<MIDIMessageType, string>();
for (const key in midiMessageTypes) {
    reversedMIDITypes.set(
        midiMessageTypes[key as keyof typeof midiMessageTypes],
        key.replace(/([a-z])([A-Z])/g, "$1 $2")
    );
}

export class SequencerUI {
    public toggleLyrics: () => void;
    public currentSongTitle = "";
    public encoding = DEFAULT_ENCODING;
    protected wakeLock?: WakeLockSentinel;
    protected iconColor = ICON_COLOR;
    protected iconDisabledColor = ICON_DISABLED_COLOR;
    protected controls: HTMLElement;
    protected decoder = new TextDecoder(this.encoding);
    /**
     * The currently displayed (highlighted) lyrics event index.
     * -1 means no lyrics displayed (an event before the first lyric is "highlighted")
     */
    protected lyricsIndex = -1;
    protected requiresTextUpdate = false;
    protected lastTimeUpdate = 0;
    protected rawOtherTextEvents: MIDIMessage[] = [];
    protected mode: InterfaceMode = "dark";
    protected locale: LocaleManager;
    protected currentLyrics: MIDIMessage[] = [];
    /**
     * Current lyrics decoded as strings
     */
    protected currentLyricsString: string[] = [];
    protected musicModeUI: MusicModeUI;
    protected renderer: Renderer;
    protected synth: WorkerSynthesizer;
    protected seq: Sequencer;
    protected mainTitleMessageDisplay: HTMLElement;
    protected synthDisplayMode = {
        enabled: false,
        currentEncodedText: new Uint8Array(0)
    };
    protected requiresThemeUpdate = false;
    protected progressTime: HTMLParagraphElement;
    protected encodingSelector: HTMLSelectElement;
    protected lyricsElement: {
        mainDiv: HTMLDivElement;
        titleWrapper: HTMLDivElement;
        title: HTMLHeadingElement;
        text: {
            main: HTMLParagraphElement;
            other: HTMLDivElement;
            separateLyrics: HTMLSpanElement[];
            subtitleButton: HTMLLabelElement;
        };
        selector: HTMLSelectElement;
    };
    protected progressBarBackground: HTMLDivElement;
    protected progressBar: HTMLDivElement;
    protected playPause: HTMLDivElement;
    protected subtitleManager: AssManager;
    protected loopButton: HTMLDivElement;
    protected lyricsShown = false;
    protected readonly updateTitleAndMediaStatus =
        updateTitleAndMediaStatus.bind(this);
    protected readonly setLyricsText = setLyricsText.bind(this);

    /**
     * Creates a new User Interface for the given MidiSequencer
     * @param element the element to create sequi in
     * @param locale
     * @param musicMode
     * @param renderer
     * @param synth
     * @param seq
     */
    public constructor(
        element: HTMLElement,
        locale: LocaleManager,
        musicMode: MusicModeUI,
        renderer: Renderer,
        synth: WorkerSynthesizer,
        seq: Sequencer
    ) {
        this.controls = element;
        this.locale = locale;

        this.musicModeUI = musicMode;
        this.renderer = renderer;
        this.synth = synth;
        this.seq = seq;

        const m = document.getElementById("title");
        if (!m) {
            throw new Error("Unexpected lack of title message.");
        }
        this.mainTitleMessageDisplay = m;

        // Set up synth display event
        let displayTimeoutId: number | null = null;
        synth.eventHandler.addEvent(
            "synthDisplay",
            "sequi-synth-display",
            (data) => {
                if (
                    data.displayType === synthDisplayTypes.soundCanvasText ||
                    data.displayType === synthDisplayTypes.yamahaXGText
                ) {
                    // Clear styles and apply monospace
                    this.mainTitleMessageDisplay.classList.add("sysex_display");
                    this.mainTitleMessageDisplay.classList.remove(
                        "xg_sysex_display"
                    );
                    let textData = data.displayData as Uint8Array<ArrayBuffer>;
                    // Remove "Display Letters" byte before decoding for XG display
                    if (data.displayType === 1) {
                        textData = textData.slice(1);
                    }
                    // Decode the text
                    let text = this.decodeTextFix(textData.buffer);

                    // XG is type 1, apply some fixes to it.
                    // XG Displays have a special behavior, we try to mimic it here
                    // Reference video:
                    // https://www.youtube.com/watch?v=_mR7DV1E4KE
                    // First, extract the "Display Letters" byte
                    if (data.displayType === synthDisplayTypes.yamahaXGText) {
                        const displayLetters = data.displayData[0];
                        // XG Display Letters:
                        // The screen is monospace,
                        // Two rows, 16 characters each (max)
                        // Since this is XG data, apply the XG display style
                        this.mainTitleMessageDisplay.classList.add(
                            "xg_sysex_display"
                        );

                        // 0x0c where c are the number of spaces prepended
                        const spaces = displayLetters & 0x0f;
                        for (let i = 0; i < spaces; i++) {
                            text = " " + text;
                        }

                        // At 16 characters, add a newline
                        if (text.length >= 16) {
                            text = text.slice(0, 16) + "\n" + text.slice(16);
                        }

                        // If type is 0x1x, add a newline
                        if ((displayLetters & 0x10) > 1) {
                            text = "\n" + text;
                        }
                    }

                    if (text.trim().length === 0) {
                        // Set the text to invisible character to keep the height
                        this.mainTitleMessageDisplay.innerText = "‎ ";
                    } else {
                        // Set the display to an invisible character to keep the height
                        this.mainTitleMessageDisplay.innerText = text;
                    }

                    this.synthDisplayMode.enabled = true;
                    this.synthDisplayMode.currentEncodedText = textData;
                    if (displayTimeoutId !== null) {
                        window.clearTimeout(displayTimeoutId);
                    }
                    displayTimeoutId = window.setTimeout(() => {
                        this.synthDisplayMode.enabled = false;
                        this.restoreDisplay();
                    }, 5000);
                }
            }
        );

        // Create controls
        {
            // Time
            this.progressTime = document.createElement("p");
            this.progressTime.id = "note_time";
            // It'll always be on top
            this.progressTime.onclick = (event) => {
                event.preventDefault();
                const barPosition = progressBarBg.getBoundingClientRect();
                const x = event.clientX - barPosition.left;
                const width = barPosition.width;

                this.seq.currentTime = (x / width) * this.seq.duration;
            };

            // Create lyrics
            {
                // Main div
                const mainLyricsDiv = document.createElement("div");
                mainLyricsDiv.classList.add("lyrics");

                // Title wrapper
                const titleWrapper = document.createElement("div");
                titleWrapper.classList.add("lyrics_title_wrapper");
                mainLyricsDiv.append(titleWrapper);

                // Title
                const lyricsTitle = document.createElement("h2");
                this.locale.bindObjectProperty(
                    lyricsTitle,
                    "textContent",
                    "locale.sequencerController.lyrics.title"
                );
                lyricsTitle.classList.add("lyrics_title");
                titleWrapper.appendChild(lyricsTitle);

                // Encoding selector
                const encodingSelector = document.createElement("select");
                supportedEncodings.forEach((encoding) => {
                    const option = document.createElement("option");
                    option.innerText = encoding;
                    option.value = encoding;
                    encodingSelector.appendChild(option);
                });
                encodingSelector.value = this.encoding;
                encodingSelector.onchange = () =>
                    this.changeEncoding(encodingSelector.value);
                encodingSelector.classList.add("lyrics_selector");
                this.encodingSelector = encodingSelector;
                titleWrapper.appendChild(encodingSelector);

                // The actual text
                const text = document.createElement("p");
                text.classList.add("lyrics_text");
                mainLyricsDiv.appendChild(text);

                // Display for other texts
                const otherTextWrapper = document.createElement("details");
                const sum = document.createElement("summary");
                this.locale.bindObjectProperty(
                    sum,
                    "textContent",
                    "locale.sequencerController.lyrics.otherText.title"
                );
                otherTextWrapper.appendChild(sum);
                const otherText = document.createElement("div");
                otherText.innerText = "";
                otherTextWrapper.appendChild(otherText);
                mainLyricsDiv.appendChild(otherTextWrapper);

                // Subtitle upload
                const subtitleField = document.getElementsByClassName(
                    "ass_renderer_field"
                )[0] as HTMLDivElement;
                if (!subtitleField) {
                    throw new Error("Unexpected lack of subtitles!");
                }
                this.subtitleManager = new AssManager(
                    this.seq,
                    subtitleField,
                    this.renderer
                );
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".ass";
                input.id = "subtitle_upload";
                input.classList.add("hidden");
                mainLyricsDiv.appendChild(input);
                input.onchange = async () => {
                    if (input?.files?.[0] === undefined) {
                        return;
                    }
                    const file = input.files[0];
                    this.subtitleManager.loadASSSubtitles(await file.text());
                    this.subtitleManager.setVisibility(true);
                    this.toggleLyrics();
                };

                const subtitleUpload = document.createElement("label");
                subtitleUpload.htmlFor = "subtitle_upload";
                subtitleUpload.classList.add("general_button");
                this.locale.bindObjectProperty(
                    subtitleUpload,
                    "textContent",
                    "locale.sequencerController.lyrics.subtitles.title"
                );
                this.locale.bindObjectProperty(
                    subtitleUpload,
                    "title",
                    "locale.sequencerController.lyrics.subtitles.description"
                );
                mainLyricsDiv.appendChild(subtitleUpload);

                this.lyricsElement = {
                    text: {
                        main: text,
                        other: otherText,
                        subtitleButton: subtitleUpload,
                        separateLyrics: []
                    },
                    titleWrapper,
                    title: lyricsTitle,
                    mainDiv: mainLyricsDiv,
                    selector: encodingSelector
                };
                this.controls.appendChild(mainLyricsDiv);
                this.requiresTextUpdate = true;
            }

            // Background bar
            const progressBarBg = document.createElement("div");
            progressBarBg.id = "note_progress_background";
            this.progressBarBackground = progressBarBg;

            // Foreground bar
            this.progressBar = document.createElement("div");
            this.progressBar.id = "note_progress";

            // Control buttons
            const controlsDiv = document.createElement("div");
            controlsDiv.classList.add("control_buttons_wrapper");

            // Play pause
            const playPauseButton = getSeqUIButton(
                "Play/Pause",
                getPauseSvg(ICON_SIZE)
            );
            this.playPause = playPauseButton;
            this.locale.bindObjectProperty(
                playPauseButton,
                "title",
                "locale.sequencerController.playPause"
            );
            const togglePlayback = () => {
                if (this.seq.paused) {
                    this.seqPlay();
                } else {
                    this.seqPause();
                }
            };
            playPauseButton.onclick = togglePlayback;

            // Previous song button
            const previousSongButton = getSeqUIButton(
                "Previous song",
                getBackwardSvg(ICON_SIZE)
            );
            this.locale.bindObjectProperty(
                previousSongButton,
                "title",
                "locale.sequencerController.previousSong"
            );
            previousSongButton.onclick = () => this.switchToPreviousSong();

            // Next song button
            const nextSongButton = getSeqUIButton(
                "Next song",
                getForwardSvg(ICON_SIZE)
            );
            this.locale.bindObjectProperty(
                nextSongButton,
                "title",
                "locale.sequencerController.nextSong"
            );
            nextSongButton.onclick = () => this.switchToNextSong();

            // Loop button
            const loopButton = getSeqUIButton(
                "Loop this",
                getLoopSvg(ICON_SIZE)
            );
            this.locale.bindObjectProperty(
                loopButton,
                "title",
                "locale.sequencerController.loopThis"
            );
            const toggleLoop = () => {
                if (this.seq.loopCount > 0) {
                    this.seq.loopCount = 0;
                    this.disableIcon(loopButton);
                } else {
                    this.seq.loopCount = Infinity;
                    this.enableIcon(loopButton);
                }
            };
            loopButton.onclick = toggleLoop;
            this.loopButton = loopButton;

            // Shuffle button
            const shuffleButton = getSeqUIButton(
                "Shuffle songs",
                getShuffleSvg(ICON_SIZE)
            );
            this.locale.bindObjectProperty(
                shuffleButton,
                "title",
                "locale.sequencerController.shuffle"
            );
            shuffleButton.onclick = () => {
                this.seq.shuffleSongs = !this.seq.shuffleSongs;
                if (this.seq.shuffleSongs) {
                    this.enableIcon(shuffleButton);
                } else {
                    this.disableIcon(shuffleButton);
                }
            };
            this.disableIcon(shuffleButton);

            // Playback rate button
            const playbackRateButton = getSeqUIButton(
                "Playback speed",
                getSpeedSvg(ICON_SIZE)
            );
            this.locale.bindObjectProperty(
                playbackRateButton,
                "title",
                "locale.sequencerController.playbackRate"
            );

            const input = document.createElement("input");
            input.type = "number";
            input.id = "playback_rate_slider";
            const minSlider = 1;
            const maxSlider = 60;
            input.min = minSlider.toString();
            input.max = maxSlider.toString();
            input.value = "20"; // Note about these: 100% and below are incremented by five,
            // While above 100 is incremented by 10
            const playbackRateSlider = createSlider(input, true);
            const playbackRateSliderWrapper = document.createElement("div");
            playbackRateSliderWrapper.classList.add(
                "playback_rate_slider_wrapper"
            );
            playbackRateSliderWrapper.appendChild(playbackRateSlider);
            const actualInput = playbackRateSlider.firstElementChild
                ?.lastElementChild as HTMLInputElement;
            const displaySpan =
                playbackRateSlider.lastElementChild as HTMLSpanElement;
            if (!actualInput) {
                throw new Error("Unexpected lack of elements!");
            }
            if (!displaySpan) {
                throw new Error("Unexpected lack of elements!");
            }
            displaySpan.contentEditable = "true";
            displaySpan.textContent = `${this.seq.playbackRate * 100}%`;
            actualInput.oninput = () => {
                const value = parseInt(actualInput.value);
                const playbackPercent =
                    value > 20 ? (value - 20) * 10 + 100 : value * 5;
                this.seq.playbackRate = playbackPercent / 100;
                displaySpan.textContent = `${Math.round(playbackPercent)}%`;
            };
            displaySpan.onkeydown = (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            };
            displaySpan.oninput = (e) => {
                e.stopImmediatePropagation();
                const num = parseInt(displaySpan.textContent);

                let percent = isNaN(num) ? 100 : num;
                if (percent < 1) {
                    percent = 100;
                }
                this.seq.playbackRate = percent / 100;

                // Get the value that the input would have
                const inputValue = Math.max(
                    minSlider,
                    Math.min(
                        maxSlider,
                        percent > 100 ? (percent - 100) / 10 + 20 : percent / 5
                    )
                );
                actualInput.value = inputValue.toString();

                const wrapper = playbackRateSlider.querySelector(
                    ".settings_visual_wrapper"
                )!;
                (wrapper as HTMLElement).style.setProperty(
                    "--visual-width",
                    `${((inputValue - minSlider) / (maxSlider - minSlider)) * 100}%`
                );
            };
            displaySpan.onblur = () => {
                displaySpan.textContent = `${Math.round(this.seq.playbackRate * 100)}%`;
            };
            playbackRateSliderWrapper.classList.add("hidden");
            let sliderShown = false;
            playbackRateButton.onclick = () => {
                sliderShown = !sliderShown;
                playbackRateSliderWrapper.classList.toggle("hidden");
                if (sliderShown) {
                    this.enableIcon(playbackRateButton);
                } else {
                    this.disableIcon(playbackRateButton);
                }
            };
            this.disableIcon(playbackRateButton);

            // Show text button
            const textButton = getSeqUIButton(
                "Show lyrics",
                getTextSvg(ICON_SIZE)
            );
            this.locale.bindObjectProperty(
                textButton,
                "title",
                "locale.sequencerController.lyrics.show"
            );
            this.disableIcon(textButton);
            const toggleLyrics = () => {
                this.lyricsElement.mainDiv.classList.toggle("lyrics_show");
                this.lyricsShown = !this.lyricsShown;
                if (this.lyricsShown) {
                    this.enableIcon(textButton);
                } else {
                    this.disableIcon(textButton);
                }
            };
            this.toggleLyrics = toggleLyrics;
            textButton.onclick = toggleLyrics;

            // Add everything
            controlsDiv.appendChild(previousSongButton); // |<
            controlsDiv.appendChild(loopButton); // ()
            controlsDiv.appendChild(shuffleButton); // ><
            controlsDiv.appendChild(playPauseButton); // ||
            controlsDiv.appendChild(textButton); // ==
            controlsDiv.appendChild(playbackRateButton); // >>
            controlsDiv.appendChild(nextSongButton); // >|

            this.controls.appendChild(progressBarBg);
            progressBarBg.appendChild(this.progressBar);
            this.controls.appendChild(this.progressTime);
            this.controls.appendChild(playbackRateSliderWrapper);
            this.controls.appendChild(controlsDiv);

            // Keyboard control
            document.addEventListener("keydown", (e) => {
                switch (e.key.toLowerCase()) {
                    case keybinds.playPause:
                        e.preventDefault();
                        togglePlayback();
                        break;

                    case keybinds.toggleLoop:
                        e.preventDefault();
                        toggleLoop();
                        break;

                    case keybinds.toggleLyrics:
                        e.preventDefault();
                        toggleLyrics();
                        break;

                    case keybinds.seekBackwards:
                        e.preventDefault();
                        this.seq.currentTime -= 5;
                        playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                        break;

                    case keybinds.seekForwards:
                        e.preventDefault();
                        this.seq.currentTime += 5;
                        playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                        break;

                    case keybinds.previousSong:
                        this.switchToPreviousSong();
                        break;

                    case keybinds.nextSong:
                        this.switchToNextSong();
                        break;

                    default:
                        if (!isNaN(parseFloat(e.key))) {
                            e.preventDefault();
                            const num = parseInt(e.key);
                            if (0 <= num && num <= 9) {
                                this.seq.currentTime =
                                    this.seq.duration * (num / 10);
                                playPauseButton.innerHTML =
                                    getPauseSvg(ICON_SIZE);
                            }
                        }
                        break;
                }
            });
        }

        this.seq.eventHandler.addEvent("textEvent", "sequi-text-event", (e) => {
            if (e.lyricsIndex >= 0) {
                this.setLyricsText(e.lyricsIndex);
                return;
            }
            this.rawOtherTextEvents.push(e.event);
            this.requiresTextUpdate = true;
        });

        this.seq.eventHandler.addEvent(
            "timeChange",
            "sequi-time-change",
            () => {
                this.lyricsIndex = -1;
                this.updateTitleAndMediaStatus();
            }
        );

        this.seq.eventHandler.addEvent("songEnded", "sequi-song-ended", () => {
            this.seqPause(false);
        });

        this.seq.eventHandler.addEvent(
            "songChange",
            "sequi-song-change",
            (data) => {
                this.synthDisplayMode.enabled = false;
                this.lyricsIndex = -1;
                this.updateTitleAndMediaStatus();
                // Disable loop if more than 1 song
                if (this.seq.songsAmount > 1) {
                    this.seq.loopCount = 0;
                    this.disableIcon(this.loopButton);
                } else {
                    this.seq.loopCount = Infinity;
                    this.enableIcon(this.loopButton);
                }
                this.restoreDisplay();

                let midiEncoding = data.getRMIDInfo("midiEncoding");
                if (typeof data.embeddedSoundBankSize !== "undefined") {
                    // RMID defaults to utf-8
                    midiEncoding = "utf-8";
                }
                if (midiEncoding) {
                    this.changeEncoding(midiEncoding);
                    SpessaSynthCoreUtils.SpessaSynthInfo(
                        `Changing encoding via MENC to ${midiEncoding}`
                    );
                }
            }
        );

        if (this.requiresThemeUpdate) {
            if (this.mode === "light") {
                // Change to dark and then switch
                this.mode = "dark";
                this.toggleDarkMode();
            }
            // Otherwise, we're already dark
        }

        // Hide for now
        this.controls.style.display = "none";
        this.setSliderInterval();
    }

    public toggleDarkMode() {
        if (this.mode === "dark") {
            this.mode = "light";
            this.iconColor = ICON_COLOR_L;
            this.iconDisabledColor = ICON_DISABLED_COLOR_L;
        } else {
            this.mode = "dark";
            this.iconColor = ICON_COLOR;
            this.iconDisabledColor = ICON_DISABLED_COLOR;
        }
        if (!this.seq.midiData) {
            this.requiresThemeUpdate = true;
            return;
        }
        this.progressBar.classList.toggle("note_progress_light");
        this.progressBarBackground.classList.toggle(
            "note_progress_background_light"
        );
        this.lyricsElement.mainDiv.classList.toggle("lyrics_light");
        this.lyricsElement.titleWrapper.classList.toggle("lyrics_light");
        this.lyricsElement.selector.classList.toggle("lyrics_light");
    }

    public seqPlay() {
        this.seq.play();
        this.setWakeLock();
        this.playPause.innerHTML = getPauseSvg(ICON_SIZE);

        // Show and start
        this.controls.style.display = "block";
        this.updateTitleAndMediaStatus();
    }

    public seqPause(sendPause = true) {
        if (sendPause) {
            this.seq.pause();
        }
        this.releaseWakeLock();
        this.playPause.innerHTML = getPlaySvg(ICON_SIZE);
    }

    public switchToNextSong() {
        this.seq.songIndex++;
        this.updateTitleAndMediaStatus();
    }

    public switchToPreviousSong() {
        this.seq.songIndex--;
        this.updateTitleAndMediaStatus();
    }

    public releaseWakeLock() {
        if (this.wakeLock) {
            void this.wakeLock.release().then(() => {
                this.wakeLock = undefined;
            });
        }
    }

    protected updateOtherTextEvents() {
        let text = "";
        for (const raw of this.rawOtherTextEvents) {
            text += `<span><pre>${reversedMIDITypes.get(raw.statusByte)}:</pre> <i>${this.decodeTextFix(raw.data.buffer)}</i></span><br>`;
        }
        this.lyricsElement.text.other.innerHTML = text;
    }

    protected setWakeLock() {
        try {
            void navigator.wakeLock.request("screen").then((r) => {
                this.wakeLock = r;
            });
        } catch (e) {
            console.warn(`Could not get wakelock:`, e);
        }
    }

    protected decodeTextFix(text: ArrayBufferLike) {
        let encodingIndex = 0;
        while (true) {
            try {
                return this.decoder.decode(text);
            } catch (e) {
                encodingIndex++;
                this.changeEncoding(supportedEncodings[encodingIndex]);
                this.encodingSelector.value = supportedEncodings[encodingIndex];
                console.warn(`Failed to decode: ${e as string}`);
            }
        }
    }

    /**
     * Restores the display to the current song title and removes the SysEx display styles
     */
    protected restoreDisplay() {
        let textToShow = this.currentSongTitle;
        if (!this.seq.midiData) {
            // Set to default title
            textToShow = this.locale.getLocaleString("locale.titleMessage");
        }
        this.mainTitleMessageDisplay.innerText = textToShow;
        this.mainTitleMessageDisplay.classList.remove("sysex_display");
        this.mainTitleMessageDisplay.classList.remove("xg_sysex_display");
    }

    protected changeEncoding(encoding: string) {
        this.encoding = encoding;
        this.decoder = new TextDecoder(encoding);
        this.updateOtherTextEvents();
        this.decodeLyricData();
        // Update all spans with the new encoding
        this.lyricsElement.text.separateLyrics.forEach((span, index) => {
            if (this.currentLyricsString[index] === undefined) {
                return;
            }
            span.innerText = this.currentLyricsString[index];
        });
        this.lyricsElement.selector.value = encoding;
        this.updateTitleAndMediaStatus(false);
        this.setLyricsText(this.lyricsIndex);
    }

    protected _updateInterval() {
        const seqTime = this.seq.currentTime;
        if (this.lastTimeUpdate === seqTime) {
            return;
        }
        this.lastTimeUpdate = seqTime;
        if (this.seq.hasDummyData) {
            this.progressBar.style.width = "0%";
            this.progressTime.innerText = "--:-- / --:--";
        } else {
            this.progressBar.style.width = `${(seqTime / this.seq.duration) * 100}%`;
            const time = formatTime(seqTime);
            const total = formatTime(this.seq.duration);
            this.progressTime.innerText = `${time.time} / ${total.time}`;
        }
        if (this.requiresTextUpdate) {
            this.updateOtherTextEvents();
            this.requiresTextUpdate = false;
        }
    }

    protected setSliderInterval() {
        setInterval(this._updateInterval.bind(this), 100);
    }

    protected decodeLyricData() {
        this.currentLyricsString = this.currentLyrics.map((l) => {
            const b = sanitizeKarLyrics(l.data);
            return this.decodeTextFix(b.buffer);
        });
        if (this.currentLyrics.length === 0) {
            this.currentLyricsString = [
                this.locale.getLocaleString(
                    "locale.sequencerController.lyrics.noLyrics"
                )
            ];
        } else {
            if (this.currentLyricsString.length > 2) {
                // Perform a check for double lyrics:
                // For example in some midi's, every lyric event is duplicated:
                // "He's " turns into two "He's " and another "He's " event
                // If that's the case for all events in the current lyrics, set duplicates to "" to avoid index errors
                let isDoubleLyrics = true;
                // Note: the first lyrics is usually a control character
                for (
                    let i = 1;
                    i < this.currentLyricsString.length - 1;
                    i += 2
                ) {
                    const first = this.currentLyricsString[i];
                    const second = this.currentLyricsString[i + 1];
                    // Note: newline should be skipped
                    if (first.trim() === "" || second.trim() === "") {
                        i -= 1;
                        continue;
                    }
                    if (first.trim() !== second.trim()) {
                        isDoubleLyrics = false;
                        break;
                    }
                }
                if (isDoubleLyrics) {
                    for (
                        let i = 0;
                        i < this.currentLyricsString.length;
                        i += 2
                    ) {
                        // Note: newline should be skipped
                        if (this.currentLyricsString[i] === "\n") {
                            i -= 1;
                            continue;
                        }
                        this.currentLyricsString[i] = "";
                    }
                }
            }
            // Perform a lilypond fix
            // See https://github.com/spessasus/SpessaSynth/issues/141
            const containsZWSP = this.currentLyricsString.some((s) =>
                s.includes(ZWSP)
            );
            if (containsZWSP) {
                for (let i = 0; i < this.currentLyricsString.length; i++) {
                    let string = this.currentLyricsString[i];
                    if (string.startsWith(ZWSP)) {
                        // When adding ZWSP in front of a word: consider it as the start of a newline
                        string = " \n" + string.substring(1);
                    }
                    if (string.endsWith(ZWSP)) {
                        // When appending a ZWSP at the end of a word, consider it as a syllable
                        // Remove ZWSP
                        string = string.substring(0, string.length - 1);
                    } else {
                        // Otherwise it's a word. Add a space
                        string = string + " ";
                    }
                    this.currentLyricsString[i] = string;
                }
            }
        }
        // Lyrics fix:
        // Sometimes, all lyrics events lack spaces at the start or end of the lyric
        // Then, and only then, add space at the end of each lyric
        // Space ASCII is 32
        let lacksSpaces = true;
        for (const lyric of this.currentLyricsString) {
            if (lyric.startsWith(" ") || lyric.endsWith(" ")) {
                lacksSpaces = false;
                break;
            }
        }

        if (lacksSpaces) {
            this.currentLyricsString = this.currentLyricsString.map((lyric) => {
                // One exception: hyphens at the end. Don't add a space to them
                if (lyric.endsWith("-")) {
                    return lyric;
                }
                return lyric + " ";
            });
        }
        // Sanitize lyrics, as in replacement "/" with newline
        this.currentLyricsString = this.currentLyricsString.map((l) =>
            l.replace("/", "\n")
        );
    }

    protected loadLyricData() {
        if (!this.seq.midiData) {
            return;
        }
        // Load lyrics
        this.currentLyrics = this.seq.midiData.lyrics;
        this.decodeLyricData();
        // Create lyrics as separate spans
        // Clear previous lyrics
        this.lyricsElement.text.main.innerHTML = "";
        this.lyricsElement.text.separateLyrics = [];
        for (const lyric of this.currentLyricsString) {
            const span = document.createElement("span");
            span.innerText = lyric;
            // Gray (not highlighted) text
            span.classList.add("lyrics_text_gray");
            this.lyricsElement.text.main.appendChild(span);
            this.lyricsElement.text.separateLyrics.push(span);
        }
    }

    protected enableIcon(icon: HTMLElement) {
        icon.firstElementChild!.setAttribute("fill", this.iconColor);
        if (icon.firstElementChild!.getAttribute("stroke")) {
            icon.firstElementChild!.setAttribute("stroke", this.iconColor);
        }
    }

    protected disableIcon(icon: HTMLElement) {
        icon.firstElementChild?.setAttribute("fill", this.iconDisabledColor);
        if (icon.firstElementChild!.getAttribute("stroke")) {
            icon.firstElementChild!.setAttribute(
                "stroke",
                this.iconDisabledColor
            );
        }
    }
}
