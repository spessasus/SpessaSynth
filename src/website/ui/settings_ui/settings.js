import { settingsHtml } from './settings_html.js'
import { getGearSvg } from '../icons.js'
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
     */
    constructor(settingsWrapper,
                sythui,
                sequi,
                renderer,
                midiKeyboard,
                midiDeviceHandler,
                playerInfo) {
        this.mode = "dark";

        const settingsButton = document.createElement("div");
        settingsButton.style.position = "relative";
        settingsButton.classList.add("seamless_button");
        settingsButton.classList.add("settings_button");
        settingsWrapper.appendChild(settingsButton);

        const musicModeButton = document.createElement("div");
        musicModeButton.classList.add("seamless_button");
        musicModeButton.innerText = `Toggle music player mode`;
        musicModeButton.title = 'Toggle the simplified UI version';
        settingsWrapper.appendChild(musicModeButton)

        let text = document.createElement('span')
        text.innerText = 'Settings';

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

        // stop propagation to disable hide on click outside
        this.mainDiv.onclick = e => e.stopPropagation();

        // hide if clicked outside
        document.addEventListener("click", () => {
            this.mainDiv.classList.remove("settings_menu_show")
        })

        // load the html
        this.mainDiv.innerHTML = settingsHtml;

        // create handlers for all settings
        this._createRendererHandler(renderer);

        this._createMidiSettingsHandler(
            midiDeviceHandler,
            sequi,
            sythui);

        this._createKeyboardHandler(document.getElementById("channel_selector"),
            midiKeyboard,
            sythui,
            document.getElementById("mode_selector"));

        this._createInterfaceSettingsHandler(
            sythui,
            sequi,
            renderer);

        // key bind is "R"
        document.addEventListener("keydown", e => {
            if(e.key.toLowerCase() === "r")
            {
                this.mainDiv.classList.toggle("settings_menu_show");
            }
        })
    }

    /**
     * @param synthui {SynthetizerUI}
     * @param sequi {SequencerUI}
     * @param renderer {Renderer}
     * @private
     */
    _createInterfaceSettingsHandler(synthui, sequi, renderer)
    {
        const button = document.getElementById("toggle_mode_button");
        button.onclick = () => {
            if(button.innerText === "Mode: Dark")
            {
                this.mode = "light";
                button.innerText = "Mode: Light";
                renderer.drawActiveNotes = false;
            }
            else
            {
                renderer.drawActiveNotes = true;
                this.mode = "dark";
                button.innerText = "Mode: Dark";
            }
            renderer.toggleDarkMode();
            synthui.toggleDarkMode();
            sequi.toggleDarkMode()

            // top part
            document.getElementsByClassName("top_part")[0].classList.toggle("top_part_light");

            // settings
            this.mainDiv.classList.toggle("settings_menu_light");

            // rest
            // things get hacky here: change the global (*) --font-color to black:
            document.styleSheets[0].cssRules[5].style.setProperty("--font-color",  this.mode === "dark" ? "#eee" : "#333");
            document.styleSheets[0].cssRules[5].style.setProperty("--top-buttons-color",  this.mode === "dark" ? "#222" : "linear-gradient(270deg, #ddd, #fff)");
            document.body.style.background = this.mode === "dark" ? "black" : "white";
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
            this._createMidiInputHandler(document.getElementById("midi_input_selector"), handler, synthui.synth);
            this._createMidiOutputHandler(document.getElementById("midi_output_selector"), handler, sequi);
        });
    }

    /**
     * @param select {HTMLSelectElement}
     * @param handler {MIDIDeviceHandler}
     * @param synth {Synthetizer}
     * @private
     */
    _createMidiInputHandler(select, handler, synth)
    {
        // input selector
        if(handler.inputs.length < 1)
        {
            return;
        }
        // no device
        select.innerHTML = "<option value='-1' selected>Disabled</option>";
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
        }
    }

    /**
     * note that using sequi allows us to obtain the sequencer after it has been created
     * @param select {HTMLSelectElement}
     * @param handler {MIDIDeviceHandler}
     * @param sequi {SequencerUI}
     * @private
     */
    _createMidiOutputHandler(select, handler, sequi)
    {
        if(!handler.outputs)
        {
            setTimeout(() => {
                this._createMidiOutputHandler(select, handler, sequi);
            }, 1000);
            return;
        }
        if(handler.outputs.length < 1)
        {
            return;
        }
        // no device
        select.innerHTML = "<option value='-1' selected>Use SpessaSynth</option>";
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
        }
    }

    /**
     * The channel colors are taken from synthui
     * @param select {HTMLSelectElement}
     * @param keyboard {MidiKeyboard}
     * @param synthui {SynthetizerUI}
     * @param button {HTMLButtonElement}
     * @private
     */
    _createKeyboardHandler(select, keyboard, synthui, button)
    {
        let channelNumber = 0;

        function createChannel()
        {
            const option = document.createElement("option");

            option.value = channelNumber.toString();
            option.innerText = `Channel ${channelNumber + 1}`;

            option.style.background = synthui.channelColors[channelNumber % synthui.channelColors.length];
            option.style.color = "rgb(0, 0, 0)";

            select.appendChild(option);
            channelNumber++;
        }

        // create the initial synth channels+
        for(const channel of synthui.synth.midiChannels)
        {
            createChannel();
        }
        select.onchange = () => {
            keyboard.selectChannel(parseInt(select.value));
        }

        // listen for new channels
        synthui.synth.eventHandler.addEvent("newchannel", "settings-new-channel",  () => {
            createChannel();
        });

        // dark mode toggle
        button.onclick = () => {
            keyboard.toggleMode();
            if(button.innerText === "Mode: Black")
            {
                button.innerText = "Mode: White";
            }
            else
            {
                button.innerText = "Mode: Black";
            }
        }
    }

    /**
     * @param renderer {Renderer}
     * @private
     */
    _createRendererHandler(renderer)
    {
        const slider = document.getElementById("note_time_slider");
        const analyser = document.getElementById("analyser_toggler");
        const note =  document.getElementById("note_toggler");
        const activeNote = document.getElementById("active_note_toggler");
        const visualPitch = document.getElementById("visual_pitch_toggler");

        const analyserSlider = document.getElementById("analyser_thickness_slider");
        const fftSlider = document.getElementById("analyser_fft_slider");
        const waveMultiplierSlider = document.getElementById("wave_multiplier_slider");

        const renderingModeSelector = document.getElementById("rendering_mode_selector");
        slider.oninput = () => {
            renderer.noteFallingTimeMs = slider.value;
            slider.nextElementSibling.innerText = `${slider.value}ms`
        }

        analyserSlider.oninput = () => {
            renderer.lineThickness = parseInt(analyserSlider.value);
            analyserSlider.nextElementSibling.innerText = `${analyserSlider.value}px`;
        }

        fftSlider.oninput = () => {
            let value = Math.pow(2, parseInt(fftSlider.value));
            renderer.normalAnalyserFft = value;
            renderer.drumAnalyserFft = Math.pow(2, Math.min(15, parseInt(fftSlider.value) + 2));
            fftSlider.nextElementSibling.innerText = `${value}`;
        }

        waveMultiplierSlider.oninput = () => {
            renderer.waveMultiplier = parseInt(waveMultiplierSlider.value);
            waveMultiplierSlider.nextElementSibling.innerText = waveMultiplierSlider.value;
        }

        renderingModeSelector.onchange = () => {
            renderer.noteRenderingMode = parseInt(renderingModeSelector.value);
        }

        analyser.onclick = () => renderer.renderAnalysers = !renderer.renderAnalysers;
        note.onclick = () => renderer.renderNotes = !renderer.renderNotes;
        activeNote.onclick = () => renderer.drawActiveNotes = !renderer.drawActiveNotes;
        visualPitch.onclick = () => renderer.showVisualPitch = !renderer.showVisualPitch;
    }
}