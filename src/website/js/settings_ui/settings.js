import { settingsHtml } from './settings_html.js'
import { getDownArrowSvg, getGearSvg } from '../icons.js'
import { _loadSettings } from './saving/load_settings.js'
import { _saveSettings } from './saving/save_settings.js'
import { _serializeSettings } from './saving/serialize_settings.js'
import { _createInterfaceSettingsHandler } from './handlers/interface_handler.js'
import { _toggleDarkMode } from './handlers/toggle_dark_mode.js'
import { _createRendererHandler } from './handlers/renderer_handler.js'
import {
    _createMidiInputHandler,
    _createMidiOutputHandler,
    _createMidiSettingsHandler,
} from './handlers/midi_handler.js'
import { _createKeyboardHandler } from './handlers/keyboard_handler.js'
import { localeList } from '../../locale/locale_files/locale_list.js'

/**
 * settings.js
 * purpose: manages the gui settings, controlling things like render settings, light mode etc.
 */

class SpessaSynthSettings
{
    /**
     * Creates a new instance of synthetizer UI
     * @param settingsWrapper {HTMLElement} the element to create the settings in
     * @param sythui {SynthetizerUI}
     * @param sequi {SequencerUI}
     * @param renderer {Renderer}
     * @param midiKeyboard {MidiKeyboard}
     * @param midiDeviceHandler {MIDIDeviceHandler}
     * @param playerInfo {MusicModeUI}
     * @param localeManager {LocaleManager}
     */
    constructor(settingsWrapper,
                sythui,
                sequi,
                renderer,
                midiKeyboard,
                midiDeviceHandler,
                playerInfo,
                localeManager)
    {
        this.mode = "dark";
        this.renderer = renderer;
        this.midiKeyboard = midiKeyboard;
        this.midiDeviceHandler = midiDeviceHandler;
        this.synthui = sythui;
        this.sequi = sequi;
        this.locale = localeManager;
        this.locales = localeList;
        this.keyboardSizes = {
            "full": { min: 0, max: 127 },
            "piano": { min: 21, max: 108 },
            "5 octaves": { min: 36, max: 96 }
        };

        const settingsButton = document.createElement("div");
        settingsButton.style.position = "relative";
        settingsButton.classList.add("seamless_button");
        settingsButton.classList.add("settings_button");
        settingsWrapper.appendChild(settingsButton);

        const musicModeButton = document.createElement("div");
        musicModeButton.classList.add("seamless_button");
        this.locale.bindObjectProperty(musicModeButton, "innerText", "locale.musicPlayerMode.toggleButton.title");
        this.locale.bindObjectProperty(musicModeButton, "title", "locale.musicPlayerMode.toggleButton.description");
        settingsWrapper.appendChild(musicModeButton);

        const hideTopButton = document.createElement("div");
        hideTopButton.classList.add("seamless_button");
        this.locale.bindObjectProperty(hideTopButton, "innerText", "locale.hideTopBar.title");
        this.locale.bindObjectProperty(hideTopButton, "title", "locale.hideTopBar.description");
        settingsWrapper.appendChild(hideTopButton);

        let text = document.createElement('span');
        this.locale.bindObjectProperty(text, "innerText", "locale.settings.toggleButton");
        settingsButton.appendChild(text);

        let gear = document.createElement('div');
        gear.innerHTML = getGearSvg(32);
        gear.classList.add("gear");
        settingsButton.appendChild(gear);

        this.mainDiv = document.createElement("div");
        this.mainDiv.classList.add("settings_menu");
        settingsButton.onclick = () => {
            document.getElementsByClassName("top_part")[0].classList.toggle("settings_shown");
            this.mainDiv.classList.toggle("settings_menu_show");
            this.hideOnDocClick = false;
        }
        settingsWrapper.appendChild(this.mainDiv);

        musicModeButton.onclick = () => {
            playerInfo.togglevisibility();
            renderer.canvas.classList.toggle("hidden");
            midiKeyboard.keyboard.classList.toggle("hidden");

            // disable rendering when hidden
            renderer.renderBool = !renderer.canvas.classList.contains("hidden");
        }

        hideTopButton.onclick = () => {
            // hide top
            document.getElementsByClassName("top_part")[0].classList.toggle("hidden");
            // show button to get it back
            const showTopButton =  document.getElementsByClassName("show_top_button")[0];
            // add the svg
            showTopButton.innerHTML = getDownArrowSvg(20);
            showTopButton.classList.toggle("shown");
            showTopButton.onclick = () => {
                document.getElementsByClassName("top_part")[0].classList.toggle("hidden");
                showTopButton.classList.toggle("shown");
            }

        }

        this.hideOnDocClick = true;
        // stop propagation to disable hide on click outside
        this.mainDiv.onclick = () => {
            this.hideOnDocClick = false;
        };

        // hide if clicked outside
        document.addEventListener("click", () => {
            if(!this.hideOnDocClick)
            {
                this.hideOnDocClick = true;
                return;
            }
            document.getElementsByClassName("top_part")[0].classList.remove("settings_shown");
            this.mainDiv.classList.remove("settings_menu_show")
        })

        // load the html
        this.mainDiv.innerHTML = settingsHtml;
        // bind all translations to the html
        for (const element of this.mainDiv.querySelectorAll("*[translate-path]"))
        {
            // translate-path apply innerText directly
            this.locale.bindObjectProperty(element, "textContent", element.getAttribute("translate-path"));
        }
        for (const element of this.mainDiv.querySelectorAll("*[translate-path-title]"))
        {
            const path = element.getAttribute("translate-path-title");
            // translate-path-title: apply to both innerText and title, by adding .title and .description respectively
            this.locale.bindObjectProperty(element, "textContent",  path + ".title");
            this.locale.bindObjectProperty(element, "title", path + ".description");
        }

        this.getHtmlControls();


        // key bind is "R"
        document.addEventListener("keydown", e => {
            if(e.key.toLowerCase() === "r")
            {
                document.getElementsByClassName("top_part")[0].classList.toggle("settings_shown");
                this.mainDiv.classList.toggle("settings_menu_show");
            }
        })

        // if window.savedSettings exists, load it
        if(window.savedSettings)
        {
            this._loadSettings().then(() => {
                this.createHandlers(renderer, midiKeyboard, midiDeviceHandler, sequi, sythui)
            });
        }
        else
        {
            this.createHandlers(renderer, midiKeyboard, midiDeviceHandler, sequi, sythui)
        }
    }

    createHandlers(renderer, midiKeyboard, midiDeviceHandler, sequi, sythui)
    {
        // create handlers for all settings
        this._createRendererHandler(renderer);

        this._createMidiSettingsHandler(
            midiDeviceHandler,
            sequi,
            sythui);

        this._createKeyboardHandler(midiKeyboard,
            sythui,
            renderer
        );

        this._createInterfaceSettingsHandler();
    }

    getHtmlControls()
    {
        // get the html controllers
        this.htmlControls = {
            renderer: {
                noteTimeSlider: document.getElementById("note_time_slider"),
                analyserToggler: document.getElementById("analyser_toggler"),
                noteToggler:  document.getElementById("note_toggler"),
                activeNoteToggler: document.getElementById("active_note_toggler"),
                visualPitchToggler: document.getElementById("visual_pitch_toggler"),
                stabilizeWaveformsToggler: document.getElementById("stabilize_waveforms_toggler"),

                analyserThicknessSlider: document.getElementById("analyser_thickness_slider"),
                analyserFftSlider: document.getElementById("analyser_fft_slider"),
                waveMultiplierSlizer: document.getElementById("wave_multiplier_slider"),
            },

            keyboard: {
                channelSelector: document.getElementById("channel_selector"),
                modeSelector: document.getElementById("mode_selector"),
                sizeSelector: document.getElementById("keyboard_size_selector"),
            },

            midi: {
                outputSelector: document.getElementById("midi_output_selector"),
                inputSelector: document.getElementById("midi_input_selector")
            },

            interface: {
                themeSelector: document.getElementById("toggle_mode_button"),
                languageSelector: document.getElementById("language_selector")
            }
        }
    }
}
SpessaSynthSettings.prototype._toggleDarkMode = _toggleDarkMode;
SpessaSynthSettings.prototype._createInterfaceSettingsHandler = _createInterfaceSettingsHandler;
SpessaSynthSettings.prototype._createRendererHandler = _createRendererHandler;

SpessaSynthSettings.prototype._createMidiSettingsHandler = _createMidiSettingsHandler;
SpessaSynthSettings.prototype._createMidiInputHandler = _createMidiInputHandler;
SpessaSynthSettings.prototype._createMidiOutputHandler = _createMidiOutputHandler;
SpessaSynthSettings.prototype._createKeyboardHandler = _createKeyboardHandler;

SpessaSynthSettings.prototype._loadSettings = _loadSettings;
SpessaSynthSettings.prototype._serializeSettings = _serializeSettings;
SpessaSynthSettings.prototype._saveSettings = _saveSettings;

export {SpessaSynthSettings}