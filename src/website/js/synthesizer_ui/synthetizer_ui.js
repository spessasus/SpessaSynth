import {
    Synthetizer,
    VOICE_CAP,
} from '../../../spessasynth_lib/synthetizer/synthetizer.js'
import { getDrumsSvg, getNoteSvg } from '../icons.js'
import { Meter } from './methods/synthui_meter.js'
import { midiControllers } from '../../../spessasynth_lib/midi_parser/midi_message.js'
import { hideControllers, showControllers } from './methods/hide_show_controllers.js'
import { toggleDarkMode } from './methods/toggle_dark_mode.js'
import { createChannelController, createChannelControllers } from './methods/create_channel_controller.js'
import { createMainSynthController } from './methods/create_main_controller.js'
import { setEventListeners } from './methods/set_event_listeners.js'


export const LOCALE_PATH = "locale.synthesizerController.";
/**
 * synthesizer_ui.js
 * purpose: manages the graphical user interface for the synthesizer
 */

class SynthetizerUI
{
    /**
     * Creates a new instance of synthetizer UI
     * @param colors {string[]}
     * @param element {HTMLElement} the element to create synthui in
     * @param localeManager {LocaleManager}
     */
    constructor(colors, element, localeManager) {
        this.channelColors = colors;
        const wrapper = element;
        this.uiDiv = document.createElement("div");
        this.uiDiv.classList.add("wrapper");
        wrapper.appendChild(this.uiDiv);
        this.uiDiv.style.visibility = "visible";
        this.isShown = false;
        this.locale = localeManager;

        this.hideOnDocClick = true;
    }

    /**
     * Connects the synth to UI
     * @param synth {Synthetizer}
     */
    connectSynth(synth)
    {
        this.synth = synth;

        this.getInstrumentList();

        this.createMainSynthController();
        this.createChannelControllers();

        document.addEventListener("keydown", e => {
            switch (e.key.toLowerCase())
            {
                case "s":
                    e.preventDefault();
                    const controller = this.uiDiv.getElementsByClassName("synthui_controller")[0];
                    controller.classList.toggle("synthui_controller_show");
                    controller.getElementsByClassName("controls_wrapper")[0].classList.toggle("controls_wrapper_show");
                    this.isShown = !this.isShown;
                    if(this.isShown)
                    {
                        this.showControllers();
                    }
                    else
                    {
                        this.hideControllers()
                    }
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

        // add event listener for locale change
        this.locale.onLocaleChanged.push(() => {
            // reload all meters
            // global meters
            this.voiceMeter.update(this.voiceMeter.currentValue, true);
            this.volumeController.update(this.volumeController.currentValue, true);
            this.panController.update(this.panController.currentValue, true);
            this.panController.update(this.panController.currentValue, true);
            this.transposeController.update(this.transposeController.currentValue, true);
            // channel controller meters
            for(const controller of this.controllers)
            {
                controller.voiceMeter.update(controller.voiceMeter.currentValue, true);
                controller.pitchWheel.update(controller.pitchWheel.currentValue, true);
                controller.pan.update(controller.pan.currentValue, true);
                controller.volume.update(controller.volume.currentValue, true);
                controller.expression.update(controller.expression.currentValue, true);
                controller.mod.update(controller.mod.currentValue, true);
                controller.chorus.update(controller.chorus.currentValue, true);
                controller.reverb.update(controller.reverb.currentValue, true);
                controller.transpose.update(controller.transpose.currentValue, true);
            }
        })
    }

    updateVoicesAmount()
    {
        this.voiceMeter.update(this.synth.voicesAmount);

        this.controllers.forEach((controller, i) => {
            // update channel
            let voices = this.synth.channelProperties[i].voicesAmount;
            controller.voiceMeter.update(voices);
            if(voices < 1 && this.synth.voicesAmount > 0)
            {
                controller.controller.classList.add("no_voices");
            }
            else
            {
                controller.controller.classList.remove("no_voices");
            }
        });
    }

    getInstrumentList()
    {
        this.synth.eventHandler.addEvent("presetlistchange", "synthui-preset-list-change", e => {
            /**
             * @type {PresetListElement[]}
             */
            const presetList = e;
            /**
             * @type {{name: string, program: number, bank: number}[]}
             */
            this.instrumentList = presetList.filter(p => p.bank !== 128)
                .sort((a, b) => {
                    if(a.program === b.program)
                    {
                        return a.bank - b.bank;
                    }
                    return a.program - b.program;
                })
                .map(p => {
                    return {
                        name: p.presetName,
                        bank: p.bank,
                        program: p.program
                    };
                });

            /**
             * @type {{name: string, program: number, bank: number}[]}
             */
            this.percussionList = presetList.filter(p => p.bank === 128)
                .sort((a, b) => a.program - b.program)
                .map(p => {
                    return {
                        name: p.presetName,
                        bank: p.bank,
                        program: p.program
                    };
                });

            if(this.percussionList.length === 0)
            {
                this.percussionList.push(this.instrumentList[0])
            }

            this.controllers.forEach((controller, i) => {
                const list = this.synth.channelProperties[i].isDrum ? this.percussionList : this.instrumentList;
                controller.preset.reload(list);
                controller.preset.set(JSON.stringify([list[0].bank, list[0].program]))
            });
        });
    }
}

SynthetizerUI.prototype.hideControllers = hideControllers;
SynthetizerUI.prototype.showControllers = showControllers;
SynthetizerUI.prototype.toggleDarkMode = toggleDarkMode;

SynthetizerUI.prototype.createChannelController = createChannelController;
SynthetizerUI.prototype.createChannelControllers = createChannelControllers;
SynthetizerUI.prototype.createMainSynthController = createMainSynthController;

SynthetizerUI.prototype.setEventListeners = setEventListeners;

export { SynthetizerUI }