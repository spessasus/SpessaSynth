import {Synthetizer} from "../midi_player/synthetizer/synthetizer.js";
import {MidiChannel} from "../midi_player/synthetizer/midi_channel.js";

/**
 * @typedef {{div: HTMLDivElement, bar: HTMLDivElement, text: HTMLParagraphElement}} VoiceMeter
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
     * Creates a new meter
     * @param color {string} the color
     * @returns {VoiceMeter}
     */
    createMeter(color = "initial")
    {
        const mainDiv = document.createElement("div");
        mainDiv.classList.add("voice_meter");
        const bar = document.createElement("div");
        bar.classList.add("voice_meter_bar");
        bar.style.background = color;
        mainDiv.appendChild(bar);

        const text = document.createElement("p");
        text.classList.add("voice_meter_text");
        mainDiv.appendChild(text);

        return {
          div: mainDiv,
          bar: bar,
          text: text
        };
    }

    createMainVoiceMeter()
    {
        this.voiceMeter = this.createMeter("#206");

        setInterval(this.updateData.bind(this), 100);

        this.uiDiv.appendChild(this.voiceMeter.div);

        const desc = document.createElement("label");
        desc.innerText = "High performance mode:";

        const highPerfToggle = document.createElement("input");
        highPerfToggle.type = "checkbox";
        highPerfToggle.onchange = () => {
            this.synth.highPerformanceMode = highPerfToggle.checked;
        }

        desc.appendChild(highPerfToggle);
        this.uiDiv.appendChild(desc);
    }

    updateData()
    {
        this.updateVoiceMeter(this.voiceMeter, this.synth.voicesAmount);

        for(let i = 0; i < this.controllers.length; i++)
        {
            this.updateVoiceMeter(this.controllers[i].voiceMeter, this.synth.midiChannels[i].voicesAmount);
        }
    }

    /**
     * @param meter {VoiceMeter}
     * @param voices {number}
     */
    updateVoiceMeter(meter, voices)
    {
        const percentage = Math.min(voices / MAX_VOICE_METER, 1);
        meter.bar.style.width = `${percentage * 100}%`;
        meter.text.innerText = `Voices: ${voices}`;
    }

    createChannelControllers()
    {
        const dropdownDiv = document.createElement("div");
        dropdownDiv.classList.add("channels_dropdown");
        this.uiDiv.appendChild(dropdownDiv);
        /**
         * @type {{
         *     controller: HTMLDivElement,
         *     voiceMeter: VoiceMeter
         * }[]}
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
     * Creates a new channel controller ui
     * @param channel {MidiChannel}
     * @param channelNumber {string}
     * @returns {{
     *     controller: HTMLDivElement,
     *     voiceMeter: VoiceMeter
     * }}
     */
    createChannelController(channel, channelNumber)
    {
        const controller = document.createElement("div");
        controller.classList.add("channel_controller");
        const voiceMeter = this.createMeter(this.channelColors[channelNumber]);
        controller.appendChild(voiceMeter.div);

        const instrumentPreset = document.createElement("select");


        return {
            controller: controller,
            voiceMeter: voiceMeter
        };

    }
}