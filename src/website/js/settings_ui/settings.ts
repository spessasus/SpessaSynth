import { settingsHtml } from "./settings_html.js";
import { getDownArrowSvg, getGearSvg } from "../utils/icons.js";
import { _loadSettings } from "./saving/load_settings.js";
import { _saveSettings } from "./saving/save_settings.js";
import { _serializeSettings } from "./saving/serialize_settings.js";
import {
    _changeLayout,
    _createInterfaceSettingsHandler
} from "./handlers/interface_handler.js";
import { _applyTheme } from "./handlers/apply_theme.ts";
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
import { localeList } from "../../locale/locale_list.js";
import { keybinds } from "../utils/keybinds.js";
import { handleSliders } from "./sliders.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { type Sequencer } from "spessasynth_lib";
import type { SynthesizerUI } from "../synthesizer_ui/synthetizer_ui.ts";
import type { SequencerUI } from "../sequencer_ui/sequencer_ui.ts";
import type { LiveKeyboard } from "../canvas_keyboard/live/live_keyboard.ts";
import type { MusicModeUI } from "../music_mode_ui/music_mode_ui.ts";
import type { LocaleManager } from "../manager/locale_manager.ts";
import { DEFAULT_THEME, type ThemeID } from "../themes/theme_list.ts";
import type { Synthesizer } from "../utils/synthesizer.ts";
import { rendererModes } from "../renderer/base/renderer_modes.ts";
import type { LiveRenderer } from "../renderer/live/live_renderer.ts";

const TRANSITION_TIME = 0.2;

// These delays sync with the AnalyserNode delay
// Tested on firefox
const niceDelayLookupTable = {
    8192: 0.01,
    16_384: 0.05,
    32_768: 0.1
};

/**
 * Settings.js
 * purpose: manages the gui settings, controlling things like render settings, themes, etc.
 */

export class SpessaSynthSettings {
    public readonly htmlControls;
    protected readonly delay: DelayNode;
    protected readonly renderer;
    protected readonly synth: Synthesizer;
    protected readonly seq: Sequencer;
    protected readonly midiKeyboard: LiveKeyboard;
    protected readonly synthui: SynthesizerUI;
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
    protected theme: ThemeID = DEFAULT_THEME;
    protected autoKeyRange = false;
    protected readonly mainDiv;
    protected visible = false;
    protected animationId = -1;
    protected hideOnDocClick = true;
    protected topPartVisible = true;
    protected readonly applyTheme = _applyTheme.bind(this);
    protected readonly createInterfaceSettingsHandler =
        _createInterfaceSettingsHandler.bind(this);
    protected readonly changeLayout = _changeLayout.bind(this);
    protected readonly createRendererHandler =
        _createRendererHandler.bind(this);
    protected readonly setRendererMode = _setRendererMode.bind(this);
    protected readonly createMidiSettingsHandler =
        _createMidiSettingsHandler.bind(this);
    protected readonly createMIDIInputHandler =
        _createMidiInputHandler.bind(this);
    protected readonly createMIDIOutputHandler =
        _createMidiOutputHandler.bind(this);
    protected readonly createKeyboardHandler =
        _createKeyboardHandler.bind(this);
    protected readonly loadSettings = _loadSettings.bind(this);
    protected readonly serializeSettings = _serializeSettings.bind(this);
    protected readonly saveSettings = _saveSettings.bind(this);

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
        sythui: SynthesizerUI,
        sequi: SequencerUI,
        renderer: LiveRenderer,
        midiKeyboard: LiveKeyboard,
        playerInfo: MusicModeUI,
        localeManager: LocaleManager,
        delayNode: DelayNode
    ) {
        this.delay = delayNode;

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
        showTopButton.addEventListener("click", this.showTopPart.bind(this));

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
        settingsButton.addEventListener("click", () => {
            // Do not hide on the document click that this click causes
            this.hideOnDocClick = false;
            this.setVisibility(!this.visible);
        });
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
        for (const element of this.mainDiv.querySelectorAll(
            "*[translate-path-placeholder]"
        )) {
            this.locale.bindObjectProperty(
                element as HTMLInputElement,
                "placeholder",
                element.getAttribute("translate-path-placeholder") ?? ""
            );
        }

        // Live search
        // Hide settings and groups that do not match
        const searchInput =
            this.mainDiv.querySelector<HTMLInputElement>("#settings_search")!;
        const noResults = this.mainDiv.querySelector<HTMLElement>(
            ".settings_no_results"
        )!;
        const groups = [
            ...this.mainDiv.querySelectorAll<HTMLElement>(".settings_group")
        ];
        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            let anyShown = false;
            for (const group of groups) {
                const heading = group.querySelector("h2")?.textContent ?? "";
                const groupMatches = heading.toLowerCase().includes(query);
                let shown = 0;
                for (const setting of group.querySelectorAll<HTMLElement>(
                    ".setting"
                )) {
                    const text = (
                        (setting.textContent ?? "") +
                        (setting.querySelector("label")?.title ?? "")
                    ).toLowerCase();
                    const match =
                        query === "" || groupMatches || text.includes(query);
                    setting.classList.toggle("search_hidden", !match);
                    if (match) {
                        shown++;
                    }
                }
                group.classList.toggle("search_hidden", shown === 0);
                anyShown ||= shown > 0;
            }
            // Show no settings message
            noResults.classList.toggle("hidden", anyShown);
        });
        // Escape clears the query first (QoL)
        searchInput.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
                searchInput.value = "";
                searchInput.dispatchEvent(new Event("input"));
            }
        });

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

                lineThickness: document.querySelector<HTMLInputElement>(
                    "#analyser_thickness_slider"
                )!,
                analyserFftSize: document.querySelector<HTMLInputElement>(
                    "#analyser_fft_slider"
                )!,
                waveMultiplier: document.querySelector<HTMLInputElement>(
                    "#wave_multiplier_slider"
                )!,
                noteFallingTime:
                    document.querySelector<HTMLInputElement>(
                        "#note_time_slider"
                    )!,
                noteAfterTriggerTime: document.querySelector<HTMLInputElement>(
                    "#note_after_time_slider"
                )!,

                showPresetNames: document.querySelector<HTMLInputElement>(
                    "#preset_names_toggler"
                )!,
                renderNotes:
                    document.querySelector<HTMLInputElement>("#note_toggler")!,
                drawActiveNotes: document.querySelector<HTMLInputElement>(
                    "#active_note_toggler"
                )!,
                showVisualPitch: document.querySelector<HTMLInputElement>(
                    "#visual_pitch_toggler"
                )!,
                renderDotDisplay: document.querySelector<HTMLInputElement>(
                    "#dot_display_toggler"
                )!,
                stabilizeWaveforms: document.querySelector<HTMLInputElement>(
                    "#stabilize_waveforms_toggler"
                )!,

                exponentialGain: document.querySelector<HTMLInputElement>(
                    "#exponential_gain_toggler"
                )!,
                dynamicGain: document.querySelector<HTMLInputElement>(
                    "#dynamic_gain_toggler"
                )!,
                logarithmicFrequency: document.querySelector<HTMLInputElement>(
                    "#logarithmic_frequency_toggler"
                )!
            },

            keyboard: {
                selectedChannel:
                    document.querySelector<HTMLSelectElement>(
                        "#channel_selector"
                    )!,
                mode: document.querySelector<HTMLInputElement>(
                    "#mode_selector"
                )!,
                keyRange: document.querySelector<HTMLSelectElement>(
                    "#keyboard_size_selector"
                )!,
                shown: document.querySelector<HTMLInputElement>(
                    "#keyboard_show"
                )!,
                forceMaxVelocity: document.querySelector<HTMLInputElement>(
                    "#keyboard_force_max_velocity"
                )!,
                glow: document.querySelector<HTMLInputElement>(
                    "#keyboard_glow"
                )!,
                glowIntensity: document.querySelector<HTMLInputElement>(
                    "#keyboard_glow_intensity"
                )!,
                glowSettings: document.querySelector<HTMLDivElement>(
                    "#keyboard_glow_settings"
                )!
            },

            midi: {
                outputSelector: document.querySelector<HTMLSelectElement>(
                    "#midi_output_selector"
                )!,
                portSelectors: document.querySelectorAll<HTMLSelectElement>(
                    "#midi_port_selectors .midi_port_selector"
                ),
                portSelectorsWrapper: document.querySelector<HTMLDivElement>(
                    "#midi_port_selectors"
                )!,
                inputSelector: document.querySelector<HTMLSelectElement>(
                    "#midi_input_selector"
                )!
            },

            interface: {
                themeSelector:
                    document.querySelector<HTMLSelectElement>(
                        "#theme_selector"
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
            if (!this.topPartVisible) {
                return;
            }
            topPart.classList.remove("top_part_hidden");
            // Force resize for the renderer to update
            window.dispatchEvent(new CustomEvent("resize"));
        }, ANIMATION_REFLOW_TIME);
        showTopButton.classList.remove("shown");
        showTopButton.style.display = "none";
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
            if (!this.topPartVisible) {
                topPart.style.display = "none";
            }
        }, 200);

        // Show button to get it back
        const showTopButton = document.querySelectorAll(
            ".show_top_button"
        )[0] as HTMLDivElement;
        showTopButton.style.display = "flex";
        setTimeout(() => {
            showTopButton.classList.add("shown");
        }, ANIMATION_REFLOW_TIME);

        window.dispatchEvent(new CustomEvent("resize"));
    }

    public setVisibility(visible: boolean) {
        clearTimeout(this.animationId);
        if (visible) {
            this.mainDiv.style.display = "block";
            this.mainDiv.style.maxHeight =
                getComputedStyle(this.mainDiv).overflowY === "visible"
                    ? ""
                    : `${Math.max(
                          240,
                          window.innerHeight -
                              this.mainDiv.getBoundingClientRect().top -
                              8
                      )}px`;
            this.animationId = window.setTimeout(() => {
                document
                    .querySelectorAll(".top_part")[0]
                    .classList.add("settings_shown");
                this.mainDiv.classList.add("settings_menu_show");
            }, ANIMATION_REFLOW_TIME);
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
            fft >= 8192 &&
            this.renderer.rendererMode !== rendererModes.spectrumSingleMode
                ? niceDelayLookupTable[fft as keyof typeof niceDelayLookupTable]
                : 0;
        this.delay.delayTime.value = delayTime;
        this.renderer.timeOffset = delayTime;
        this.synth.eventHandler.timeDelay = delayTime;
    }
}
