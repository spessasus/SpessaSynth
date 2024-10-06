/**
 * @typedef {{
 *     controller: HTMLDivElement,
 *     voiceMeter: Meter,
 *     pitchWheel: Meter,
 *     pan: Meter,
 *     expression: Meter,
 *     volume: Meter,
 *     mod: Meter,
 *     chorus: Meter,
 *     reverb: Meter,
 *     brightness: Meter,
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
import {
    NON_CC_INDEX_OFFSET
} from "../../../../spessasynth_lib/synthetizer/worklet_system/worklet_utilities/worklet_processor_channel.js";

import { modulatorSources } from "../../../../spessasynth_lib/soundfont/basic_soundfont/modulator.js";

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
    
    // voice meter
    const voiceMeter = new Meter(
        this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.voiceMeter",
        this.locale,
        [channelNumber + 1],
        0,
        100
    );
    voiceMeter.bar.classList.add("voice_meter_bar_smooth");
    controller.appendChild(voiceMeter.div);
    
    // pitch wheel
    const pitchWheel = new Meter(
        this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.pitchBendMeter",
        this.locale,
        [channelNumber + 1],
        -8192,
        8191,
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
    pitchWheel.update(0);
    controller.appendChild(pitchWheel.div);
    
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
            true,
            val => changeCCUserFunction(ccNum, Math.round(val), meter),
            () => this.synth.lockController(channelNumber, ccNum, true),
            () => this.synth.lockController(channelNumber, ccNum, false)
        );
        meter.update(defaultValue);
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
    const chorus = createCCMeterHelper(midiControllers.effects3Depth, "channelController.chorusMeter", 0);
    controller.appendChild(chorus.div);
    
    // reverb
    const reverb = createCCMeterHelper(midiControllers.effects1Depth, "channelController.reverbMeter", 0);
    controller.appendChild(reverb.div);
    
    // brightness
    const brightness = createCCMeterHelper(midiControllers.brightness, "channelController.filterMeter", 64);
    controller.appendChild(brightness.div);
    
    // transpose is not a cc, add it manually
    const transpose = new Meter(
        this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.transposeMeter",
        this.locale,
        [channelNumber + 1],
        -36,
        36,
        true,
        val =>
        {
            val = Math.round(val);
            this.synth.transposeChannel(channelNumber, val, true);
            transpose.update(val);
        }
    );
    transpose.update(0);
    controller.appendChild(transpose.div);
    
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
        this.synth.setDrums(channelNumber, !this.synth.channelProperties[channelNumber].isDrum);
    };
    controller.appendChild(drumsToggle);
    
    return {
        controller: controller,
        voiceMeter: voiceMeter,
        pitchWheel: pitchWheel,
        pan: pan,
        expression: expression,
        volume: volume,
        mod: modulation,
        chorus: chorus,
        reverb: reverb,
        brightness: brightness,
        preset: presetSelector,
        drumsToggle: drumsToggle,
        soloButton: soloButton,
        muteButton: muteButton,
        transpose: transpose
    };
    
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