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
 *     transpose: Meter,
 *     preset: Selector,
 *     presetReset: HTMLDivElement,
 *     drumsToggle: HTMLDivElement,
 *     muteButton: HTMLDivElement
 * }} ChannelController
 */

import { Meter } from './synthui_meter.js'
import { LOCALE_PATH } from '../synthetizer_ui.js'
import { midiControllers } from '../../../../spessasynth_lib/midi_parser/midi_message.js'
import { getDrumsSvg, getLoopSvg, getMuteSvg, getNoteSvg, getVolumeSvg } from '../../icons.js'
import { DEFAULT_PERCUSSION } from '../../../../spessasynth_lib/synthetizer/synthetizer.js'
import { Selector } from './synthui_selector.js'
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION
} from '../../../../spessasynth_lib/synthetizer/worklet_system/message_protocol/worklet_message.js'

/**
 * Creates a new channel controller js
 * @param channelNumber {number}
 * @returns {ChannelController}
 * @this {SynthetizerUI}
 */
export function createChannelController(channelNumber)
{
    // controller
    const controller = document.createElement("div");
    controller.classList.add("channel_controller");

    // voice meter
    const voiceMeter = new Meter(this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.voiceMeter",
        this.locale,
        [channelNumber + 1],
        0,
        100);
    voiceMeter.bar.classList.add("voice_meter_bar_smooth");
    controller.appendChild(voiceMeter.div);

    // pitch wheel
    const pitchWheel = new Meter(this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.pitchBendMeter",
        this.locale,
        [channelNumber + 1],
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

    /**
     * @param cc {number}
     * @param val {number}
     * @param meter {Meter}
     */
    let changeCCUserFunction = (cc, val, meter) => {
        if(meter.isLocked)
        {
            this.synth.lockController(channelNumber, cc, false);
            this.synth.controllerChange(channelNumber, cc, val);
            this.synth.lockController(channelNumber, cc, true);
        }
        else
        {
            this.synth.controllerChange(channelNumber, cc, val);
        }
    }

    /**
     * @param ccNum {number}
     * @param localePath {string}
     * @param defaultValue {number}
     * @returns {Meter}
     */
    const createCCMeterHelper = (ccNum, localePath, defaultValue) => {
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
    }

    // pan controller
    const pan = createCCMeterHelper(midiControllers.pan, "channelController.panMeter", 64);
    controller.appendChild(pan.div);

    // expression controller
    const expression = createCCMeterHelper(midiControllers.expressionController, "channelController.expressionMeter", 127);
    controller.appendChild(expression.div);

    // volume controller
    const volume = createCCMeterHelper(midiControllers.mainVolume, "channelController.volumeMeter", 100);
    controller.appendChild(volume.div);

    // modulation wheel
    const modulation = createCCMeterHelper(midiControllers.modulationWheel, "channelController.modulationWheelMeter", 127);
    controller.appendChild(modulation.div);

    // chorus
    const chorus = createCCMeterHelper(midiControllers.effects3Depth, "channelController.chorusMeter", 0);
    controller.appendChild(chorus.div);

    // reverb
    const reverb = createCCMeterHelper(midiControllers.effects1Depth, "channelController.reverbMeter", 40);
    controller.appendChild(reverb.div);

    // transpose is not a cc, add it manually
    const transpose = new Meter(this.channelColors[channelNumber % this.channelColors.length],
        LOCALE_PATH + "channelController.transposeMeter",
        this.locale,
        [channelNumber + 1],
        -36,
        36,
        true,
        val => {
            val = Math.round(val);
            this.synth.transposeChannel(channelNumber, val, true);
            transpose.update(val);
        });
    transpose.update(0);
    controller.appendChild(transpose.div);

    // create it here so we can use it in the callback function
    const presetReset = document.createElement("div");

    // preset controller
    const presetSelector = new Selector(
        ([]), // empty for now
        this.locale,
        LOCALE_PATH + "channelController.presetSelector.description",
        [channelNumber + 1],
        async presetName => {
            const data = presetName.split(":");
            this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, false);
            this.synth.controllerChange(channelNumber, midiControllers.bankSelect, parseInt(data[0]), true);
            this.synth.programChange(channelNumber, parseInt(data[1]), true);
            presetSelector.mainDiv.classList.add("locked_selector");
            this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, true);
        }
    );
    controller.appendChild(presetSelector.mainDiv);

    // preset reset
    presetReset.innerHTML = getLoopSvg(32);
    this.locale.bindObjectProperty(presetReset, "title", LOCALE_PATH + "channelController.presetReset.description", [channelNumber + 1]);
    presetReset.classList.add("controller_element");
    presetReset.classList.add("voice_reset");
    presetReset.onclick = () => {
        this.synth.lockController(channelNumber, ALL_CHANNELS_OR_DIFFERENT_ACTION, false);
        presetSelector.mainDiv.classList.remove("locked_selector");
    }
    controller.appendChild(presetReset);

    // mute button
    const muteButton = document.createElement("div");
    muteButton.innerHTML = getVolumeSvg(32);
    this.locale.bindObjectProperty(muteButton, "title", LOCALE_PATH + "channelController.muteButton.description", [channelNumber + 1]);
    muteButton.classList.add("controller_element");
    muteButton.classList.add("mute_button");
    muteButton.onclick = () => {
        if(this.synth.channelProperties[channelNumber].isMuted)
        {
            this.synth.muteChannel(channelNumber, false);
            muteButton.innerHTML = getVolumeSvg(32);
        }
        else
        {
            this.synth.muteChannel(channelNumber, true);
            muteButton.innerHTML = getMuteSvg(32);
        }
    }
    controller.appendChild(muteButton);

    // drums toggle
    const drumsToggle = document.createElement("div");
    drumsToggle.innerHTML = channelNumber === DEFAULT_PERCUSSION ? getDrumsSvg(32) : getNoteSvg(32);
    this.locale.bindObjectProperty(drumsToggle, "title", LOCALE_PATH + "channelController.drumToggleButton.description", [channelNumber + 1]);
    drumsToggle.classList.add("controller_element");
    drumsToggle.classList.add("mute_button");
    drumsToggle.onclick = () => {
        this.synth.setDrums(channelNumber, !this.synth.channelProperties[channelNumber].isDrum);
    }
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
        preset: presetSelector,
        presetReset: presetReset,
        drumsToggle: drumsToggle,
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