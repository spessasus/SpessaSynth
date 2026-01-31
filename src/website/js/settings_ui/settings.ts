import { settingsHtml } from "./settings_html.js";
import { getDownArrowSvg, getGearSvg } from "../utils/icons.js";
import { _loadSettings } from "./saving/load_settings.js";
import { _saveSettings } from "./saving/save_settings.js";
import { _serializeSettings } from "./saving/serialize_settings.js";
import {
    _changeLayout,
    _createInterfaceSettingsHandler
} from "./handlers/interface_handler.js";
import { _toggleDarkMode } from "./handlers/toggle_dark_mode.js";
import {
    _createRendererHandler,
    _setRendererMode
} from "./handlers/renderer_handler.js";
import {
    _createMidiInputHandler,
    _createMidiOutputHandler,
    _createMidiSettingsHandler
} from "./handlers/midi_handler.js";
import { _createKeyboardHandler } from "./handlers/keyboard_handler.js";
import { localeList } from "../locale/locale_files/locale_list.js";
import { keybinds } from "../utils/keybinds.js";
import { handleSliders } from "./sliders.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { Renderer, rendererModes } from "../renderer/renderer.js";
import { type Sequencer } from "spessasynth_lib";
import type { SynthetizerUI } from "../synthesizer_ui/synthetizer_ui.ts";
import type { SequencerUI } from "../sequencer_ui/sequencer_ui.ts";
import type { MIDIKeyboard } from "../midi_keyboard/midi_keyboard.ts";
import type { MusicModeUI } from "../music_mode_ui/music_mode_ui.ts";
import type { LocaleManager } from "../locale/locale_manager.ts";
import type { InterfaceMode } from "../../server/saved_settings.ts";
import type { Synthesizer } from "../utils/synthesizer.ts";

const TRANSITION_TIME = 0.2;

// These delays sync with the AnalyserNode delay
// Tested on firefox
const niceDelayLookupTable = {
    2048: 0.05,
    4096: 0.27,
    8192: 0.34,
    16_384: 0.371_519_274_376_417_24,
    32_768: 0.48
};

/**
 * Settings.js
 * purpose: manages the gui settings, controlling things like render settings, light mode, etc.
 */

export class SpessaSynthSettings {
    public readonly htmlControls;
    protected readonly delay: DelayNode;
    protected readonly renderer: Renderer;
    protected readonly synth: Synthesizer;
    protected readonly seq: Sequencer;
    protected readonly midiKeyboard: MIDIKeyboard;
    protected readonly synthui: SynthetizerUI;
    protected readonly sequi: SequencerUI;
    protected readonly locale: LocaleManager;
    protected readonly musicMode: MusicModeUI;
    protected readonly locales = localeList;
    protected readonly keyboardSizes = {
        full: { min: 0, max: 127 },
        piano: { min: 21, max: 108 },
        "5 octaves": { min: 36, max: 96 },
        "two octaves": { min: 53, max: 77 }
    };
    protected mode: InterfaceMode = "dark";
    protected autoKeyRange = false;
    protected readonly mainDiv;
    protected visible = false;
    protected animationId = -1;
    protected hideOnDocClick = true;
    protected topPartVisible = true;
    protected toggleDarkMode = _toggleDarkMode.bind(this);
    protected createInterfaceSettingsHandler =
        _createInterfaceSettingsHandler.bind(this);
    protected changeLayout = _changeLayout.bind(this);
    protected createRendererHandler = _createRendererHandler.bind(this);
    protected setRendererMode = _setRendererMode.bind(this);
    protected createMidiSettingsHandler = _createMidiSettingsHandler.bind(this);
    protected createMIDIInputHandler = _createMidiInputHandler.bind(this);
    protected createMIDIOutputHandler = _createMidiOutputHandler.bind(this);
    protected createKeyboardHandler = _createKeyboardHandler.bind(this);
    protected loadSettings = _loadSettings.bind(this);
    protected serializeSettings = _serializeSettings.bind(this);
    protected saveSettings = _saveSettings.bind(this);

    /**
     * Creates a new instance of CustomSynth UI
     * @param settingsWrapper the element to create the settings in
     * @param synth
     * @param seq
     * @param sythui
     * @param sequi
     * @param renderer
     * @param midiKeyboard
     * @param playerInfo
     * @param localeManager
     * @param delayNode
     */
    public constructor(
        settingsWrapper: HTMLElement,
        synth: Synthesizer,
        seq: Sequencer,
        sythui: SynthetizerUI,
        sequi: SequencerUI,
        renderer: Renderer,
        midiKeyboard: MIDIKeyboard,
        playerInfo: MusicModeUI,
        localeManager: LocaleManager,
        delayNode: DelayNode
    ) {
        this.delay = delayNode;
        this.mode = "dark";

        this.synth = synth;
        this.seq = seq;
        this.renderer = renderer;
        this.midiKeyboard = midiKeyboard;
        this.synthui = sythui;
        this.sequi = sequi;
        this.locale = localeManager;
        this.musicMode = playerInfo;

        const settingsButton: HTMLElement = document.createElement("div");
        settingsButton.style.position = "relative";
        settingsButton.classList.add("seamless_button", "settings_button");
        settingsWrapper.append(settingsButton);

        const musicModeButton = document.createElement("div");
        musicModeButton.classList.add("seamless_button");
        this.locale.bindObjectProperty(
            musicModeButton,
            "innerText",
            "locale.musicPlayerMode.toggleButton.title"
        );
        this.locale.bindObjectProperty(
            musicModeButton,
            "title",
            "locale.musicPlayerMode.toggleButton.description"
        );
        settingsWrapper.append(musicModeButton);

        const hideTopButton = document.createElement("div");
        hideTopButton.classList.add("seamless_button");
        this.locale.bindObjectProperty(
            hideTopButton,
            "innerText",
            "locale.hideTopBar.title"
        );
        this.locale.bindObjectProperty(
            hideTopButton,
            "title",
            "locale.hideTopBar.description"
        );
        settingsWrapper.append(hideTopButton);

        // Add svg to show top button
        const showTopButton = document.querySelectorAll(".show_top_button")[0];
        showTopButton.innerHTML = getDownArrowSvg(20);

        const text = document.createElement("span");
        this.locale.bindObjectProperty(
            text,
            "innerText",
            "locale.settings.toggleButton"
        );
        settingsButton.append(text);

        const gear = document.createElement("div");
        gear.innerHTML = getGearSvg(24);
        gear.classList.add("gear");
        settingsButton.append(gear);

        this.mainDiv = document.createElement("div");
        this.mainDiv.classList.add("settings_menu");
        settingsButton.addEventListener("click", () =>
            this.setVisibility(!this.visible)
        );
        settingsWrapper.append(this.mainDiv);

        musicModeButton.addEventListener(
            "click",
            this.toggleMusicPlayerMode.bind(this)
        );

        hideTopButton.addEventListener("click", this.hideTopPart.bind(this));

        // Stop propagation to disable hide on click outside
        this.mainDiv.addEventListener("click", () => {
            this.hideOnDocClick = false;
        });

        // Hide if clicked outside
        document.addEventListener("click", () => {
            if (!this.hideOnDocClick) {
                this.hideOnDocClick = true;
                return;
            }
            this.setVisibility(false);
        });

        // Load the HTML
        this.mainDiv.innerHTML = settingsHtml;

        // Load input type range
        handleSliders(this.mainDiv);

        // Bind all translations to the HTML
        for (const element of this.mainDiv.querySelectorAll(
            "*[translate-path]"
        )) {
            // Translate-path apply innerText directly
            this.locale.bindObjectProperty(
                element,
                "textContent",
                element.getAttribute("translate-path") ?? ""
            );
        }
        for (const e of this.mainDiv.querySelectorAll(
            "*[translate-path-title]"
        )) {
            const element = e as HTMLElement;
            const path = element.getAttribute("translate-path-title");
            // Translate-path-title: apply to both innerText and title, by adding .title and .description respectively
            this.locale.bindObjectProperty(
                element,
                "textContent",
                path + ".title"
            );
            this.locale.bindObjectProperty(
                element,
                "title",
                path + ".description"
            );

            // For labels, also apply the "title" to elements that the label is for
            if (element.tagName === "LABEL") {
                const forId = element.getAttribute("for");
                if (forId) {
                    const forElement = document.querySelector<HTMLElement>(
                        "#" + forId
                    );
                    if (forElement) {
                        this.locale.bindObjectProperty(
                            forElement,
                            "title",
                            path + ".description"
                        );
                    }
                }
            }
        }

        // Key bind is "R"
        document.addEventListener("keydown", (e) => {
            switch (e.key.toLowerCase()) {
                case keybinds.settingsShow: {
                    this.setVisibility(!this.visible);
                    break;
                }

                // Hide when synth controller shown
                case keybinds.synthesizerUIShow: {
                    this.setVisibility(false);
                }
            }
        });

        // Get the elements
        this.htmlControls = {
            renderer: {
                renderingMode: document.querySelector<HTMLSelectElement>(
                    "#renderer_mode_selector"
                )!,
                noteTimeSlider:
                    document.querySelector<HTMLInputElement>(
                        "#note_time_slider"
                    )!,
                noteAfterTriggerTimeSlider:
                    document.querySelector<HTMLInputElement>(
                        "#note_after_time_slider"
                    )!,
                noteToggler:
                    document.querySelector<HTMLInputElement>("#note_toggler")!,
                activeNoteToggler: document.querySelector<HTMLInputElement>(
                    "#active_note_toggler"
                )!,
                visualPitchToggler: document.querySelector<HTMLInputElement>(
                    "#visual_pitch_toggler"
                )!,
                stabilizeWaveformsToggler:
                    document.querySelector<HTMLInputElement>(
                        "#stabilize_waveforms_toggler"
                    )!,

                exponentialGainToggler:
                    document.querySelector<HTMLInputElement>(
                        "#exponential_gain_toggler"
                    )!,
                dynamicGainToggler: document.querySelector<HTMLInputElement>(
                    "#dynamic_gain_toggler"
                )!,
                logarithmicFrequencyToggler:
                    document.querySelector<HTMLInputElement>(
                        "#logarithmic_frequency_toggler"
                    )!,

                analyserThicknessSlider:
                    document.querySelector<HTMLInputElement>(
                        "#analyser_thickness_slider"
                    )!,
                analyserFftSlider: document.querySelector<HTMLInputElement>(
                    "#analyser_fft_slider"
                )!,
                waveMultiplierSlizer: document.querySelector<HTMLInputElement>(
                    "#wave_multiplier_slider"
                )!
            },

            keyboard: {
                channelSelector:
                    document.querySelector<HTMLSelectElement>(
                        "#channel_selector"
                    )!,
                modeSelector:
                    document.querySelector<HTMLInputElement>("#mode_selector")!,
                sizeSelector: document.querySelector<HTMLSelectElement>(
                    "#keyboard_size_selector"
                )!,
                showSelector:
                    document.querySelector<HTMLInputElement>("#keyboard_show")!
            },

            midi: {
                outputSelector: document.querySelector<HTMLSelectElement>(
                    "#midi_output_selector"
                )!,
                inputSelector: document.querySelector<HTMLSelectElement>(
                    "#midi_input_selector"
                )!
            },

            interface: {
                themeSelector: document.querySelector<HTMLInputElement>(
                    "#toggle_mode_button"
                )!,
                showControlsToggle: document.querySelector<HTMLInputElement>(
                    "#show_sequencer_controls_button"
                )!,
                languageSelector:
                    document.querySelector<HTMLSelectElement>(
                        "#language_selector"
                    )!,
                layoutSelector:
                    document.querySelector<HTMLSelectElement>(
                        "#layout_selector"
                    )!
            }
        };

        // If window.savedSettings exists, load it
        void this.loadSettings().then(() => {
            this.createHandlers();
        });

        let fullscreen = false;

        // Detect fullscreen (even f11)
        window.addEventListener("resize", () => {
            const maxHeight = window.screen.height,
                maxWidth = window.screen.width,
                curHeight = window.outerHeight,
                curWidth = window.outerWidth;

            const screen = maxWidth === curWidth && maxHeight === curHeight;
            if (screen !== fullscreen) {
                fullscreen = screen;
                if (screen) {
                    this.hideTopPart();
                } else {
                    this.showTopPart();
                }
            }
        });

        document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement === null) {
                this.showTopPart();
            } else {
                this.hideTopPart();
            }
        });
    }

    public toggleMusicPlayerMode() {
        if (!this.musicMode.visible) {
            this.hideTopPart();
        }
        this.musicMode.setVisibility(
            !this.musicMode.visible,
            document.querySelector("#keyboard_canvas_wrapper") ??
                (() => {
                    throw new Error("Very unexpected error");
                })()
        );
        this.renderer.renderBool = !this.musicMode.visible;
        this.renderer.updateSize();
    }

    public showTopPart() {
        if (this.topPartVisible) {
            return;
        }
        this.topPartVisible = true;
        const topPart = document.querySelectorAll(
            ".top_part"
        )[0] as HTMLDivElement;
        const showTopButton = document.querySelectorAll(
            ".show_top_button"
        )[0] as HTMLDivElement;
        topPart.style.display = "";
        setTimeout(() => {
            topPart.classList.remove("top_part_hidden");
        }, ANIMATION_REFLOW_TIME);
        showTopButton.classList.remove("shown");
        showTopButton.style.display = "none";
        window.dispatchEvent(new CustomEvent("resize"));
    }

    public hideTopPart() {
        if (!this.topPartVisible) {
            return;
        }
        this.topPartVisible = false;
        // Hide top
        const topPart = document.querySelectorAll(
            ".top_part"
        )[0] as HTMLDivElement;
        topPart.classList.add("top_part_hidden");
        setTimeout(() => {
            topPart.style.display = "none";
        }, 200);

        // Show button to get it back
        const showTopButton = document.querySelectorAll(
            ".show_top_button"
        )[0] as HTMLDivElement;
        showTopButton.style.display = "flex";
        setTimeout(() => {
            showTopButton.classList.add("shown");
        }, ANIMATION_REFLOW_TIME);

        showTopButton.addEventListener("click", this.showTopPart.bind(this));
        window.dispatchEvent(new CustomEvent("resize"));
    }

    public setVisibility(visible: boolean) {
        if (this.animationId) {
            clearTimeout(this.animationId);
        }
        if (visible) {
            this.mainDiv.style.display = "block";
            setTimeout(() => {
                document
                    .querySelectorAll(".top_part")[0]
                    .classList.add("settings_shown");
                this.mainDiv.classList.add("settings_menu_show");
            }, ANIMATION_REFLOW_TIME);
            this.hideOnDocClick = false;
        } else {
            document
                .querySelectorAll(".top_part")[0]
                .classList.remove("settings_shown");
            this.mainDiv.classList.remove("settings_menu_show");
            this.animationId = window.setTimeout(() => {
                this.mainDiv.style.display = "none";
            }, TRANSITION_TIME * 1000);
        }
        this.visible = visible;
    }

    public createHandlers() {
        // Create handlers for all settings
        this.createRendererHandler();

        this.createMidiSettingsHandler();

        this.createKeyboardHandler();

        this.createInterfaceSettingsHandler();
    }

    public setTimeDelay(fft: number) {
        // Calculate delay:
        // 16384 fft size = 0.37 s
        const delayTime =
            fft >= 2048 &&
            this.renderer.rendererMode !== rendererModes.spectrumSingleMode
                ? niceDelayLookupTable[fft as keyof typeof niceDelayLookupTable]
                : 0;
        this.delay.delayTime.value = delayTime;
        this.renderer.timeOffset = delayTime;
        this.synth.eventHandler.timeDelay = delayTime;
    }
}
