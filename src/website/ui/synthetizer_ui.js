import {Synthetizer} from "../../spessasynth_lib/synthetizer/synthetizer.js";
import {MidiChannel} from "../../spessasynth_lib/synthetizer/midi_channel.js";
import { getLoopSvg } from './icons.js';
import { ShiftableByteArray } from '../../spessasynth_lib/utils/shiftable_array.js';
import { Meter } from './synthui_meter.js'

const MAX_VOICE_METER = 400;
export class SynthetizerUI
{
    /**
     * Creates a new instance of synthetizer UI
     * @param colors {string[]}
     */
    constructor(colors) {
        this.channelColors = colors;
        const wrapper = document.getElementById("synthetizer_controls");
        this.uiDiv = document.createElement("div");
        this.uiDiv.classList.add("wrapper");
        wrapper.appendChild(this.uiDiv);
        this.uiDiv.style.visibility = "hidden";
        setTimeout(() => this.uiDiv.style.visibility = "visible", 500);
    }

    createMainSynthController()
    {
        /**
         * Voice meter
         * @type {Meter}
         */
        this.voiceMeter = new Meter("#206", "Voices: ", 0, MAX_VOICE_METER);
        this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");

        /**
         * Volume controller
         * @type {Meter}
         */
        this.volumeController = new Meter("#206", "Volume: ", 0, 100, true, v => {
            this.synth.setMainVolume(Math.round(v) / 100);
        });
        this.volumeController.bar.classList.add("voice_meter_bar_smooth");

        /**
         * Pan controller
         * @type {Meter}
         */
        this.panController = new Meter("#206", "Pan: ", -1, 1, true, v => {
            // use roland gs master pan
            this.synth.systemExclusive(new ShiftableByteArray([0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x06, ((v + 1) / 2) * 127]));
        });
        this.panController.bar.classList.add("voice_meter_bar_smooth");

        /**
         * Transpose controller
         * @type {Meter}
         */
        this.transposeController = new Meter("#206", "Transpose: ", -12, 12, true, v => {
            // use roland gs master pan
            this.synth.transpose(Math.round(v));
            this.transposeController.update(Math.round(v))
        });
        this.transposeController.bar.classList.add("voice_meter_bar_smooth");
        this.transposeController.update(0);

        // note killer
        let resetButton = document.createElement("button");
        resetButton.innerText = "MIDI Panic";
        resetButton.classList.add("synthui_button");
        resetButton.onclick = () => this.synth.stopAll(true);

        // create the main controller now, to give the button a variable to work with
        let controller = document.createElement("div");
        controller.classList.add("synthui_controller");
        this.uiDiv.appendChild(controller);

        // channel controller shower
        let showControllerButton = document.createElement("button");
        showControllerButton.innerText = "Synthesizer controller";
        showControllerButton.classList.add("synthui_button");
        showControllerButton.onclick = () => controller.classList.toggle("synthui_controller_show");

        // black midi mode toggle
        const highPerfToggle = document.createElement("button");
        highPerfToggle.innerText = "Black MIDI mode";
        highPerfToggle.classList.add("synthui_button");
        highPerfToggle.onclick = () => {
            this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
        }

        // controls wrapper
        let controlsWrapper = document.createElement("div");
        controlsWrapper.classList.add("controls_wrapper")

        controlsWrapper.appendChild(this.voiceMeter.div);
        controlsWrapper.appendChild(this.volumeController.div);
        controlsWrapper.appendChild(this.panController.div);
        controlsWrapper.appendChild(this.transposeController.div);

        controlsWrapper.appendChild(resetButton);
        controlsWrapper.appendChild(showControllerButton);
        controlsWrapper.appendChild(highPerfToggle);

        this.uiDiv.appendChild(controlsWrapper);
    }

    updateVoicesAmount()
    {
        this.voiceMeter.update(this.synth.voicesAmount);

        for(let i = 0; i < this.controllers.length; i++)
        {
            // update channel
            this.controllers[i].voiceMeter.update(this.synth.midiChannels[i].voicesAmount);
        }
        this.volumeController.update(this.synth.volumeController.gain.value * 100);
        this.panController.update(this.synth.panController.pan.value);
    }

    createChannelControllers()
    {
        const dropdownDiv = this.uiDiv.getElementsByClassName("synthui_controller")[0];

        const title = document.createElement("h4");
        title.innerText = "Synthetizer controller";
        dropdownDiv.appendChild(title);

        /**
         * @type {ChannelController[]}
         */
        this.controllers = [];
        let num = 0;
        for(const chan of this.synth.midiChannels)
        {
            const controller = this.createChannelController(chan, num);
            this.controllers.push(controller);
            dropdownDiv.appendChild(controller.controller);
            num++;
        }

        this.synth.onProgramChange = (channel, p) => {
            if(this.synth.midiChannels[channel].lockPreset)
            {
                return;
            }
            this.controllers[channel].preset.value = JSON.stringify([p.bank, p.program]);
        }

        this.synth.onControllerChange = (channel, controller, value) =>
        {
            switch (controller)
            {
                default:
                    break;

                case "Expression Controller":
                    // expression
                    this.controllers[channel].expression.update(value);
                    break;

                case "Main Volume":
                    // volume
                    this.controllers[channel].volume.update(value);
                    break;

                case "Pan":
                    // pan
                    this.controllers[channel].pan.update((value - 63) / 64);
                    break;
            }
        }

        this.synth.onPitchWheel = (channel, MSB, LSB) => {
            const val = (MSB << 7) | LSB;
            // pitch wheel
            this.controllers[channel].pitchWheel.update(val - 8192);
        }

        setInterval(this.updateVoicesAmount.bind(this), 100);
    }

    /**
     * @typedef {{
     *     controller: HTMLDivElement,
     *     voiceMeter: Meter,
     *     pitchWheel: Meter,
     *     pan: Meter,
     *     expression: Meter,
     *     preset: HTMLSelectElement,
     *     presetReset: HTMLDivElement
     * }} ChannelController
     */

    /**
     * Creates a new channel controller ui
     * @param channel {MidiChannel}
     * @param channelNumber {number}
     * @returns {ChannelController}
     */
    createChannelController(channel, channelNumber)
    {
        // controller
        const controller = document.createElement("div");
        controller.classList.add("channel_controller");

        // voice meter
        const voiceMeter = new Meter(this.channelColors[channelNumber],
            "Voices: ",
            0,
            50);
        voiceMeter.bar.classList.add("voice_meter_bar_smooth");
        controller.appendChild(voiceMeter.div);

        // pitch wheel
        const pitchWheel = new Meter(this.channelColors[channelNumber],
            "Pitch: ",
            -8192,
            8192,
            true,
            val => {
                val = Math.round(val) + 8192;
                // get bend values
                const msb = val >> 7;
                const lsb = val & 0x7F;
                this.synth.pitchWheel(channelNumber, msb, lsb);
        });
        pitchWheel.update(0);
        controller.appendChild(pitchWheel.div);

        // pan controller
        const pan = new Meter(this.channelColors[channelNumber],
            "Pan: ",
            -1,
            1,
            true,
            val => {
                this.synth.controllerChange(channelNumber, "Pan", (val / 2 + 0.5) * 127);
            });
        pan.update(0);
        controller.appendChild(pan.div);

        // expression controller
        const expression = new Meter(this.channelColors[channelNumber],
            "Expression: ",
            0,
            127,
            true,
            val => {
                this.synth.controllerChange(channelNumber, "Expression Controller", val);
            });
        expression.update(127);
        controller.appendChild(expression.div);

        // volume controller
        const volume = new Meter(this.channelColors[channelNumber],
            "Volume: ",
            0,
            127,
            true,
            val => {
            this.synth.controllerChange(channelNumber, "Main Volume", val);
            });
        volume.update(127);
        controller.appendChild(volume.div);

        // create it here so we can use it in the callback function
        const presetReset = document.createElement("div");

        // preset controller
        const presetSelector = this.createSelector((
            this.synth.midiChannels[channelNumber].percussionChannel ? this.percussionList : this.instrumentList
        ),
            presetName => {
            const data = JSON.parse(presetName);
            this.synth.midiChannels[channelNumber].lockPreset = false;
            this.synth.controllerChange(channelNumber, "Bank Select", data[0]);
            this.synth.programChange(channelNumber, data[1]);
            presetSelector.classList.add("locked_selector");
            this.synth.midiChannels[channelNumber].lockPreset = true;
        }
        );
        controller.appendChild(presetSelector);

        // preset reset
        presetReset.innerHTML = getLoopSvg(32);
        presetReset.classList.add("controller_element");
        presetReset.classList.add("voice_reset");
        presetReset.onclick = () => {
            this.synth.midiChannels[channelNumber].lockPreset = false;
            presetSelector.classList.remove("locked_selector");
        }

        controller.appendChild(presetReset);


        return {
            controller: controller,
            voiceMeter: voiceMeter,
            pitchWheel: pitchWheel,
            pan: pan,
            expression: expression,
            volume: volume,
            preset: presetSelector,
            presetReset: presetReset
        };

    }

    /**
     * Connects the synth to UI
     * @param synth {Synthetizer}
     */
    connectSynth(synth)
    {
        this.synth = synth;

        /**
         * @type {string[]}
         */
        this.instrumentList = this.synth.soundFont.presets.filter(p => p.bank !== 128)
            .sort((a, b) => {
                if(a.bank === b.bank)
                {
                    return a.program - b.program;
                }
                return a.bank - b.bank;
            })
            .map(p => `${p.bank
                .toString()
                .padStart(3, "0")}:${p.program
                .toString()
                .padStart(3, "0")} ${p.presetName}`);

        /**
         * @type {string[]}
         */
        this.percussionList = this.synth.soundFont.presets.filter(p => p.bank === 128)
            .sort((a, b) => a.program - b.program)
            .map(p => `128:${p.program
                .toString()
                .padStart(3, "0")} ${p.presetName}`);

        this.createMainSynthController();
        this.createChannelControllers();

        document.addEventListener("keydown", e => {
            switch (e.key.toLowerCase())
            {
                case "s":
                    e.preventDefault();
                    this.uiDiv.getElementsByClassName("synthui_controller")[0].classList.toggle("synthui_controller_show");
                    break;

                case "b":
                    e.preventDefault();
                    this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
                    break;

                case "backspace":
                    e.preventDefault();
                    this.synth.stopAll(true);
                    break;
            }
        })
    }

    /**
     * Creates a new selector
     * @param elements {string[]}
     * @param editCallback {function(string)}
     * @returns {HTMLSelectElement}
     */
    createSelector(elements,
                   editCallback)
    {
        const mainDiv = document.createElement("select");
        mainDiv.innerHTML = elements[0];
        mainDiv.classList.add("voice_selector");
        mainDiv.classList.add("controller_element");

        for(const elementName of elements)
        {
            const element = document.createElement("option");
            const bank = parseInt(elementName.substring(0, 3));
            const program = parseInt(elementName.substring(4, 7));
            element.classList.add("selector_option");
            element.innerText = elementName;
            element.value = JSON.stringify([bank, program]);
            mainDiv.appendChild(element);
        }

        mainDiv.onchange = () => editCallback(mainDiv.value);

        return mainDiv;
    }

    /**
     * @param selector {HTMLSelectElement}
     * @param elements {string[]}
     */
    reloadSelector(selector, elements)
    {
        selector.innerHTML = "";
        for(const elementName of elements)
        {
            const bank = parseInt(elementName.substring(0, 3));
            const program = parseInt(elementName.substring(4, 7));
            const element = document.createElement("option");
            element.classList.add("selector_option");
            element.innerText = elementName;
            element.value = JSON.stringify([bank, program]);
            selector.appendChild(element);
        }

    }

    reloadSelectors()
    {
        this.instrumentList = this.synth.soundFont.presets.filter(p => p.bank !== 128)
            .sort((a, b) => {
                if(a.bank === b.bank)
                {
                    return a.program - b.program;
                }
                return a.bank - b.bank;
            })
            .map(p => `${p.bank
                .toString()
                .padStart(3, "0")}:${p.program
                .toString()
                .padStart(3, "0")} ${p.presetName}`);

        this.percussionList = this.synth.soundFont.presets.filter(p => p.bank === 128)
            .sort((a, b) => a.program - b.program)
            .map(p => `128:${p.program
                .toString()
                .padStart(3, "0")} ${p.presetName}`);

        this.controllers.forEach((controller, i) => {
            this.reloadSelector(controller.preset, this.synth.midiChannels[i].percussionChannel ? this.percussionList : this.instrumentList);
        })
    }
}