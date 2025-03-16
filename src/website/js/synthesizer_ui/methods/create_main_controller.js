import { Meter } from "./synthui_meter.js";
import { VOICE_CAP } from "../../../../spessasynth_lib/synthetizer/synthetizer.js";
import { LOCALE_PATH } from "../synthetizer_ui.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION
} from "../../../../spessasynth_lib/synthetizer/worklet_system/message_protocol/worklet_message.js";
import { getEmptyMicSvg, getVolumeSvg } from "../../utils/icons.js";
import { ICON_SIZE } from "./create_channel_controller.js";
import { closeNotification } from "../../notification/notification.js";
import { showAdvancedConfiguration } from "./advanced_configuration.js";

/**
 * @this {SynthetizerUI}
 */
export function createMainSynthController()
{
    // control wrapper
    let controlsWrapper = document.createElement("div");
    controlsWrapper.classList.add("controls_wrapper");
    
    /**
     * Voice meter
     * @type {Meter}
     */
    this.voiceMeter = new Meter(
        "",
        LOCALE_PATH + "mainVoiceMeter",
        this.locale,
        [],
        0,
        VOICE_CAP,
        0
    );
    this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");
    this.voiceMeter.div.classList.add("main_controller_element");
    
    /**
     * Volume controller
     * @type {Meter}
     */
    this.volumeController = new Meter(
        "",
        LOCALE_PATH + "mainVolumeMeter",
        this.locale,
        [],
        0,
        200,
        100,
        true,
        v =>
        {
            this.synth.setMainVolume(Math.round(v) / 100);
            this.volumeController.update(v);
        }
    );
    this.volumeController.bar.classList.add("voice_meter_bar_smooth");
    this.volumeController.div.classList.add("main_controller_element");
    
    /**
     * Pan controller
     * @type {Meter}
     */
    this.panController = new Meter(
        "",
        LOCALE_PATH + "mainPanMeter",
        this.locale,
        [],
        -1,
        1,
        0,
        true,
        v =>
        {
            // use roland gs master pan
            this.synth.setMasterPan(v);
            this.panController.update(v);
        }
    );
    this.panController.bar.classList.add("voice_meter_bar_smooth");
    this.panController.div.classList.add("main_controller_element");
    
    /**
     * Transpose controller
     * @type {Meter}
     */
    this.transposeController = new Meter(
        "",
        LOCALE_PATH + "mainTransposeMeter",
        this.locale,
        [],
        -12,
        12,
        0,
        true,
        v =>
        {
            // limit to half semitone precision
            this.synth.transpose(Math.round(v * 2) / 2);
            this.transposeController.update(Math.round(v * 2) / 2);
        }
    );
    this.transposeController.bar.classList.add("voice_meter_bar_smooth");
    this.transposeController.div.classList.add("main_controller_element");
    
    // note killer
    let midiPanicButton = document.createElement("button");
    this.locale.bindObjectProperty(midiPanicButton, "textContent", LOCALE_PATH + "midiPanic.title");
    this.locale.bindObjectProperty(midiPanicButton, "title", LOCALE_PATH + "midiPanic.description");
    
    midiPanicButton.classList.add("synthui_button");
    midiPanicButton.classList.add("main_controller_element");
    midiPanicButton.onclick = () => this.synth.stopAll(true);
    
    // system reset button
    let resetCCButton = document.createElement("button");
    this.locale.bindObjectProperty(resetCCButton, "textContent", LOCALE_PATH + "systemReset.title");
    this.locale.bindObjectProperty(resetCCButton, "title", LOCALE_PATH + "systemReset.description");
    
    resetCCButton.classList.add("synthui_button");
    resetCCButton.classList.add("main_controller_element");
    resetCCButton.onclick = () =>
    {
        // unlock everything
        this.controllers.forEach((channel, number) =>
        {
            if (channel.pitchWheel.isLocked)
            {
                channel.pitchWheel.lockMeter();
            }
            // CCs
            for (const meter of Object.values(channel.controllerMeters))
            {
                if (meter.isLocked)
                {
                    meter.lockMeter();
                }
            }
            // program
            if (channel.preset.mainButton.classList.contains("locked_selector"))
            {
                this.synth.lockController(number, ALL_CHANNELS_OR_DIFFERENT_ACTION, false);
                channel.preset.mainButton.classList.remove("locked_selector");
            }
            // transpose
            this.synth.transposeChannel(number, 0, true);
            channel.transpose.update(0);
            
            // mute/solo
            channel.soloButton.innerHTML = getEmptyMicSvg(ICON_SIZE);
            channel.muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
            this.synth.muteChannel(number, false);
            
        });
        this.synth.resetControllers();
    };
    
    // advanced config
    const advancedConfigurationButton = document.createElement("button");
    this.locale.bindObjectProperty(
        advancedConfigurationButton,
        "textContent",
        LOCALE_PATH + "advancedConfiguration.title"
    );
    this.locale.bindObjectProperty(
        advancedConfigurationButton,
        "title",
        LOCALE_PATH + "advancedConfiguration.description"
    );
    advancedConfigurationButton.classList.add("synthui_button");
    advancedConfigurationButton.classList.add("main_controller_element");
    advancedConfigurationButton.onclick = showAdvancedConfiguration.bind(this);
    
    
    // shown CC group selector
    const groupSelector = document.createElement("select");
    groupSelector.classList.add("synthui_button");
    groupSelector.classList.add("main_controller_element");
    this.locale.bindObjectProperty(groupSelector, "title", LOCALE_PATH + "channelController.groupSelector.description");
    // create all the options
    for (const option of [
        "effects",
        "volumeEnvelope",
        "filter",
        "portamento"
    ])
    {
        const optionElement = document.createElement("option");
        optionElement.value = option;
        this.locale.bindObjectProperty(
            optionElement,
            "textContent",
            LOCALE_PATH + "channelController.groupSelector." + option
        );
        groupSelector.appendChild(optionElement);
    }
    
    
    groupSelector.onchange = () =>
    {
        this.showControllerGroup(groupSelector.value);
    };
    
    /**
     * interpolation type
     * @type {HTMLSelectElement}
     */
    const interpolation = document.createElement("select");
    interpolation.classList.add("main_controller_element");
    interpolation.classList.add("synthui_button");
    this.locale.bindObjectProperty(interpolation, "title", LOCALE_PATH + "interpolation.description");
    
    // interpolation types
    {
        /**
         * linear (default)
         * @type {HTMLOptionElement}
         */
        const linear = document.createElement("option");
        linear.value = "0";
        this.locale.bindObjectProperty(linear, "textContent", LOCALE_PATH + "interpolation.linear");
        interpolation.appendChild(linear);
        
        /**
         * nearest neighbor
         * @type {HTMLOptionElement}
         */
        const nearest = document.createElement("option");
        nearest.value = "1";
        this.locale.bindObjectProperty(nearest, "textContent", LOCALE_PATH + "interpolation.nearestNeighbor");
        interpolation.appendChild(nearest);
        
        /**
         * cubic (default)
         * @type {HTMLOptionElement}
         */
        const cubic = document.createElement("option");
        cubic.value = "2";
        cubic.selected = true;
        this.locale.bindObjectProperty(cubic, "textContent", LOCALE_PATH + "interpolation.cubic");
        interpolation.appendChild(cubic);
        
        interpolation.onchange = () =>
        {
            this.synth.setInterpolationType(parseInt(interpolation.value));
        };
    }
    
    // main controller
    let controller = document.createElement("div");
    controller.classList.add("synthui_controller");
    this.uiDiv.appendChild(controller);
    
    // channel controller shower
    let showControllerButton = document.createElement("button");
    this.locale.bindObjectProperty(showControllerButton, "textContent", LOCALE_PATH + "toggleButton.title");
    this.locale.bindObjectProperty(showControllerButton, "title", LOCALE_PATH + "toggleButton.description");
    showControllerButton.classList.add("synthui_button");
    showControllerButton.onclick = () =>
    {
        this.hideOnDocClick = false;
        this.toggleVisibility();
    };
    
    // meters
    controlsWrapper.appendChild(this.volumeController.div);
    controlsWrapper.appendChild(this.panController.div);
    controlsWrapper.appendChild(this.transposeController.div);
    // buttons
    controlsWrapper.appendChild(midiPanicButton);
    controlsWrapper.appendChild(resetCCButton);
    controlsWrapper.appendChild(advancedConfigurationButton);
    controlsWrapper.appendChild(groupSelector);
    controlsWrapper.appendChild(interpolation);
    
    /**
     * @type {Meter[]}
     */
    this.mainMeters = [
        this.volumeController,
        this.panController,
        this.transposeController,
        this.voiceMeter
    ];
    /**
     * @type {HTMLElement[]}
     */
    this.mainButtons = [
        midiPanicButton,
        resetCCButton,
        advancedConfigurationButton,
        showControllerButton,
        interpolation
    ];
    // main synth div
    this.uiDiv.appendChild(this.voiceMeter.div);
    this.uiDiv.appendChild(showControllerButton);
    controller.appendChild(controlsWrapper);
    this.mainControllerDiv = controller;
    // stop propagation to not hide
    this.mainControllerDiv.onclick = e => e.stopPropagation();
    // hide if clicked outside
    document.addEventListener("click", () =>
    {
        if (!this.hideOnDocClick)
        {
            this.hideOnDocClick = true;
            return;
        }
        if (this.effectsConfigWindow !== undefined)
        {
            closeNotification(this.effectsConfigWindow);
            this.effectsConfigWindow = undefined;
        }
        controller.classList.remove("synthui_controller_show");
        this.isShown = false;
        this.hideControllers();
    });
}