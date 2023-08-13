import {Synthetizer} from "../../spessasynth_lib/synthetizer/synthetizer.js";
import {MidiChannel} from "../../spessasynth_lib/synthetizer/midi_channel.js";
import { getLoopSvg } from './icons.js'

/**
 * @typedef {{div: HTMLDivElement,
 * bar: HTMLDivElement,
 * textElement: HTMLParagraphElement,
 * meterText: string,
 * max: number,
 * min: number}} Meter
 */

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

        this.createMainVoiceMeter();
        this.createChannelControllers();
    }

    /**
     * @typedef {Function} MeterCallbackFunction
     * @param clickedValue {number} the value, calculated with min and max values
     */

    /**
     * Creates a new meter
     * @param color {string} the color in css
     * @param meterText {string}
     * @param max {number}
     * @param min {number}
     * @param editable {boolean} if the meter should be editable with mouse
     * @param editCallback {MeterCallbackFunction}
     * @returns {Meter}
     */
    createMeter(color = "initial",
                meterText="Voices: ",
                min = 0,
                max = 100,
                editable=false,
                editCallback = undefined)
    {
        const mainDiv = document.createElement("div");
        mainDiv.classList.add("voice_meter");
        mainDiv.classList.add("controller_element");
        mainDiv.style.border = "1px solid "+ color;

        const bar = document.createElement("div");
        bar.classList.add("voice_meter_bar");
        bar.style.background = color;
        mainDiv.appendChild(bar);

        const text = document.createElement("p");
        text.classList.add("voice_meter_text");
        mainDiv.appendChild(text);

        if(editable)
        {
            if(editCallback === undefined) {
                throw "No editable function given!";
            }
            mainDiv.onclick = e => {
                const bounds = e.currentTarget.getBoundingClientRect();
                const relativeLeft = bounds.left;
                const width = bounds.width;
                const relative = e.clientX - relativeLeft;
                const percentage =  Math.max(0, Math.min(1, relative / width));
                editCallback(percentage * (max - min) + min);
            };
            mainDiv.classList.add("editable");
        }

        return {
            div: mainDiv,
            bar: bar,
            textElement: text,
            meterText: meterText,
            max: max,
            min: min
        };
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

    createMainVoiceMeter()
    {
        /**
         * Voice meter
         * @type {Meter}
         */
        this.voiceMeter = this.createMeter("#206", "Voices: ", 0, MAX_VOICE_METER);
        this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");

        /**
         * Volume controller
         * @type {Meter}
         */
        this.volumeController = this.createMeter("#206", "Main Volume: ", 0, 100, true, v => {
            this.synth.setMainVolume(Math.round(v) / 100);
        });
        this.volumeController.bar.classList.add("voice_meter_bar_smooth");

        // note killer
        let resetButton = document.createElement("button");
        resetButton.innerText = "MIDI Panic";
        resetButton.classList.add("note_killer");
        resetButton.onclick = () => this.synth.stopAll();

        setInterval(this.updateVoicesAmount.bind(this), 100);

        let controlsWrapper = document.createElement("div");
        controlsWrapper.classList.add("controls_wrapper")

        controlsWrapper.appendChild(this.voiceMeter.div);
        controlsWrapper.appendChild(this.volumeController.div);
        controlsWrapper.appendChild(resetButton);

        this.uiDiv.appendChild(controlsWrapper);

        const desc = document.createElement("label");
        desc.innerText = "Synthesizer controller (hover)" +
            "\nToggle Black MIDI mode:";

        const highPerfToggle = document.createElement("input");
        highPerfToggle.type = "checkbox";
        highPerfToggle.onchange = () => {
            this.synth.highPerformanceMode = highPerfToggle.checked;
        }

        this.synth.onHighToggle = status => highPerfToggle.checked = status;

        desc.appendChild(highPerfToggle);
        this.uiDiv.appendChild(desc);
    }

    updateVoicesAmount()
    {
        this.updateMeter(this.voiceMeter, this.synth.voicesAmount);

        for(let i = 0; i < this.controllers.length; i++)
        {
            // worklet_voice
            this.updateMeter(this.controllers[i].voiceMeter, this.synth.midiChannels[i].voicesAmount);
        }
        this.updateMeter(this.volumeController, this.synth.volumeController.gain.value * 100);
    }

    /**
     * @param meter {Meter}
     * @param value {number}
     */
    updateMeter(meter, value)
    {
        const percentage = Math.max(0, Math.min((value - meter.min) / (meter.max - meter.min), 1));
        meter.bar.style.width = `${percentage * 100}%`;
        meter.textElement.innerText = meter.meterText + (Math.round(value * 100) / 100).toString();
    }

    createChannelControllers()
    {
        const dropdownDiv = document.createElement("div");
        dropdownDiv.classList.add("channels_dropdown");

        const title = document.createElement("h4");
        title.innerText = "Synthetizer controller";
        dropdownDiv.appendChild(title);

        this.uiDiv.appendChild(dropdownDiv);
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
                    this.updateMeter(this.controllers[channel].expression, value);
                    break;

                case "Main Volume":
                    // volume
                    this.updateMeter(this.controllers[channel].volume, value);
                    break;

                case "Pan":
                    // pan
                    this.updateMeter(this.controllers[channel].pan, (value - 63) / 64);
                    break;

                case "Brightness":
                    // brightness
                    this.updateMeter(this.controllers[channel].brightness, value);
            }
        }

        this.synth.onPitchWheel = (channel, MSB, LSB) => {
            const val = (MSB << 7) | LSB;
            // pitch wheel
            this.updateMeter(this.controllers[channel].pitchWheel, val - 8192);
        }
    }

    /**
     * @typedef {{
     *     controller: HTMLDivElement,
     *     voiceMeter: Meter,
     *     pitchWheel: Meter,
     *     pan: Meter,
     *     expression: Meter,
     *     brightness: Meter,
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
        const voiceMeter = this.createMeter(this.channelColors[channelNumber],
            "Voices: ",
            0,
            MAX_VOICE_METER);
        voiceMeter.bar.classList.add("voice_meter_bar_smooth");
        controller.appendChild(voiceMeter.div);

        // pitch wheel
        const pitchWheel = this.createMeter(this.channelColors[channelNumber],
            "Pitch Wheel: ",
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
        this.updateMeter(pitchWheel, 0);
        controller.appendChild(pitchWheel.div);

        // pan controller
        const pan = this.createMeter(this.channelColors[channelNumber],
            "Pan: ",
            -1,
            1,
            true,
            val => {
                this.synth.controllerChange(channelNumber, "Pan", (val / 2 + 0.5) * 127);
            });
        this.updateMeter(pan, 0)
        controller.appendChild(pan.div);

        // expression controller
        const expression = this.createMeter(this.channelColors[channelNumber],
            "Expression: ",
            0,
            127,
            true,
            val => {
                this.synth.controllerChange(channelNumber, "Expression Controller", val);
            });
        this.updateMeter(expression, 127);
        controller.appendChild(expression.div);

        // volume controller
        const volume = this.createMeter(this.channelColors[channelNumber],
            "Volume: ",
            0,
            127,
            true,
            val => {
            this.synth.controllerChange(channelNumber, "Main Volume", val);
            });
        this.updateMeter(volume, 127);
        controller.appendChild(volume.div);

        // brightness controller
        const brightness = this.createMeter(this.channelColors[channelNumber],
            "Brightness: ",
            0,
            127,
            true,
            val => {
                this.synth.controllerChange(channelNumber, "Brightness", val);
            });
        this.updateMeter(brightness, 127);
        controller.appendChild(brightness.div);

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
            brightness: brightness,
            preset: presetSelector,
            presetReset: presetReset
        };

    }
}