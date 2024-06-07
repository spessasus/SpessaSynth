import { settingsHtml } from './settings_html.js'
import { getDownArrowSvg, getGearSvg } from '../icons.js'
import { DEFAULT_LOCALE } from '../../locale/locale_files/locale_list.js'

/**
 * settings.js
 * purpose: manages the gui settings, controlling things like render settings, light mode etc.
 */

/**
 * @typedef {{
 *   keyboard: {
 *     keyRange: {
 *       min: number,
 *       max: number
 *     },
 *     mode: ("light" | "dark"),
 *     selectedChannel: number
 *   },
 *   renderer: {
 *     renderNotes: boolean,
 *     keyRange: {
 *       min: number,
 *       max: number
 *     },
 *     noteFallingTimeMs: number,
 *     renderWaveforms: boolean,
 *     drawActiveNotes: boolean,
 *     amplifier: number,
 *     showVisualPitch: boolean,
 *     sampleSize: number,
 *     waveformThickness: number
 *   },
 *   midi: {
 *     output: (null | string),
 *     input: (null | string)
 *   },
 *   interface: {
 *     mode: ("light" | "dark"),
 *     language: string
 *   }
 * }} SavedSettings
 */

export class Settings
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
     * @param locales {Object<string, CompleteLocaleTypedef>}
     */
    constructor(settingsWrapper,
                sythui,
                sequi,
                renderer,
                midiKeyboard,
                midiDeviceHandler,
                playerInfo,
                localeManager,
                locales) {
        this.mode = "dark";
        this.renderer = renderer;
        this.midiKeyboard = midiKeyboard;
        this.midiDeviceHandler = midiDeviceHandler;
        this.synthui = sythui;
        this.sequi = sequi;
        this.locale = localeManager;
        this.locales = locales;
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

        let gear = document.createElement('div');
        gear.innerHTML = getGearSvg(32);
        gear.classList.add("gear");

        settingsButton.appendChild(text);
        settingsButton.appendChild(gear);

        this.mainDiv = document.createElement("div");
        this.mainDiv.classList.add("settings_menu");
        settingsButton.onclick = e => {
            this.mainDiv.classList.toggle("settings_menu_show");
            e.stopPropagation();
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

        // stop propagation to disable hide on click outside
        this.mainDiv.onclick = e => e.stopPropagation();

        // hide if clicked outside
        document.addEventListener("click", () => {
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

        // get the html controllers
        this.htmlControls = {
            renderer: {
                noteTimeSlider: document.getElementById("note_time_slider"),
                analyserToggler: document.getElementById("analyser_toggler"),
                noteToggler:  document.getElementById("note_toggler"),
                activeNoteToggler: document.getElementById("active_note_toggler"),
                visualPitchToggler: document.getElementById("visual_pitch_toggler"),

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

        // key bind is "R"
        document.addEventListener("keydown", e => {
            if(e.key.toLowerCase() === "r")
            {
                this.mainDiv.classList.toggle("settings_menu_show");
            }
        })

        // if window.savedSettings exists, load it
        if(window.savedSettings)
        {
            this._loadSettings().then();
        }
    }

    /**
     * @private
     */
    async _loadSettings()
    {
        /**
         * @type {SavedSettings}
         */
        const savedSettings = await window.savedSettings;

        // renderer
        const rendererControls = this.htmlControls.renderer;
        const renderer = this.renderer;
        const rendererValues = savedSettings.renderer;
        // note falling time
        renderer.noteFallingTimeMs = rendererValues.noteFallingTimeMs;
        rendererControls.noteTimeSlider.value = rendererValues.noteFallingTimeMs;
        rendererControls.noteTimeSlider.nextElementSibling.innerText = `${rendererValues.noteFallingTimeMs}ms`

        // waveform line thickness
        rendererControls.analyserThicknessSlider.value = rendererValues.waveformThickness
        renderer.lineThickness = rendererValues.waveformThickness;
        rendererControls.analyserThicknessSlider.nextElementSibling.innerText = `${rendererValues.waveformThickness}px`;

        // fft size (sample size)
        let value = rendererValues.sampleSize;
        // Math.pow(2, parseInt(rendererControls.analyserFftSlider.value)); we need to invert this
        rendererControls.analyserFftSlider.value = Math.log2(value);
        renderer.normalAnalyserFft = value;
        renderer.drumAnalyserFft = Math.pow(2, Math.min(15, Math.log2(value) + 2));
        rendererControls.analyserFftSlider.nextElementSibling.innerText = `${value}`;

        // wave multiplier
        renderer.waveMultiplier = rendererValues.amplifier;
        rendererControls.waveMultiplierSlizer.value = rendererValues.amplifier;
        rendererControls.waveMultiplierSlizer.nextElementSibling.innerText = rendererValues.amplifier;

        // render waveforms
        renderer.renderAnalysers = rendererValues.renderWaveforms;

        // render notes
        renderer.renderNotes = rendererValues.renderNotes;

        // render active notes effect
        renderer.drawActiveNotes = rendererValues.drawActiveNotes;

        // show visual pitch
        renderer.showVisualPitch = rendererValues.showVisualPitch;

        // keyboard size
        renderer.keyRange = rendererValues.keyRange;

        // keyboard
        const keyboardControls = this.htmlControls.keyboard;
        const keyboard = this.midiKeyboard;
        const keyboardValues = savedSettings.keyboard;

        // removed selected channel because it's not something you want to save

        // keyboard size
        keyboard.keyRange = keyboardValues.keyRange;
        // find the correct option for the size
        keyboardControls.sizeSelector.value = Object.keys(this.keyboardSizes)
            .find(size => this.keyboardSizes[size].min === keyboardValues.keyRange.min && this.keyboardSizes[size].max === keyboardValues.keyRange.max);
        // keyboard theme
        if(keyboardValues.mode === "dark")
        {
            keyboard.toggleMode();
        }


        // interface
        if(savedSettings.interface.language !== DEFAULT_LOCALE)
        {
            this.locale.changeGlobalLocale(this.locales[savedSettings.interface.language]);
            this.htmlControls.interface.languageSelector.value = savedSettings.interface.language;
        }
        if(savedSettings.interface.mode === "light")
        {
            this._toggleDarkMode();
        }
    }



    // if window.saveSettings function is exposed, call it with _serializeSettings
    _saveSettings()
    {
        if(window.saveSettings)
        {
            window.saveSettings(this._serializeSettings());
        }
    }

    /**
     * Serializes settings into a nice object
     * @private
     * @returns {SavedSettings}
     */
    _serializeSettings()
    {
        return {
            renderer: {
                noteFallingTimeMs: this.renderer.noteFallingTimeMs,
                waveformThickness: this.renderer.lineThickness,
                sampleSize: this.renderer.normalAnalyserFft,
                amplifier: this.renderer.waveMultiplier,
                renderWaveforms:  this.renderer.renderNotes,
                renderNotes: this.renderer.renderNotes,
                drawActiveNotes: this.renderer.drawActiveNotes,
                showVisualPitch: this.renderer.showVisualPitch,
                keyRange: this.renderer.keyRange
            },

            keyboard: {
                selectedChannel: this.midiKeyboard.channel,
                keyRange: this.midiKeyboard.keyRange,
                mode: this.midiKeyboard.mode
            },

            midi: {
                input: this.midiDeviceHandler.selectedInput === null ? null : this.midiDeviceHandler.selectedInput.name,
                output: this.midiDeviceHandler.selectedOutput === null ? null: this.midiDeviceHandler.selectedOutput.name
            },

            interface: {
                mode: this.mode,
                language: this.htmlControls.interface.languageSelector.value
            }
        }
    }

    /**
     *
     * @private
     */
    _toggleDarkMode()
    {
        if(this.mode === "dark")
        {
            this.mode = "light";
            this.renderer.drawActiveNotes = false;
        }
        else
        {
            this.renderer.drawActiveNotes = true;
            this.mode = "dark";

        }
        this.renderer.toggleDarkMode();
        this.synthui.toggleDarkMode();
        this.sequi.toggleDarkMode()

        // top part
        document.getElementsByClassName("top_part")[0].classList.toggle("top_part_light");

        // settings
        this.mainDiv.classList.toggle("settings_menu_light");

        // rest
        // things get hacky here: change the global (*) --font-color to black:
        // find the star rule
        const rules = document.styleSheets[0].cssRules;
        for(let rule of rules)
        {
            if(rule.selectorText === "*")
            {
                rule.style.setProperty("--font-color",  this.mode === "dark" ? "#eee" : "#333");
                rule.style.setProperty("--top-buttons-color",  this.mode === "dark" ? "linear-gradient(201deg, #222, #333)" : "linear-gradient(270deg, #ddd, #fff)");
                break;
            }
        }
        document.body.style.background = this.mode === "dark" ? "black" : "white";
    }

    /**
     * @private
     */
    _createInterfaceSettingsHandler()
    {
        const button = this.htmlControls.interface.themeSelector;
        button.onclick = () => {
            this._toggleDarkMode();
            this._saveSettings();
        }
        const select = this.htmlControls.interface.languageSelector;
        // load up the languages
        for(const [code, locale] of Object.entries(this.locales))
        {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = locale.localeName
            select.appendChild(option);
        }
        select.onchange = () => {
            this.locale.changeGlobalLocale(this.locales[select.value]);
            this._saveSettings();
        }
    }

    /**
     * @param handler {MIDIDeviceHandler}
     * @param sequi {SequencerUI}
     * @param synthui {SynthetizerUI}
     * @private
     */
    _createMidiSettingsHandler(handler, sequi, synthui)
    {
        handler.createMIDIDeviceHandler().then(() => {
            this._createMidiInputHandler(handler, synthui.synth);
            this._createMidiOutputHandler(handler, sequi);
        });
    }

    /**
     * @param handler {MIDIDeviceHandler}
     * @param synth {Synthetizer}
     * @private
     */
    _createMidiInputHandler(handler, synth)
    {
        // input selector
        if(handler.inputs.length < 1)
        {
            return;
        }
        // no device
        const select = this.htmlControls.midi.inputSelector;
        for(const input of handler.inputs)
        {
            const option = document.createElement("option");
            option.value = input[0];
            option.innerText = input[1].name;
            select.appendChild(option);
        }
        select.onchange = () => {
            if(select.value === "-1")
            {
                handler.disconnectAllDevicesFromSynth();
            }
            else
            {
                handler.connectDeviceToSynth(handler.inputs.get(select.value), synth);
            }
            this._saveSettings();
        }
    }

    /**
     * note that using sequi allows us to obtain the sequencer after it has been created
     * @param handler {MIDIDeviceHandler}
     * @param sequi {SequencerUI}
     * @private
     */
    _createMidiOutputHandler(handler, sequi)
    {
        if(!handler.outputs)
        {
            setTimeout(() => {
                this._createMidiOutputHandler(handler, sequi);
            }, 1000);
            return;
        }
        if(handler.outputs.length < 1)
        {
            return;
        }
        const select = this.htmlControls.midi.outputSelector;
        for(const output of handler.outputs)
        {
            const option = document.createElement("option");
            option.value = output[0];
            option.innerText = output[1].name;
            select.appendChild(option);
        }

        select.onchange = () => {
            if(!sequi.seq)
            {
                return;
            }
            if(select.value === "-1")
            {
                handler.disconnectSeqFromMIDI(sequi.seq);
            }
            else
            {
                handler.connectMIDIOutputToSeq(handler.outputs.get(select.value), sequi.seq);
            }
            this._saveSettings();
        }
    }

    /**
     * The channel colors are taken from synthui
     * @param keyboard {MidiKeyboard}
     * @param synthui {SynthetizerUI}
     * @param renderer {Renderer}
     * @private
     */
    _createKeyboardHandler( keyboard, synthui, renderer)
    {
        let channelNumber = 0;

        const keyboardControls = this.htmlControls.keyboard;

        const createChannel = () =>
        {
            const option = document.createElement("option");

            option.value = channelNumber.toString();
            // Channel: {0} gets formatred to channel number
            this.locale.bindObjectProperty(option, "textContent", "locale.settings.keyboardSettings.selectedChannel.channelOption", [channelNumber + 1]);

            option.style.background = synthui.channelColors[channelNumber % synthui.channelColors.length];
            option.style.color = "rgb(0, 0, 0)";

            keyboardControls.channelSelector.appendChild(option);
            channelNumber++;
        }

        // create the initial synth channels+
        for(const channel of synthui.synth.synthesisSystem.midiChannels)
        {
            createChannel();
        }
        keyboardControls.channelSelector.onchange = () => {
            keyboard.selectChannel(parseInt(keyboardControls.channelSelector.value));
        }

        keyboardControls.sizeSelector.onchange = () => {
            keyboard.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
            renderer.keyRange = this.keyboardSizes[keyboardControls.sizeSelector.value];
            this._saveSettings();
        }

        // listen for new channels
        synthui.synth.eventHandler.addEvent("newchannel", "settings-new-channel",  () => {
            createChannel();
        });

        // dark mode toggle
        keyboardControls.modeSelector.onclick = () => {
            keyboard.toggleMode();
            this._saveSettings();
        }
    }

    /**
     * @param renderer {Renderer}
     * @private
     */
    _createRendererHandler(renderer)
    {
        const rendererControls = this.htmlControls.renderer;

        // note falling time
        rendererControls.noteTimeSlider.oninput = () => {
            renderer.noteFallingTimeMs = rendererControls.noteTimeSlider.value;
            rendererControls.noteTimeSlider.nextElementSibling.innerText = `${rendererControls.noteTimeSlider.value}ms`
        }
        // bind to onchange instead of oniinput to prevent spam
        rendererControls.noteTimeSlider.onchange = () => { this._saveSettings(); }

        // waveform line thickness
        rendererControls.analyserThicknessSlider.oninput = () => {
            renderer.lineThickness = parseInt(rendererControls.analyserThicknessSlider.value);
            rendererControls.analyserThicknessSlider.nextElementSibling.innerText = `${rendererControls.analyserThicknessSlider.value}px`;
        }
        rendererControls.analyserThicknessSlider.onchange = () => { this._saveSettings(); }

        // fft size (sample size)
        rendererControls.analyserFftSlider.oninput = () => {
            let value = Math.pow(2, parseInt(rendererControls.analyserFftSlider.value));
            renderer.normalAnalyserFft = value;
            renderer.drumAnalyserFft = Math.pow(2, Math.min(15, parseInt(rendererControls.analyserFftSlider.value) + 2));
            rendererControls.analyserFftSlider.nextElementSibling.innerText = `${value}`;
        }
        rendererControls.analyserFftSlider.onchange = () => { this._saveSettings(); }

        // wave multiplier
        rendererControls.waveMultiplierSlizer.oninput = () => {
            renderer.waveMultiplier = parseInt(rendererControls.waveMultiplierSlizer.value);
            rendererControls.waveMultiplierSlizer.nextElementSibling.innerText = rendererControls.waveMultiplierSlizer.value;
        }
        rendererControls.waveMultiplierSlizer.onchange = () => { this._saveSettings(); }

        // render waveforms
        rendererControls.analyserToggler.onclick = () => {
            renderer.renderAnalysers = !renderer.renderAnalysers;
            this._saveSettings()
        };

        // render notes
        rendererControls.noteToggler.onclick = () => {
            renderer.renderNotes = !renderer.renderNotes;
            this._saveSettings()
        };

        // render active notes effect
        rendererControls.activeNoteToggler.onclick = () => {
            renderer.drawActiveNotes = !renderer.drawActiveNotes;
            this._saveSettings()
        };

        // show visual pitch
        rendererControls.visualPitchToggler.onclick = () => {
            renderer.showVisualPitch = !renderer.showVisualPitch;
            this._saveSettings();
        };
    }
}