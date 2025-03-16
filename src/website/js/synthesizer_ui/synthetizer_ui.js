import { Synthetizer } from "../../../spessasynth_lib/synthetizer/synthetizer.js";
import { hideControllers, showControllers } from "./methods/hide_show_controllers.js";
import { toggleDarkMode } from "./methods/toggle_dark_mode.js";
import { createChannelController, createChannelControllers } from "./methods/create_channel_controller.js";
import { createMainSynthController } from "./methods/create_main_controller.js";
import { setEventListeners } from "./methods/set_event_listeners.js";
import { keybinds } from "../utils/keybinds.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { closeNotification } from "../notification/notification.js";


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
    constructor(colors, element, localeManager)
    {
        this.channelColors = colors;
        const wrapper = element;
        this.uiDiv = document.createElement("div");
        this.uiDiv.classList.add("wrapper");
        wrapper.appendChild(this.uiDiv);
        this.uiDiv.style.visibility = "visible";
        this.isShown = false;
        this.animationId = -1;
        this.locale = localeManager;
        this.hideOnDocClick = true;
        /**
         * For closing the effect window when closing the synthui
         * @type {undefined|number}
         */
        this.effectsConfigWindow = undefined;
    }
    
    /**
     * @param keyboard {MidiKeyboard}
     */
    connectKeyboard(keyboard)
    {
        this.keyboard = keyboard;
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
        
        document.addEventListener("keydown", e =>
        {
            switch (e.key.toLowerCase())
            {
                case keybinds.synthesizerUIShow:
                    e.preventDefault();
                    this.toggleVisibility();
                    break;
                
                //
                case keybinds.settingsShow:
                    this.isShown = true;
                    this.toggleVisibility();
                    break;
                
                case keybinds.blackMidiMode:
                    e.preventDefault();
                    this.synth.highPerformanceMode = !this.synth.highPerformanceMode;
                    break;
                
                case keybinds.midiPanic:
                    e.preventDefault();
                    this.synth.stopAll(true);
                    break;
            }
        });
        
        // add event listener for locale change
        this.locale.onLocaleChanged.push(() =>
        {
            // reload all meters
            // global meters
            this.voiceMeter.update(this.voiceMeter.currentValue, true);
            this.volumeController.update(this.volumeController.currentValue, true);
            this.panController.update(this.panController.currentValue, true);
            this.panController.update(this.panController.currentValue, true);
            this.transposeController.update(
                this.transposeController.currentValue,
                true
            );
            // channel controller meters
            for (const controller of this.controllers)
            {
                controller.voiceMeter.update(controller.voiceMeter.currentValue, true);
                controller.pitchWheel.update(controller.pitchWheel.currentValue, true);
                for (const meter of Object.values(controller.controllerMeters))
                {
                    meter.update(meter.currentValue, true);
                }
                controller.transpose.update(controller.transpose.currentValue, true);
            }
        });
    }
    
    toggleVisibility()
    {
        if (this.animationId !== -1)
        {
            clearTimeout(this.animationId);
        }
        const controller = document.getElementsByClassName("synthui_controller")[0];
        this.isShown = !this.isShown;
        if (this.isShown)
        {
            controller.style.display = "block";
            document.getElementsByClassName("top_part")[0].classList.add("synthui_shown");
            this.showControllers();
            
            setTimeout(() =>
            {
                controller.classList.add("synthui_controller_show");
            }, ANIMATION_REFLOW_TIME);
        }
        else
        {
            if (this.effectsConfigWindow !== undefined)
            {
                closeNotification(this.effectsConfigWindow);
                this.effectsConfigWindow = undefined;
            }
            document.getElementsByClassName("top_part")[0].classList.remove("synthui_shown");
            this.hideControllers();
            controller.classList.remove("synthui_controller_show");
            this.animationId = setTimeout(() =>
            {
                controller.style.display = "none";
            }, 200);
        }
    }
    
    updateVoicesAmount()
    {
        this.voiceMeter.update(this.synth.voicesAmount);
        
        this.controllers.forEach((controller, i) =>
        {
            // update channel
            let voices = this.synth.channelProperties[i].voicesAmount;
            controller.voiceMeter.update(voices);
            if (voices < 1 && this.synth.voicesAmount > 0)
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
        this.synth.eventHandler.addEvent("presetlistchange", "synthui-preset-list-change", e =>
        {
            /**
             * @type {PresetListElement[]}
             */
            const presetList = e;
            /**
             * @type {PresetListElement[]}
             */
            this.presetList = presetList;
            /**
             * @type {{name: string, program: number, bank: number}[]}
             */
            this.instrumentList = presetList.filter(p => p.bank !== 128)
                .sort((a, b) =>
                {
                    if (a.program === b.program)
                    {
                        return a.bank - b.bank;
                    }
                    return a.program - b.program;
                })
                .map(p =>
                {
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
                .map(p =>
                {
                    return {
                        name: p.presetName,
                        bank: p.bank,
                        program: p.program
                    };
                });
            
            if (this.percussionList.length === 0)
            {
                this.percussionList = this.instrumentList;
            }
            else if (this.instrumentList.length === 0)
            {
                this.instrumentList = this.percussionList;
            }
            
            this.controllers.forEach((controller, i) =>
            {
                const list = this.synth.channelProperties[i].isDrum ? this.percussionList : this.instrumentList;
                controller.preset.reload(list);
                controller.preset.set(`${list[0].bank}:${list[0].program}`);
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

export { SynthetizerUI };