import {
    type ChannelController,
    type ChannelControllerKey,
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
        locked: boolean
    ): void => {
        const ch = this.synth.midiChannels[channelNumber];
        if (locked) {
            ch.lockController(cc, false);
            this.synth.controllerChange(channelNumber, cc, val);
            ch.lockController(cc, true);
        } else {
            this.synth.controllerChange(channelNumber, cc, val);
        }
    };

    const controllerMeters = new Map<ChannelControllerKey, Meter>();

    const addMeterToController = (key: ChannelControllerKey, meter: Meter) => {
        controllerMeters.set(key, meter);
        controller.append(meter.div);
        return meter;
    };

    const createCCMeterHelper = (
        ccNum: MIDIController,
        localePath: string,
        allowLocking = true
    ): Meter => {
        return addMeterToController(
            ccNum,
            new Meter({
                color: this.channelColors[
                    channelNumber % this.channelColors.length
                ],
                localePath: LOCALE_PATH + localePath,
                locale: this.locale,
                localeArgs: [channelNumber + 1],
                min: 0,
                max: 127,
                def: DEFAULT_MIDI_CONTROLLERS[ccNum] >> 7,
                onEdit: (val, m) => {
                    changeCCUserFunction(ccNum, Math.round(val), m.isLocked);
                },
                onLock: allowLocking
                    ? (isLocked) => ch.lockController(ccNum, isLocked)
                    : undefined
            })
        );
    };

    // Pan controller
    createCCMeterHelper(MIDIControllers.pan, "channelController.panMeter");

    // Expression controller
    createCCMeterHelper(
        MIDIControllers.expression,
        "channelController.expressionMeter"
    );

    // Volume controller
    createCCMeterHelper(
        MIDIControllers.mainVolume,
        "channelController.volumeMeter"
    );

    // Modulation wheel
    createCCMeterHelper(
        MIDIControllers.modulationWheel,
        "channelController.modulationWheelMeter"
    );

    // Reverb
    createCCMeterHelper(
        MIDIControllers.reverbDepth,
        "channelController.reverbMeter"
    );

    // Chorus
    createCCMeterHelper(
        MIDIControllers.chorusDepth,
        "channelController.chorusMeter"
    );

    // Delay
    createCCMeterHelper(
        MIDIControllers.variationDepth,
        "channelController.delayMeter"
    );

    // Filter cutoff
    createCCMeterHelper(
        MIDIControllers.brightness,
        "channelController.filterMeter"
    );

    // Attack time
    createCCMeterHelper(
        MIDIControllers.attackTime,
        "channelController.attackMeter"
    );

    // Release time
    createCCMeterHelper(
        MIDIControllers.releaseTime,
        "channelController.releaseMeter"
    );

    // Decay time
    createCCMeterHelper(
        MIDIControllers.decayTime,
        "channelController.decayMeter"
    );

    // Portamento time
    // Custom control to set portamento on off as well
    addMeterToController(
        MIDIControllers.portamentoTime,
        new Meter({
            color: this.channelColors[
                channelNumber % this.channelColors.length
            ],
            localePath: LOCALE_PATH + "channelController.portamentoTimeMeter",
            locale: this.locale,
            localeArgs: [channelNumber + 1],
            min: 0,
            max: 127,
            def: 0,
            onEdit: (val, meterLocked) => {
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
        })
    );

    // Portamento control
    createCCMeterHelper(
        MIDIControllers.portamentoControl,
        "channelController.portamentoControlMeter",
        false // Don't allow locking portamento control
    );

    // Resonance
    createCCMeterHelper(
        MIDIControllers.filterResonance,
        "channelController.resonanceMeter"
    );

    // Transpose is not a cc, add it manually
    addMeterToController(
        "keyShift",
        new Meter({
            color: this.channelColors[
                channelNumber % this.channelColors.length
            ],
            smooth: true,
            localePath: LOCALE_PATH + "channelController.transposeMeter",
            locale: this.locale,
            localeArgs: [channelNumber + 1],
            min: -36,
            max: 36,
            def: 0,
            onEdit: (val, meter) => {
                val = Math.trunc(val);
                ch.setSystemParameter("keyShift", val);
                meter.update(val);
                this.onTranspose?.();
            }
        })
    );

    // Fine tune is not a CC, add it manually
    addMeterToController(
        "fineTune",
        new Meter({
            color: this.channelColors[
                channelNumber % this.channelColors.length
            ],
            smooth: true,
            localePath: LOCALE_PATH + "channelController.fineTuneMeter",
            locale: this.locale,
            localeArgs: [channelNumber + 1],
            min: -100,
            max: 100,
            def: 0,
            onEdit: (val, meter) => {
                val = Math.round(val);
                ch.setSystemParameter("fineTune", val);
                meter.update(val);
            },
            activeChangeCallback: (active) => {
                // Do hide on multi-port files
                if (channelNumber >= 16) {
                    return;
                }

                this.setCCVisibilityStartingFrom(channelNumber + 1, !active);
            }
        })
    );

    // Gain is not a CC, add it manually
    addMeterToController(
        "gain",
        new Meter({
            color: this.channelColors[
                channelNumber % this.channelColors.length
            ],
            smooth: true,
            localePath: LOCALE_PATH + "channelController.gainMeter",
            locale: this.locale,
            localeArgs: [channelNumber + 1],
            min: 0,
            max: 5,
            def: 1,
            onEdit: (val, meter) => {
                val = Math.round(val * 100) / 100;
                ch.setSystemParameter("gain", val);
                meter.update(val);
            }
        })
    );

    // Preset controller
    const presetSelector = new Selector(
        [], // Empty for now
        this.locale,
        LOCALE_PATH + "channelController.presetSelector",
        [channelNumber + 1],
        (patch) => {
            ch.setSystemParameter("presetLock", false);
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
            ch.setSystemParameter("presetLock", true);
        },
        (locked) => ch.setSystemParameter("presetLock", locked)
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
                this.synth.midiChannels[i].setSystemParameter(
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
                this.synth.midiChannels[i].setSystemParameter(
                    "isMuted",
                    isMuted
                );
                for (const m of this.onMute) {
                    m?.(i, isMuted);
                }
            } else {
                this.controllers[i].soloButton.innerHTML =
                    getEmptyMicSvg(ICON_SIZE);
                this.synth.midiChannels[i].setSystemParameter("isMuted", true);
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
            ch.setSystemParameter("isMuted", !canBeUnmuted);
            muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
            for (const m of this.onMute) {
                m?.(channelNumber, !canBeUnmuted);
            }
        } else {
            // Mute
            ch.setSystemParameter("isMuted", true);
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
            ch.setSystemParameter("presetLock", false);
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
            this.synth.setSystemParameter("insertionEffectLock", false);
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
            this.synth.setSystemParameter("insertionEffectLock", true);
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
