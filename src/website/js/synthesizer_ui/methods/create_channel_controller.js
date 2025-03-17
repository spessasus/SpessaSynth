/**
 * @typedef {{
 *     controller: HTMLDivElement,
 *     controllerMeters: Object<number, Meter>
 *     voiceMeter: Meter,
 *     pitchWheel: Meter,
 *     transpose: Meter,
 *     preset: Selector,
 *     drumsToggle: HTMLDivElement,
 *     soloButton: HTMLDivElement,
 *     muteButton: HTMLDivElement
 * }} ChannelController
 */

import { Meter } from "./synthui_meter.js";
import { LOCALE_PATH } from "../synthetizer_ui.js";
import { midiControllers } from "../../../../spessasynth_lib/midi_parser/midi_message.js";
import { getDrumsSvg, getEmptyMicSvg, getMicSvg, getMuteSvg, getNoteSvg, getVolumeSvg } from "../../utils/icons.js";
import { DEFAULT_PERCUSSION } from "../../../../spessasynth_lib/synthetizer/synthetizer.js";
import { Selector } from "./synthui_selector.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION
} from "../../../../spessasynth_lib/synthetizer/worklet_system/message_protocol/worklet_message.js";

import { modulatorSources } from "../../../../spessasynth_lib/soundfont/basic_soundfont/modulator.js";
import {
    NON_CC_INDEX_OFFSET
} from "../../../../spessasynth_lib/synthetizer/worklet_system/worklet_utilities/controller_tables.js";

export const ICON_SIZE = 32;

/**
 * Creates a new channel controller js
 * @param channelNumber {number}
 * @returns {ChannelController}
 * @this {SynthetizerUI}
 */
export function createChannelController(channelNumber)
{
    /**
     * @type {Set<number>}
     */
    this.soloChannels = new Set();
    // controller
    const controller = document.createElement("div");
    controller.classList.add("channel_controller");
    
    /**
     * @type {ChannelController}
     */
    const channelController = {};
    channelController.controllerMeters = {};
    channelController.controller = controller;
    
    // voice meter
    const voiceMeter = new Meter(
        this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.voiceMeter",
        this.locale,
        [channelNumber + 1],
        0,
        100,
        0
    );
    voiceMeter.bar.classList.add("voice_meter_bar_smooth");
    controller.appendChild(voiceMeter.div);
    channelController.voiceMeter = voiceMeter;
    
    // pitch wheel
    const pitchWheel = new Meter(
        this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.pitchBendMeter",
        this.locale,
        [channelNumber + 1],
        -8192,
        8191,
        0,
        true,
        val =>
        {
            const meterLocked = pitchWheel.isLocked;
            if (meterLocked)
            {
                this.synth.lockController(
                    channelNumber,
                    NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel,
                    false
                );
            }
            val = Math.round(val) + 8192;
            // get bend values
            const msb = val >> 7;
            const lsb = val & 0x7F;
            this.synth.pitchWheel(channelNumber, msb, lsb);
            if (meterLocked)
            {
                this.synth.lockController(
                    channelNumber,
                    NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel,
                    true
                );
            }
        },
        () => this.synth.lockController(
            channelNumber,
            NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel,
            true
        ),
        () => this.synth.lockController(
            channelNumber,
            NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel,
            false
        )
    );
    controller.appendChild(pitchWheel.div);
    channelController.pitchWheel = pitchWheel;
    
    /**
     * @param cc {number}
     * @param val {number}
     * @param meter {Meter}
     */
    let changeCCUserFunction = (cc, val, meter) =>
    {
        if (meter.isLocked)
        {
            this.synth.lockController(channelNumber, cc, false);
            this.synth.controllerChange(channelNumber, cc, val);
            this.synth.lockController(channelNumber, cc, true);
        }
        else
        {
            this.synth.controllerChange(channelNumber, cc, val);
        }
    };
    
    /**
     * @param ccNum {number}
     * @param localePath {string}
     * @param defaultValue {number}
     * @returns {Meter}
     */
    const createCCMeterHelper = (ccNum, localePath, defaultValue) =>
    {
        const meter = new Meter(
            this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + localePath,
            this.locale,
            [channelNumber + 1],
            0,
            127,
            defaultValue,
            true,
            val => changeCCUserFunction(ccNum, Math.round(val), meter),
            () => this.synth.lockController(channelNumber, ccNum, true),
            () => this.synth.lockController(channelNumber, ccNum, false)
        );
        channelController.controllerMeters[ccNum] = meter;
        return meter;
    };
    
    // pan controller
    const pan = createCCMeterHelper(midiControllers.pan, "channelController.panMeter", 64);
    controller.appendChild(pan.div);
    
    // expression controller
    const expression = createCCMeterHelper(
        midiControllers.expressionController,
        "channelController.expressionMeter",
        127
    );
    controller.appendChild(expression.div);
    
    // volume controller
    const volume = createCCMeterHelper(midiControllers.mainVolume, "channelController.volumeMeter", 100);
    controller.appendChild(volume.div);
    
    // modulation wheel
    const modulation = createCCMeterHelper(
        midiControllers.modulationWheel,
        "channelController.modulationWheelMeter",
        0
    );
    controller.appendChild(modulation.div);
    
    // chorus
    const chorus = createCCMeterHelper(midiControllers.chorusDepth, "channelController.chorusMeter", 0);
    controller.appendChild(chorus.div);
    
    // reverb
    const reverb = createCCMeterHelper(midiControllers.reverbDepth, "channelController.reverbMeter", 0);
    controller.appendChild(reverb.div);
    
    // filter cutoff
    const filterCutoff = createCCMeterHelper(midiControllers.brightness, "channelController.filterMeter", 64);
    controller.appendChild(filterCutoff.div);
    
    // attack time
    const attackTime = createCCMeterHelper(midiControllers.attackTime, "channelController.attackMeter", 64);
    controller.appendChild(attackTime.div);
    
    // release time
    const releaseTime = createCCMeterHelper(midiControllers.releaseTime, "channelController.releaseMeter", 64);
    controller.appendChild(releaseTime.div);
    
    // portamento time
    const portamentoTime = createCCMeterHelper(
        midiControllers.portamentoTime,
        "channelController.portamentoTimeMeter",
        0
    );
    controller.appendChild(portamentoTime.div);
    
    // portamento control
    const portamentoControl = createCCMeterHelper(
        midiControllers.portamentoControl,
        "channelController.portamentoControlMeter",
        60
    );
    controller.appendChild(portamentoControl.div);
    
    // resonance
    const filterResonance = createCCMeterHelper(
        midiControllers.filterResonance,
        "channelController.resonanceMeter",
        64
    );
    controller.appendChild(filterResonance.div);
    
    // transpose is not a cc, add it manually
    const transpose = new Meter(
        this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.transposeMeter",
        this.locale,
        [channelNumber + 1],
        -36,
        36,
        0,
        true,
        val =>
        {
            val = Math.round(val);
            this.synth.transposeChannel(channelNumber, val, true);
            transpose.update(val);
        },
        undefined,
        undefined,
        active =>
        {
            if (active)
            {
                for (let i = channelNumber + 1; i < this.controllers.length; i++)
                {
                    this.controllers[i].controller.classList.add("hidden");
                }
            }
            else
            {
                this.controllers.forEach(c => c.controller.classList.remove("hidden"));
            }
        }
    );
    controller.appendChild(transpose.div);
    channelController.transpose = transpose;
    
    // preset controller
    const presetSelector = new Selector(
        ([]), // empty for now
        this.locale,
        LOCALE_PATH + "channelController.presetSelector",
        [channelNumber + 1],
        async presetName =>
        {
            const data = presetName.split(":");
            this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, false);
            this.synth.controllerChange(channelNumber, midiControllers.bankSelect, parseInt(data[0]), true);
            this.synth.programChange(channelNumber, parseInt(data[1]), true);
            presetSelector.mainButton.classList.add("locked_selector");
            this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, true);
        },
        locked => this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, locked)
    );
    controller.appendChild(presetSelector.mainButton);
    channelController.preset = presetSelector;
    
    // solo button
    const soloButton = document.createElement("div");
    soloButton.innerHTML = getEmptyMicSvg(ICON_SIZE);
    this.locale.bindObjectProperty(
        soloButton,
        "title",
        LOCALE_PATH + "channelController.soloButton.description",
        [channelNumber + 1]
    );
    soloButton.classList.add("controller_element");
    soloButton.classList.add("mute_button");
    soloButton.onclick = () =>
    {
        // toggle solo
        if (this.soloChannels.has(channelNumber))
        {
            this.soloChannels.delete(channelNumber);
        }
        else
        {
            this.soloChannels.add(channelNumber);
        }
        if (this.soloChannels.size === 0 || this.soloChannels.size >= this.synth.channelsAmount)
        {
            // no channels or all channels are soloed, unmute everything
            for (let i = 0; i < this.synth.channelsAmount; i++)
            {
                this.controllers[i].soloButton.innerHTML = getEmptyMicSvg(ICON_SIZE);
                this.synth.muteChannel(i, this.controllers[i].muteButton.hasAttribute("is_muted"));
            }
            if (this.soloChannels.size >= this.synth.channelsAmount)
            {
                // all channels are soloed, return to normal
                this.soloChannels.clear();
            }
            return;
        }
        // unmute every solo channel and mute others
        for (let i = 0; i < this.synth.channelsAmount; i++)
        {
            if (this.soloChannels.has(i))
            {
                this.controllers[i].soloButton.innerHTML = getMicSvg(ICON_SIZE);
                this.synth.muteChannel(i, this.controllers[i].muteButton.hasAttribute("is_muted"));
            }
            else
            {
                this.controllers[i].soloButton.innerHTML = getEmptyMicSvg(ICON_SIZE);
                this.synth.muteChannel(i, true);
            }
        }
    };
    controller.appendChild(soloButton);
    channelController.soloButton = soloButton;
    
    // mute button
    const muteButton = document.createElement("div");
    muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
    this.locale.bindObjectProperty(
        muteButton,
        "title",
        LOCALE_PATH + "channelController.muteButton.description",
        [channelNumber + 1]
    );
    muteButton.classList.add("controller_element");
    muteButton.classList.add("mute_button");
    muteButton.onclick = () =>
    {
        if (muteButton.hasAttribute("is_muted"))
        {
            // unmute
            muteButton.removeAttribute("is_muted");
            const canBeUnmuted = this.soloChannels.size === 0 || this.soloChannels.has(channelNumber);
            this.synth.muteChannel(channelNumber, !canBeUnmuted);
            muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
            
        }
        else
        {
            // mute
            this.synth.muteChannel(channelNumber, true);
            muteButton.setAttribute("is_muted", "true");
            muteButton.innerHTML = getMuteSvg(ICON_SIZE);
        }
    };
    controller.appendChild(muteButton);
    channelController.muteButton = muteButton;
    
    // drums toggle
    const drumsToggle = document.createElement("div");
    drumsToggle.innerHTML = channelNumber === DEFAULT_PERCUSSION ? getDrumsSvg(ICON_SIZE) : getNoteSvg(ICON_SIZE);
    this.locale.bindObjectProperty(
        drumsToggle,
        "title",
        LOCALE_PATH + "channelController.drumToggleButton.description",
        [channelNumber + 1]
    );
    drumsToggle.classList.add("controller_element");
    drumsToggle.classList.add("mute_button");
    drumsToggle.onclick = () =>
    {
        if (presetSelector.mainButton.classList.contains("locked_selector"))
        {
            this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, false);
            presetSelector.mainButton.classList.remove("locked_selector");
        }
        this.synth.setDrums(channelNumber, !this.synth.channelProperties[channelNumber].isDrum);
    };
    controller.appendChild(drumsToggle);
    channelController.drumsToggle = drumsToggle;
    
    return channelController;
    
}

/**
 * @this {SynthetizerUI}
 */
export function createChannelControllers()
{
    const dropdownDiv = this.uiDiv.getElementsByClassName("synthui_controller")[0];
    
    /**
     * @type {ChannelController[]}
     */
    this.controllers = [];
    for (let i = 0; i < this.synth.channelsAmount; i++)
    {
        const controller = this.createChannelController(i);
        this.controllers.push(controller);
        dropdownDiv.appendChild(controller.controller);
    }
    
    this.setEventListeners();
    
    setInterval(this.updateVoicesAmount.bind(this), 100);
    this.hideControllers();
}