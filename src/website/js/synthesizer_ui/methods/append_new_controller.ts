import {
    type ChannelController,
    type ChannelControllerNumber,
    extraChannelControllers,
    ICON_SIZE,
    LOCALE_PATH,
    MONO_ON,
    POLY_ON,
    type SynthesizerUI
} from "../synthetizer_ui.ts";
import { ANIMATION_REFLOW_TIME } from "../../utils/animation_utils.ts";
import { Meter } from "./synthui_meter.ts";
import {
    DEFAULT_MIDI_CONTROLLERS,
    DEFAULT_PERCUSSION,
    type MIDIController,
    MIDIControllers
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
    this: SynthesizerUI,
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
    const controller = document.createElement("div");
    controller.classList.add("channel_controller");
    // Channel object
    const ch = this.synth.midiChannels[channelNumber];

    // Voice meter
    const voiceMeter = new Meter({
        color: this.channelColors[channelNumber % this.channelColors.length],
        smooth: true,
        localePath: LOCALE_PATH + "channelController.voiceMeter",
        locale: this.locale,
        localeArgs: [channelNumber + 1],
        min: 0,
        max: 100,
        def: 0
    });
    controller.append(voiceMeter.div);

    // Pitch wheel
    const pitchWheel = new Meter({
        color: this.channelColors[channelNumber % this.channelColors.length],
        localePath: LOCALE_PATH + "channelController.pitchBendMeter",
        locale: this.locale,
        localeArgs: [channelNumber + 1],
        min: -8192,
        max: 8191,
        def: 0,
        onEdit: (val) => {
            val = Math.round(val) + 8192;
            this.synth.pitchWheel(channelNumber, val);
        }
    });
    controller.append(pitchWheel.div);

    const changeCCUserFunction = (
        cc: MIDIController,
        val: number,
        meter: Meter
    ): void => {
        const ch = this.synth.midiChannels[channelNumber];
        if (meter.isLocked) {
            ch.lockController(cc, false);
            this.synth.controllerChange(channelNumber, cc, val);
            ch.lockController(cc, true);
        } else {
            this.synth.controllerChange(channelNumber, cc, val);
        }
    };

    const controllerMeters = new Map<ChannelControllerNumber, Meter>();

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
            def: DEFAULT_MIDI_CONTROLLERS[ccNum] >> 7,
            onEdit: (val) => {
                changeCCUserFunction(ccNum, Math.round(val), meter);
            },
            onLock: allowLocking
                ? (isLocked) => ch.lockController(ccNum, isLocked)
                : undefined
        });
        controllerMeters.set(ccNum, meter);
        return meter;
    };

    // Pan controller
    const pan = createCCMeterHelper(
        MIDIControllers.pan,
        "channelController.panMeter"
    );
    controller.append(pan.div);

    // Expression controller
    const expression = createCCMeterHelper(
        MIDIControllers.expression,
        "channelController.expressionMeter"
    );
    controller.append(expression.div);

    // Volume controller
    const volume = createCCMeterHelper(
        MIDIControllers.mainVolume,
        "channelController.volumeMeter"
    );
    controller.append(volume.div);

    // Modulation wheel
    const modulation = createCCMeterHelper(
        MIDIControllers.modulationWheel,
        "channelController.modulationWheelMeter"
    );
    controller.append(modulation.div);

    // Reverb
    const reverb = createCCMeterHelper(
        MIDIControllers.reverbDepth,
        "channelController.reverbMeter"
    );
    controller.append(reverb.div);

    // Chorus
    const chorus = createCCMeterHelper(
        MIDIControllers.chorusDepth,
        "channelController.chorusMeter"
    );
    controller.append(chorus.div);

    // Delay
    const delay = createCCMeterHelper(
        MIDIControllers.variationDepth,
        "channelController.delayMeter"
    );
    controller.append(delay.div);

    // Filter cutoff
    const filterCutoff = createCCMeterHelper(
        MIDIControllers.brightness,
        "channelController.filterMeter"
    );
    controller.append(filterCutoff.div);

    // Attack time
    const attackTime = createCCMeterHelper(
        MIDIControllers.attackTime,
        "channelController.attackMeter"
    );
    controller.append(attackTime.div);

    // Release time
    const releaseTime = createCCMeterHelper(
        MIDIControllers.releaseTime,
        "channelController.releaseMeter"
    );
    controller.append(releaseTime.div);

    // Decay time
    const decayTime = createCCMeterHelper(
        MIDIControllers.decayTime,
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
        def: 0,
        onEdit: (val) => {
            const meterLocked = portamentoTime.isLocked;
            if (meterLocked) {
                ch.lockController(MIDIControllers.portamentoTime, false);
                ch.lockController(MIDIControllers.portamentoOnOff, false);
            }
            this.synth.controllerChange(
                channelNumber,
                MIDIControllers.portamentoTime,
                Math.round(val)
            );
            this.synth.controllerChange(
                channelNumber,
                MIDIControllers.portamentoOnOff,
                val > 0 ? 127 : 0
            );
            if (meterLocked) {
                ch.lockController(MIDIControllers.portamentoTime, true);
                ch.lockController(MIDIControllers.portamentoOnOff, true);
            }
        },
        onLock: (isLocked) => {
            ch.lockController(MIDIControllers.portamentoTime, isLocked);
            ch.lockController(MIDIControllers.portamentoOnOff, isLocked);
        }
    });
    controllerMeters.set(MIDIControllers.portamentoTime, portamentoTime);
    controller.append(portamentoTime.div);

    // Portamento control
    const portamentoControl = createCCMeterHelper(
        MIDIControllers.portamentoControl,
        "channelController.portamentoControlMeter",
        false // Don't allow locking portamento control
    );
    controller.append(portamentoControl.div);

    // Resonance
    const filterResonance = createCCMeterHelper(
        MIDIControllers.filterResonance,
        "channelController.resonanceMeter"
    );
    controller.append(filterResonance.div);

    // Transpose is not a cc, add it manually
    const transpose = new Meter({
        color: this.channelColors[channelNumber % this.channelColors.length],
        smooth: true,
        localePath: LOCALE_PATH + "channelController.transposeMeter",
        locale: this.locale,
        localeArgs: [channelNumber + 1],
        min: -36,
        max: 36,
        def: 0,
        onEdit: (val) => {
            val = Math.trunc(val);
            ch.setMasterParameter("keyShift", val);
            transpose.update(val);
            this.onTranspose?.();
        }
    });
    controllerMeters.set(extraChannelControllers.transpose, transpose);
    controller.append(transpose.div);

    // Gain is not a CC, add it manually
    const gain = new Meter({
        color: this.channelColors[channelNumber % this.channelColors.length],
        smooth: true,
        localePath: LOCALE_PATH + "channelController.gainMeter",
        locale: this.locale,
        localeArgs: [channelNumber + 1],
        min: 0,
        max: 5,
        def: 1,
        onEdit: (val) => {
            val = Math.round(val * 100) / 100;
            ch.setMasterParameter("gain", val);
            gain.update(val);
        },
        activeChangeCallback: (active) => {
            // Do hide on multi-port files
            if (channelNumber >= 16) {
                return;
            }
            this.setCCVisibilityStartingFrom(channelNumber + 1, !active);
        }
    });
    controllerMeters.set(extraChannelControllers.gain, gain);
    controller.append(gain.div);

    // Preset controller
    const presetSelector = new Selector(
        [], // Empty for now
        this.locale,
        LOCALE_PATH + "channelController.presetSelector",
        [channelNumber + 1],
        (patch) => {
            ch.setMasterParameter("presetLock", false);
            if (!patch.isGMGSDrum) {
                this.synth.controllerChange(
                    channelNumber,
                    MIDIControllers.bankSelect,
                    patch.bankMSB
                );
                this.synth.controllerChange(
                    channelNumber,
                    MIDIControllers.bankSelectLSB,
                    patch.bankLSB
                );
            }
            this.synth.programChange(channelNumber, patch.program);
            if (this.onProgramChange) {
                this.onProgramChange(channelNumber);
            }
            presetSelector.mainButton.classList.add("locked_selector");
            ch.setMasterParameter("presetLock", true);
        },
        (locked) => ch.setMasterParameter("presetLock", locked)
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
            this.soloChannels.size >= this.synth.channelCount
        ) {
            // No channels or all channels are soloed, unmute everything
            for (let i = 0; i < this.synth.channelCount; i++) {
                this.controllers[i].soloButton.innerHTML =
                    getEmptyMicSvg(ICON_SIZE);
                const isMuted =
                    this.controllers[i].muteButton.hasAttribute("is_muted");
                this.synth.midiChannels[i].setMasterParameter(
                    "isMuted",
                    isMuted
                );

                for (const m of this.onMute) {
                    m?.(i, isMuted);
                }
            }
            if (this.soloChannels.size >= this.synth.channelCount) {
                // All channels are soloed, return to normal
                this.soloChannels.clear();
            }
            return;
        }
        // Unmute every solo channel and mute others
        for (let i = 0; i < this.synth.channelCount; i++) {
            if (this.soloChannels.has(i)) {
                this.controllers[i].soloButton.innerHTML = getMicSvg(ICON_SIZE);
                const isMuted =
                    this.controllers[i].muteButton.hasAttribute("is_muted");
                this.synth.midiChannels[i].setMasterParameter(
                    "isMuted",
                    isMuted
                );
                for (const m of this.onMute) {
                    m?.(i, isMuted);
                }
            } else {
                this.controllers[i].soloButton.innerHTML =
                    getEmptyMicSvg(ICON_SIZE);
                this.synth.midiChannels[i].setMasterParameter("isMuted", true);
                for (const m of this.onMute) {
                    m?.(i, true);
                }
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
            ch.setMasterParameter("isMuted", !canBeUnmuted);
            muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
            for (const m of this.onMute) {
                m?.(channelNumber, !canBeUnmuted);
            }
        } else {
            // Mute
            ch.setMasterParameter("isMuted", true);
            muteButton.setAttribute("is_muted", "true");
            muteButton.innerHTML = getMuteSvg(ICON_SIZE);
            for (const m of this.onMute) {
                m?.(channelNumber, true);
            }
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
            ch.setMasterParameter("presetLock", false);
        }
        ch.setDrums(!ch.patch.isDrum);
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
        ch.lockController(MIDIControllers.polyModeOn, false);
        ch.lockController(MIDIControllers.monoModeOn, false);
        const isPoly = polyMonoButton.getAttribute("isPoly") === "true";
        if (isPoly) {
            this.synth.controllerChange(
                channelNumber,
                MIDIControllers.monoModeOn,
                0
            );
            polyMonoButton.innerHTML = MONO_ON;
        } else {
            this.synth.controllerChange(
                channelNumber,
                MIDIControllers.polyModeOn,
                0
            );
            polyMonoButton.innerHTML = POLY_ON;
        }
        ch.lockController(MIDIControllers.polyModeOn, true);
        ch.lockController(MIDIControllers.monoModeOn, true);
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
