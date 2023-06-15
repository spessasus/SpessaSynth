import {Synthetizer} from "../midi_player/synthetizer/synthetizer.js";
import {MidiChannel} from "../midi_player/synthetizer/midi_channel.js";

/**
 * @typedef {{div: HTMLDivElement,
 * bar: HTMLDivElement,
 * textElement: HTMLParagraphElement,
 * meterText: string,
 * max: number,
 * min: number}} Meter
 *
 * @typedef {{
 *     div: HTMLDivElement,
 *     options: HTMLDivElement
 * }} Selector
 */

const MAX_VOICE_METER = 200;
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
    }

    /**
     * Connects the synth to UI
     * @param synth {Synthetizer}
     */
    connectSynth(synth)
    {
        this.synth = synth;
        this.createMainVoiceMeter();
        this.createChannelControllers();

        // reset button
        let resetButton = document.getElementById("note_killer");
        resetButton.style.display = "block";
        resetButton.onclick = () => synth.stopAll();
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
     * @param elements {{text: string, value: string}[]}
     * @param editCallback {function(string)}
     * @returns {Selector}
     */
    createSelector(elements,
                   editCallback)
    {
        const mainDiv = document.createElement("div");
        mainDiv.innerHTML = elements[0].text + "  &#9660;";
        mainDiv.classList.add("voice_selector");

        const optionsDiv = document.createElement("div");
        optionsDiv.classList.add("selector_options");
        optionsDiv.innerText = "aaa";
        mainDiv.appendChild(optionsDiv);

        return {
            div: mainDiv,
            options: optionsDiv
        };
    }

    createMainVoiceMeter()
    {
        this.voiceMeter = this.createMeter("#206", "Voices: ", 0, MAX_VOICE_METER);

        setInterval(this.updateData.bind(this), 100);

        this.uiDiv.appendChild(this.voiceMeter.div);

        const desc = document.createElement("label");
        desc.innerText = "High performance mode:";

        const highPerfToggle = document.createElement("input");
        highPerfToggle.type = "checkbox";
        highPerfToggle.onchange = () => {
            this.synth.highPerformanceMode = highPerfToggle.checked;
        }

        this.synth.onHighToggle = status => highPerfToggle.checked = status;

        desc.appendChild(highPerfToggle);
        this.uiDiv.appendChild(desc);
    }

    updateData()
    {
        this.updateMeter(this.voiceMeter, this.synth.voicesAmount);

        for(let i = 0; i < this.controllers.length; i++)
        {
            // voice
            this.updateMeter(this.controllers[i].voiceMeter, this.synth.midiChannels[i].voicesAmount);

            // pitch wheel
            this.updateMeter(this.controllers[i].pitchWheel, this.synth.midiChannels[i].pitchBend)

            // pan
            this.updateMeter(this.controllers[i].pan, this.synth.midiChannels[i].panner.pan.value);

            // expression
            this.updateMeter(this.controllers[i].expression, this.synth.midiChannels[i].channelExpression * 127);

            // volume
            this.updateMeter(this.controllers[i].volume, this.synth.midiChannels[i].channelVolume * 127);
        }
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
        this.instrumentList = soundFontParser.presets.filter(p => p.bank !== 128).map(p => {
            return {text: p.presetName, value: p.presetName};
        });

        this.percussionList = soundFontParser.presets.filter(p => p.bank === 128).map(p => {
            return {text: p.presetName, value: p.presetName};
        });

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

    }

    /**
     * @typedef {{
     *     controller: HTMLDivElement,
     *     voiceMeter: Meter,
     *     pitchWheel: Meter,
     *     pan: Meter,
     *     expression: Meter
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
        const controller = document.createElement("div");
        controller.classList.add("channel_controller");
        const voiceMeter = this.createMeter(this.channelColors[channelNumber],
            "Voices: ",
            0,
            MAX_VOICE_METER);
        controller.appendChild(voiceMeter.div);

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
                this.synth.midiChannels[channelNumber].setPitchBend(msb, lsb);
        });
        controller.appendChild(pitchWheel.div);

        const pan = this.createMeter(this.channelColors[channelNumber],
            "Pan: ",
            -1,
            1,
            true,
            val => {
                this.synth.midiChannels[channelNumber].setPan(val);
            });
        controller.appendChild(pan.div);

        const expression = this.createMeter(this.channelColors[channelNumber],
            "Expression: ",
            0,
            127,
            true,
            val => {
                this.synth.midiChannels[channelNumber].setExpression(val / 127);
            });
        controller.appendChild(expression.div);

        const volume = this.createMeter(this.channelColors[channelNumber],
            "Volume: ",
            0,
            127,
            true,
            val => {
            this.synth.midiChannels[channelNumber].setVolume(val);
            });
        controller.appendChild(volume.div);

        //const instrument = this.createSelector(this.instrumentList);
        //controller.appendChild(instrument.div);


        return {
            controller: controller,
            voiceMeter: voiceMeter,
            pitchWheel: pitchWheel,
            pan: pan,
            expression: expression,
            volume: volume
        };

    }
}