import {
    type ChannelController,
    ICON_SIZE,
    LOCALE_PATH,
    MONO_ON,
    POLY_ON,
    type SynthetizerUI
} from "../synthetizer_ui.ts";
import { ANIMATION_REFLOW_TIME } from "../../utils/animation_utils.ts";
import { Meter } from "./synthui_meter.ts";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    DEFAULT_PERCUSSION,
    defaultMIDIControllerValues,
    type MIDIController,
    midiControllers,
    modulatorSources,
    NON_CC_INDEX_OFFSET
} from "spessasynth_core";
import {
    getDrumsSvg,
    getEmptyMicSvg,
    getMicSvg,
    getMuteSvg,
    getNoteSvg,
    getVolumeSvg
} from "../../utils/icons.ts";
import { Ut } from "../../utils/other.js";
import { Selector } from "./synthui_selector.ts";
import { sendAddress } from "./send_address.ts";

export function appendNewController(
    this: SynthetizerUI,
    channelNumber: number
) {
    let lastPortElement = this.ports[this.ports.length - 1];
    // Port check
    if (channelNumber % 16 === 0) {
        // Do not add the first port
        const portNum = Math.floor(channelNumber / 16);
        if (portNum > 0) {
            const portElement = document.createElement("div");
            portElement.classList.add("synthui_port_descriptor");
            this.locale.bindObjectProperty(
                portElement,
                "textContent",
                "locale.synthesizerController.port",
                [portNum]
            );
            let timeout = 0;
            portElement.addEventListener("click", () => {
                const port = this.ports[portNum];
                clearTimeout(timeout);
                if (port.classList.contains("collapsed")) {
                    Ut.show(port);
                    timeout = window.setTimeout(() => {
                        port.classList.remove("collapsed");
                    }, ANIMATION_REFLOW_TIME);
                } else {
                    port.classList.add("collapsed");
                    timeout = window.setTimeout(() => {
                        Ut.hide(port);
                    }, 350);
                }
            });

            // This gets added to the main div, not the port group, to allow closing
            this.tabs.channels.append(portElement);
            this.portDescriptors.push(portElement);
        }
    }

    // Create channel controller
    // Controller
    const controller = document.createElement("div");
    controller.classList.add("channel_controller");

    // Voice meter
    const voiceMeter = new Meter({
        color: this.channelColors[channelNumber % this.channelColors.length],
        localePath: LOCALE_PATH + "channelController.voiceMeter",
        locale: this.locale,
        localeArgs: [channelNumber + 1],
        min: 0,
        max: 100,
        initialAndDefault: 0
    });
    voiceMeter.bar.classList.add("voice_meter_bar_smooth");
    controller.append(voiceMeter.div);

    // Pitch wheel
    const pitchWheel = new Meter({
        color: this.channelColors[channelNumber % this.channelColors.length],
        localePath: LOCALE_PATH + "channelController.pitchBendMeter",
        locale: this.locale,
        localeArgs: [channelNumber + 1],
        min: -8192,
        max: 8191,
        initialAndDefault: 0,
        editable: true,
        editCallback: (val) => {
            const meterLocked = pitchWheel.isLocked;
            if (meterLocked) {
                this.synth.lockController(
                    channelNumber,
                    (NON_CC_INDEX_OFFSET +
                        modulatorSources.pitchWheel) as MIDIController,
                    false
                );
            }
            val = Math.round(val) + 8192;
            this.synth.pitchWheel(channelNumber, val);
            if (meterLocked) {
                this.synth.lockController(
                    channelNumber,
                    (NON_CC_INDEX_OFFSET +
                        modulatorSources.pitchWheel) as MIDIController,
                    true
                );
            }
        },
        lockCallback: () =>
            this.synth.lockController(
                channelNumber,
                (NON_CC_INDEX_OFFSET +
                    modulatorSources.pitchWheel) as MIDIController,
                true
            ),
        unlockCallback: () =>
            this.synth.lockController(
                channelNumber,
                (NON_CC_INDEX_OFFSET +
                    modulatorSources.pitchWheel) as MIDIController,
                false
            )
    });
    controller.append(pitchWheel.div);

    const changeCCUserFunction = (
        cc: MIDIController,
        val: number,
        meter: Meter
    ): void => {
        if (meter.isLocked) {
            this.synth.lockController(channelNumber, cc, false);
            this.synth.controllerChange(channelNumber, cc, val);
            this.synth.lockController(channelNumber, cc, true);
        } else {
            this.synth.controllerChange(channelNumber, cc, val);
        }
    };

    const controllerMeters: Partial<Record<MIDIController, Meter>> = {};

    const createCCMeterHelper = (
        ccNum: MIDIController,
        localePath: string,
        allowLocking = true
    ): Meter => {
        const meter = new Meter({
            color: this.channelColors[
                channelNumber % this.channelColors.length
            ],
            localePath: LOCALE_PATH + localePath,
            locale: this.locale,
            localeArgs: [channelNumber + 1],
            min: 0,
            max: 127,
            initialAndDefault: defaultMIDIControllerValues[ccNum] >> 7,
            editable: true,
            editCallback: (val) => {
                changeCCUserFunction(ccNum, Math.round(val), meter);
            },
            lockCallback: allowLocking
                ? () => this.synth.lockController(channelNumber, ccNum, true)
                : undefined,
            unlockCallback: allowLocking
                ? () => this.synth.lockController(channelNumber, ccNum, false)
                : undefined
        });
        controllerMeters[ccNum] = meter;
        return meter;
    };

    // Pan controller
    const pan = createCCMeterHelper(
        midiControllers.pan,
        "channelController.panMeter"
    );
    controller.append(pan.div);

    // Expression controller
    const expression = createCCMeterHelper(
        midiControllers.expressionController,
        "channelController.expressionMeter"
    );
    controller.append(expression.div);

    // Volume controller
    const volume = createCCMeterHelper(
        midiControllers.mainVolume,
        "channelController.volumeMeter"
    );
    controller.append(volume.div);

    // Modulation wheel
    const modulation = createCCMeterHelper(
        midiControllers.modulationWheel,
        "channelController.modulationWheelMeter"
    );
    controller.append(modulation.div);

    // Reverb
    const reverb = createCCMeterHelper(
        midiControllers.reverbDepth,
        "channelController.reverbMeter"
    );
    controller.append(reverb.div);

    // Chorus
    const chorus = createCCMeterHelper(
        midiControllers.chorusDepth,
        "channelController.chorusMeter"
    );
    controller.append(chorus.div);

    // Delay
    const delay = createCCMeterHelper(
        midiControllers.variationDepth,
        "channelController.delayMeter"
    );
    controller.append(delay.div);

    // Filter cutoff
    const filterCutoff = createCCMeterHelper(
        midiControllers.brightness,
        "channelController.filterMeter"
    );
    controller.append(filterCutoff.div);

    // Attack time
    const attackTime = createCCMeterHelper(
        midiControllers.attackTime,
        "channelController.attackMeter"
    );
    controller.append(attackTime.div);

    // Release time
    const releaseTime = createCCMeterHelper(
        midiControllers.releaseTime,
        "channelController.releaseMeter"
    );
    controller.append(releaseTime.div);

    // Decay time
    const decayTime = createCCMeterHelper(
        midiControllers.decayTime,
        "channelController.decayMeter"
    );
    controller.append(decayTime.div);

    // Portamento time
    // Custom control to set portamento on off as well
    const portamentoTime = new Meter({
        color: this.channelColors[channelNumber % this.channelColors.length],
        localePath: LOCALE_PATH + "channelController.portamentoTimeMeter",
        locale: this.locale,
        localeArgs: [channelNumber + 1],
        min: 0,
        max: 127,
        initialAndDefault: 0,
        editable: true,
        editCallback: (val) => {
            const meterLocked = portamentoTime.isLocked;
            if (meterLocked) {
                this.synth.lockController(
                    channelNumber,
                    midiControllers.portamentoTime,
                    false
                );
                this.synth.lockController(
                    channelNumber,
                    midiControllers.portamentoOnOff,
                    false
                );
            }
            this.synth.controllerChange(
                channelNumber,
                midiControllers.portamentoTime,
                Math.round(val)
            );
            this.synth.controllerChange(
                channelNumber,
                midiControllers.portamentoOnOff,
                val > 0 ? 127 : 0
            );
            if (meterLocked) {
                this.synth.lockController(
                    channelNumber,
                    midiControllers.portamentoTime,
                    true
                );
                this.synth.lockController(
                    channelNumber,
                    midiControllers.portamentoOnOff,
                    true
                );
            }
        },
        lockCallback: () => {
            this.synth.lockController(
                channelNumber,
                midiControllers.portamentoTime,
                true
            );
            this.synth.lockController(
                channelNumber,
                midiControllers.portamentoOnOff,
                true
            );
        },
        unlockCallback: () => {
            this.synth.lockController(
                channelNumber,
                midiControllers.portamentoTime,
                false
            );
            this.synth.lockController(
                channelNumber,
                midiControllers.portamentoOnOff,
                false
            );
        }
    });
    controllerMeters[midiControllers.portamentoTime] = portamentoTime;
    controller.append(portamentoTime.div);

    // Portamento control
    const portamentoControl = createCCMeterHelper(
        midiControllers.portamentoControl,
        "channelController.portamentoControlMeter",
        false // Don't allow locking portamento control
    );
    controller.append(portamentoControl.div);

    // Resonance
    const filterResonance = createCCMeterHelper(
        midiControllers.filterResonance,
        "channelController.resonanceMeter"
    );
    controller.append(filterResonance.div);

    // Transpose is not a cc, add it manually
    const transpose = new Meter({
        color: this.channelColors[channelNumber % this.channelColors.length],
        localePath: LOCALE_PATH + "channelController.transposeMeter",
        locale: this.locale,
        localeArgs: [channelNumber + 1],
        min: -36,
        max: 36,
        initialAndDefault: 0,
        editable: true,
        editCallback: (val) => {
            val = Math.round(val);
            this.synth.transposeChannel(channelNumber, val, true);
            transpose.update(val);
            this.onTranspose?.();
        },
        activeChangeCallback: (active) => {
            // Do hide on multi-port files
            if (channelNumber >= 16) {
                return;
            }
            this.setCCVisibilityStartingFrom(channelNumber + 1, !active);
        }
    });
    controller.append(transpose.div);

    // Preset controller
    const presetSelector = new Selector(
        [], // Empty for now
        this.locale,
        LOCALE_PATH + "channelController.presetSelector",
        [channelNumber + 1],
        (patch) => {
            this.synth.lockController(
                channelNumber,
                ALL_CHANNELS_OR_DIFFERENT_ACTION,
                false
            );
            if (!patch.isGMGSDrum) {
                this.synth.controllerChange(
                    channelNumber,
                    midiControllers.bankSelect,
                    patch.bankMSB
                );
                this.synth.controllerChange(
                    channelNumber,
                    midiControllers.bankSelectLSB,
                    patch.bankLSB
                );
            }
            this.synth.programChange(channelNumber, patch.program);
            if (this.onProgramChange) {
                this.onProgramChange(channelNumber);
            }
            presetSelector.mainButton.classList.add("locked_selector");
            this.synth.lockController(
                channelNumber,
                ALL_CHANNELS_OR_DIFFERENT_ACTION,
                true
            );
        },
        (locked) =>
            this.synth.lockController(
                channelNumber,
                ALL_CHANNELS_OR_DIFFERENT_ACTION,
                locked
            )
    );
    controller.append(presetSelector.mainButton);

    // Solo button
    const soloButton = document.createElement("div");
    soloButton.innerHTML = getEmptyMicSvg(ICON_SIZE);
    this.locale.bindObjectProperty(
        soloButton,
        "title",
        LOCALE_PATH + "channelController.soloButton.description",
        [channelNumber + 1]
    );
    soloButton.classList.add("controller_element", "mute_button");
    soloButton.addEventListener("click", () => {
        // Toggle solo
        if (this.soloChannels.has(channelNumber)) {
            this.soloChannels.delete(channelNumber);
        } else {
            this.soloChannels.add(channelNumber);
        }
        if (
            this.soloChannels.size === 0 ||
            this.soloChannels.size >= this.synth.channelsAmount
        ) {
            // No channels or all channels are soloed, unmute everything
            for (let i = 0; i < this.synth.channelsAmount; i++) {
                this.controllers[i].soloButton.innerHTML =
                    getEmptyMicSvg(ICON_SIZE);
                this.synth.muteChannel(
                    i,
                    this.controllers[i].muteButton.hasAttribute("is_muted")
                );
            }
            if (this.soloChannels.size >= this.synth.channelsAmount) {
                // All channels are soloed, return to normal
                this.soloChannels.clear();
            }
            return;
        }
        // Unmute every solo channel and mute others
        for (let i = 0; i < this.synth.channelsAmount; i++) {
            if (this.soloChannels.has(i)) {
                this.controllers[i].soloButton.innerHTML = getMicSvg(ICON_SIZE);
                this.synth.muteChannel(
                    i,
                    this.controllers[i].muteButton.hasAttribute("is_muted")
                );
            } else {
                this.controllers[i].soloButton.innerHTML =
                    getEmptyMicSvg(ICON_SIZE);
                this.synth.muteChannel(i, true);
            }
        }
    });
    controller.append(soloButton);

    // Mute button
    const muteButton = document.createElement("div");
    muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
    this.locale.bindObjectProperty(
        muteButton,
        "title",
        LOCALE_PATH + "channelController.muteButton.description",
        [channelNumber + 1]
    );
    muteButton.classList.add("controller_element", "mute_button");
    muteButton.addEventListener("click", () => {
        if (muteButton.hasAttribute("is_muted")) {
            // Unmute
            muteButton.removeAttribute("is_muted");
            const canBeUnmuted =
                this.soloChannels.size === 0 ||
                this.soloChannels.has(channelNumber);
            this.synth.muteChannel(channelNumber, !canBeUnmuted);
            muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
        } else {
            // Mute
            this.synth.muteChannel(channelNumber, true);
            muteButton.setAttribute("is_muted", "true");
            muteButton.innerHTML = getMuteSvg(ICON_SIZE);
        }
    });
    controller.append(muteButton);

    // Drums toggle
    const drumsToggle = document.createElement("div");
    drumsToggle.innerHTML =
        channelNumber === DEFAULT_PERCUSSION
            ? getDrumsSvg(ICON_SIZE)
            : getNoteSvg(ICON_SIZE);
    this.locale.bindObjectProperty(
        drumsToggle,
        "title",
        LOCALE_PATH + "channelController.drumToggleButton.description",
        [channelNumber + 1]
    );
    drumsToggle.classList.add("controller_element", "mute_button");
    drumsToggle.addEventListener("click", () => {
        if (presetSelector.mainButton.classList.contains("locked_selector")) {
            this.synth.lockController(
                channelNumber,
                ALL_CHANNELS_OR_DIFFERENT_ACTION,
                false
            );
        }
        this.synth.setDrums(
            channelNumber,
            !this.synth.channelProperties[channelNumber].isDrum
        );
        presetSelector.lockSelector(true);
    });
    controller.append(drumsToggle);

    // Poly/mono button
    const polyMonoButton = document.createElement("div");
    polyMonoButton.innerHTML = POLY_ON;
    this.locale.bindObjectProperty(
        polyMonoButton,
        "title",
        LOCALE_PATH + "channelController.polyMonoButton.description",
        [channelNumber + 1]
    );
    polyMonoButton.classList.add("controller_element", "mute_button");
    polyMonoButton.setAttribute("isPoly", "true");
    polyMonoButton.addEventListener("click", () => {
        this.synth.lockController(
            channelNumber,
            midiControllers.polyModeOn,
            false
        );
        this.synth.lockController(
            channelNumber,
            midiControllers.monoModeOn,
            false
        );
        const isPoly = polyMonoButton.getAttribute("isPoly") === "true";
        if (isPoly) {
            this.synth.controllerChange(
                channelNumber,
                midiControllers.monoModeOn,
                0
            );
            polyMonoButton.innerHTML = MONO_ON;
        } else {
            this.synth.controllerChange(
                channelNumber,
                midiControllers.polyModeOn,
                0
            );
            polyMonoButton.innerHTML = POLY_ON;
        }
        this.synth.lockController(
            channelNumber,
            midiControllers.polyModeOn,
            true
        );
        this.synth.lockController(
            channelNumber,
            midiControllers.monoModeOn,
            true
        );
        polyMonoButton.setAttribute("isPoly", (!isPoly).toString());
    });
    controller.append(polyMonoButton);

    // Insertion Effect button
    const insertionEffectButton = document.createElement("div");
    insertionEffectButton.innerHTML = "<pre>Fx</pre>";
    this.locale.bindObjectProperty(
        insertionEffectButton,
        "title",
        LOCALE_PATH + "channelController.insertionEffectButton.description",
        [channelNumber + 1]
    );
    insertionEffectButton.classList.add("controller_element", "mute_button");
    insertionEffectButton.addEventListener("click", () => {
        const isFX = !insertionEffectButton.classList.contains("red");
        const ch = channelNumber % 16;
        const offset = channelNumber - ch;
        const chanAddress = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 10, 11, 12, 13, 14, 15
        ][ch];
        if (this.insertionLock) {
            this.synth.setMasterParameter("insertionEffectLock", false);
        }
        sendAddress(
            this.synth,
            0x40,
            0x40 | chanAddress,
            0x22,
            isFX ? [1] : [0],
            offset
        );
        if (this.insertionLock) {
            this.synth.setMasterParameter("insertionEffectLock", true);
        }
    });
    controller.append(insertionEffectButton);

    const channelController: ChannelController = {
        controller,
        isHidingLocked: false,
        drumsToggle,
        voiceMeter,
        transpose,
        soloButton,
        muteButton,
        polyMonoButton,
        insertionEffectButton,
        preset: presetSelector,
        controllerMeters,
        pitchWheel
    };
    this.controllers.push(channelController);
    lastPortElement.append(channelController.controller);

    // Create a new port group if needed
    if (channelNumber % 16 === 15) {
        this.tabs.channels.append(lastPortElement);
        lastPortElement = document.createElement("div");
        lastPortElement.classList.add("synthui_port_group");
        this.ports.push(lastPortElement);
    }
}
