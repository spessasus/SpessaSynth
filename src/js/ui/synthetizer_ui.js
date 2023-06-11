import {Synthetizer} from "../midi_player/synthetizer/synthetizer.js";
import {MidiChannel} from "../midi_player/synthetizer/midi_channel.js";

/**
 * @typedef {{div: HTMLDivElement,
 * bar: HTMLDivElement,
 * text: HTMLParagraphElement,
 * meterText: string,
 * max: number,
 * min: number}} Meter
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
     * @param color {string} the color
     * @param width {string} width of the meter as css
     * @param meterText {string}
     * @param max {number}
     * @param min {number}
     * @param editable {boolean} if the meter should be editable with mouse
     * @param editCallback {MeterCallbackFunction}
     * @returns {Meter}
     */
    createMeter(color = "initial",
                width = "initial",
                meterText="Voices: ",
                min = 0,
                max = 100,
                editable=false,
                editCallback = undefined)
    {
        const mainDiv = document.createElement("div");
        mainDiv.classList.add("voice_meter");
        mainDiv.style.width = width;
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
                const relativeLeft = e.currentTarget.getBoundingClientRect().left;
                const relative = e.clientX - relativeLeft;
                const percentage = relative / relativeLeft;
                console.log(relative, relativeLeft)
                editCallback(percentage * (max - min) + min);
            };
            mainDiv.classList.add("editable");
        }

        return {
            div: mainDiv,
            bar: bar,
            text: text,
            meterText: meterText,
            max: max,
            min: min
        };
    }

    createMainVoiceMeter()
    {
        this.voiceMeter = this.createMeter("#206", "initial", "Voices: ", 0, MAX_VOICE_METER);

        setInterval(this.updateData.bind(this));

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
        meter.text.innerText = meter.meterText + (Math.round(value * 100) / 100).toString();
    }

    createChannelControllers()
    {
        const dropdownDiv = document.createElement("div");
        dropdownDiv.classList.add("channels_dropdown");
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
     *     pan: Meter
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
            "30%",
            "Voices: ",
            0,
            MAX_VOICE_METER);
        controller.appendChild(voiceMeter.div);

        const pitchWheel = this.createMeter(this.channelColors[channelNumber],
            "30%",
            "Pitch Wheel: ",
            -8192,
            8192,
            true,
            val => {
                console.log(val)});

        controller.appendChild(pitchWheel.div);

        const pan = this.createMeter(this.channelColors[channelNumber],
            "30%",
            "Pan: ",
            -1,
            1);
        controller.appendChild(pan.div);


        return {
            controller: controller,
            voiceMeter: voiceMeter,
            pitchWheel: pitchWheel,
            pan: pan
        };

    }
}