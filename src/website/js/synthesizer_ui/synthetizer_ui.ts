import {
    hideControllers,
    showControllers
} from "./methods/hide_show_controllers.js";
import { toggleDarkMode } from "./methods/toggle_dark_mode.js";
import { setEventListeners } from "./methods/set_event_listeners.js";
import { keybinds } from "../utils/keybinds.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { closeNotification } from "../notification/notification.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    DEFAULT_MASTER_PARAMETERS,
    DEFAULT_PERCUSSION,
    type InterpolationType,
    interpolationTypes,
    type MIDIController,
    midiControllers,
    modulatorSources,
    NON_CC_INDEX_OFFSET,
    type SynthSystem
} from "spessasynth_core";
import type { Sequencer, WorkerSynthesizer } from "spessasynth_lib";
import type { LocaleManager } from "../locale/locale_manager.ts";
import type { MidiKeyboard } from "../midi_keyboard/midi_keyboard.ts";
import { Meter } from "./methods/synthui_meter.ts";
import {
    getDrumsSvg,
    getEmptyMicSvg,
    getMicSvg,
    getMuteSvg,
    getNoteSvg,
    getVolumeSvg
} from "../utils/icons.ts";
import { showAdvancedConfiguration } from "./methods/advanced_configuration.ts";
import { Selector } from "./methods/synthui_selector.ts";

export function isXGDrums(bankNr: number) {
    return bankNr === 120 || bankNr === 126 || bankNr === 127;
}

export const LOCALE_PATH = "locale.synthesizerController.";
type ControllerGroupType =
    | "effects"
    | "portamento"
    | "volumeEnvelope"
    | "filter";

export interface ChannelController {
    controller: HTMLDivElement;
    controllerMeters: Meter[];
    voiceMeter: Meter;
    pitchWheel: Meter;
    transpose: Meter;
    preset: Selector;
    drumsToggle: HTMLDivElement;
    soloButton: HTMLDivElement;
    muteButton: HTMLDivElement;
    isHidingLocked: boolean;
}

export function isValidXGMSB(bank: number) {
    return isXGDrums(bank) || bank === 64 || bank === 120;
}

export function isSystemXG(system: SynthSystem) {
    return system === "gm2" || system === "xg";
}

export const ICON_SIZE = 32;

/**
 * Synthesizer_ui.js
 * purpose: manages the graphical user interface for the synthesizer
 */

export class SynthetizerUI {
    public readonly toggleDarkMode = toggleDarkMode.bind(this);
    protected readonly synth: WorkerSynthesizer;
    protected readonly keyboard: MidiKeyboard;
    protected readonly locale: LocaleManager;
    protected readonly sequencer: Sequencer;

    protected readonly voiceMeter: Meter;
    protected readonly volumeController: Meter;
    protected readonly panController: Meter;
    protected readonly transposeController: Meter;
    protected readonly mainMeters: Meter[];

    protected readonly mainButtons: HTMLElement[];
    protected readonly mainControllerDiv: HTMLDivElement;
    protected onProgramChange?: (channel: number) => unknown;

    protected controllers: ChannelController[] = [];
    protected ports: HTMLDivElement[] = [];
    protected portDescriptors: HTMLDivElement[] = [];
    protected readonly soloChannels = new Set<number>();

    protected readonly mainDivWrapper: HTMLDivElement;
    protected readonly channelColors: string[];
    protected readonly groupSelector: HTMLSelectElement;
    protected readonly uiDiv: HTMLDivElement;
    protected showOnlyUsedEnabled = false;
    protected isShown = false;
    protected animationId = -1;
    protected hideOnDocClick = true;
    /**
     * For closing the effect window when closing the synthui.
     */
    protected effectsConfigWindow?: number;
    protected instrumentList: {
        name: string;
        program: number;
        bank: number;
    }[] = [];
    protected percussionList: {
        name: string;
        program: number;
        bank: number;
    }[] = [];
    protected presetList: {
        name: string;
        program: number;
        bank: number;
    }[] = [];
    protected readonly hideControllers = hideControllers.bind(this);
    protected readonly showControllers = showControllers.bind(this);
    protected readonly setEventListeners = setEventListeners.bind(this);

    /**
     * Creates a new instance of CustomSynth UI
     * @param colors
     * @param element the element to create synthui in
     * @param localeManager
     * @param keyboard
     * @param synth
     * @param seq
     */
    public constructor(
        colors: string[],
        element: HTMLElement,
        localeManager: LocaleManager,
        keyboard: MidiKeyboard,
        synth: WorkerSynthesizer,
        seq: Sequencer
    ) {
        this.channelColors = colors;
        const wrapper = element;
        this.uiDiv = document.createElement("div");
        this.uiDiv.classList.add("wrapper");
        wrapper.appendChild(this.uiDiv);
        this.uiDiv.style.visibility = "visible";

        this.locale = localeManager;
        this.keyboard = keyboard;
        this.synth = synth;
        this.sequencer = seq;

        seq.eventHandler.addEvent("songChange", "synthui-song-change", () => {
            this.setOnlyUsedControllersVisible(this.showOnlyUsedEnabled);
        });

        const firstPort = document.createElement("div");
        firstPort.classList.add("synthui_port_group");
        this.ports.push(firstPort);

        this.getInstrumentList();

        // Create main controller
        {
            // Control wrapper
            const controlsWrapper = document.createElement("div");
            controlsWrapper.classList.add("controls_wrapper");

            /**
             * Voice meter
             */
            this.voiceMeter = new Meter(
                "",
                LOCALE_PATH + "mainVoiceMeter",
                this.locale,
                [],
                0,
                DEFAULT_MASTER_PARAMETERS.voiceCap,
                0
            );
            this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");
            this.voiceMeter.div.classList.add("main_controller_element");

            /**
             * Volume controller
             */
            this.volumeController = new Meter(
                "",
                LOCALE_PATH + "mainVolumeMeter",
                this.locale,
                [],
                0,
                400,
                100,
                true,
                (v) => {
                    this.synth.setMasterParameter(
                        "masterGain",
                        Math.round(v) / 100
                    );
                    this.volumeController.update(v);
                }
            );
            this.volumeController.bar.classList.add("voice_meter_bar_smooth");
            this.volumeController.div.classList.add("main_controller_element");

            /**
             * Pan controller
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
                (v) => {
                    this.synth.setMasterParameter("masterPan", v);
                    this.panController.update(v);
                }
            );
            this.panController.bar.classList.add("voice_meter_bar_smooth");
            this.panController.div.classList.add("main_controller_element");

            /**
             * Transpose controller
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
                (v) => {
                    // Limit to half semitone precision
                    this.synth.setMasterParameter(
                        "transposition",
                        Math.round(v * 2) / 2
                    );
                    this.transposeController.update(Math.round(v * 2) / 2);
                },
                undefined,
                undefined,
                (active) => {
                    this.setCCVisibilityStartingFrom(0, !active);
                }
            );
            this.transposeController.bar.classList.add(
                "voice_meter_bar_smooth"
            );
            this.transposeController.div.classList.add(
                "main_controller_element"
            );

            // Note killer
            const midiPanicButton = document.createElement("button");
            this.locale.bindObjectProperty(
                midiPanicButton,
                "textContent",
                LOCALE_PATH + "midiPanic.title"
            );
            this.locale.bindObjectProperty(
                midiPanicButton,
                "title",
                LOCALE_PATH + "midiPanic.description"
            );

            midiPanicButton.classList.add("synthui_button");
            midiPanicButton.classList.add("main_controller_element");
            midiPanicButton.onclick = () => this.synth.stopAll(true);

            // System reset button
            const resetCCButton = document.createElement("button");
            this.locale.bindObjectProperty(
                resetCCButton,
                "textContent",
                LOCALE_PATH + "systemReset.title"
            );
            this.locale.bindObjectProperty(
                resetCCButton,
                "title",
                LOCALE_PATH + "systemReset.description"
            );

            resetCCButton.classList.add("synthui_button");
            resetCCButton.classList.add("main_controller_element");
            resetCCButton.onclick = () => {
                // Unlock everything
                this.controllers.forEach((channel, number) => {
                    if (channel.pitchWheel.isLocked) {
                        channel.pitchWheel.toggleLock();
                    }
                    // CCs
                    for (const meter of Object.values(
                        channel.controllerMeters
                    )) {
                        if (meter.isLocked) {
                            meter.toggleLock();
                        }
                    }
                    // Program
                    if (
                        channel.preset.mainButton.classList.contains(
                            "locked_selector"
                        )
                    ) {
                        this.synth.lockController(
                            number,
                            ALL_CHANNELS_OR_DIFFERENT_ACTION,
                            false
                        );
                        channel.preset.mainButton.classList.remove(
                            "locked_selector"
                        );
                    }
                    // Transpose
                    this.synth.transposeChannel(number, 0, true);
                    channel.transpose.update(0);

                    // Mute/solo
                    channel.soloButton.innerHTML = getEmptyMicSvg(ICON_SIZE);
                    channel.muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
                    this.synth.muteChannel(number, false);
                });
                this.synth.resetControllers();
            };

            // Show only used
            const showOnlyUsedButton = document.createElement("button");
            this.locale.bindObjectProperty(
                showOnlyUsedButton,
                "textContent",
                LOCALE_PATH + "showOnlyUsed.title"
            );
            this.locale.bindObjectProperty(
                showOnlyUsedButton,
                "title",
                LOCALE_PATH + "showOnlyUsed.description"
            );
            showOnlyUsedButton.classList.add("synthui_button");
            showOnlyUsedButton.classList.add("main_controller_element");
            showOnlyUsedButton.onclick = () => {
                this.showOnlyUsedEnabled = !this.showOnlyUsedEnabled;
                showOnlyUsedButton.classList.toggle("enabled");
                this.setOnlyUsedControllersVisible(this.showOnlyUsedEnabled);
            };

            // Advanced config
            const advancedConfigurationButton =
                document.createElement("button");
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
            advancedConfigurationButton.classList.add(
                "main_controller_element"
            );
            advancedConfigurationButton.onclick =
                showAdvancedConfiguration.bind(this);

            // Shown CC group selector
            const groupSelector = document.createElement("select");
            groupSelector.classList.add("synthui_button");
            groupSelector.classList.add("main_controller_element");
            this.locale.bindObjectProperty(
                groupSelector,
                "title",
                LOCALE_PATH + "channelController.groupSelector.description"
            );
            // Create all the options
            for (const option of [
                "effects",
                "volumeEnvelope",
                "filter",
                "portamento"
            ]) {
                const optionElement = document.createElement("option");
                optionElement.value = option;
                this.locale.bindObjectProperty(
                    optionElement,
                    "textContent",
                    LOCALE_PATH + "channelController.groupSelector." + option
                );
                groupSelector.appendChild(optionElement);
            }

            groupSelector.onchange = () => {
                this.showControllerGroup(
                    groupSelector.value as ControllerGroupType
                );
            };
            this.groupSelector = groupSelector;

            /**
             * Interpolation type
             */
            const interpolation = document.createElement("select");
            interpolation.classList.add("main_controller_element");
            interpolation.classList.add("synthui_button");
            this.locale.bindObjectProperty(
                interpolation,
                "title",
                LOCALE_PATH + "interpolation.description"
            );

            // Interpolation types
            {
                /**
                 * Linear (default)
                 */
                const linear = document.createElement("option");
                linear.value = interpolationTypes.linear.toString();
                this.locale.bindObjectProperty(
                    linear,
                    "textContent",
                    LOCALE_PATH + "interpolation.linear"
                );
                interpolation.appendChild(linear);

                /**
                 * Nearest neighbor
                 */
                const nearest = document.createElement("option");
                nearest.value = interpolationTypes.nearestNeighbor.toString();
                this.locale.bindObjectProperty(
                    nearest,
                    "textContent",
                    LOCALE_PATH + "interpolation.nearestNeighbor"
                );
                interpolation.appendChild(nearest);

                /**
                 * Cubic (default)
                 */
                const cubic = document.createElement("option");
                cubic.value = interpolationTypes.hermite.toString();
                cubic.selected = true;
                this.locale.bindObjectProperty(
                    cubic,
                    "textContent",
                    LOCALE_PATH + "interpolation.cubic"
                );
                interpolation.appendChild(cubic);

                interpolation.onchange = () => {
                    this.synth.setMasterParameter(
                        "interpolationType",
                        parseInt(interpolation.value) as InterpolationType
                    );
                };
            }

            /**
             * Main controller
             */
            const controller = document.createElement("div");
            controller.classList.add("synthui_controller");
            this.uiDiv.appendChild(controller);
            this.mainDivWrapper = controller;

            // Channel controller shower
            const showControllerButton = document.createElement("button");
            this.locale.bindObjectProperty(
                showControllerButton,
                "textContent",
                LOCALE_PATH + "toggleButton.title"
            );
            this.locale.bindObjectProperty(
                showControllerButton,
                "title",
                LOCALE_PATH + "toggleButton.description"
            );
            showControllerButton.classList.add("synthui_button");
            showControllerButton.onclick = () => {
                this.hideOnDocClick = false;
                this.toggleVisibility();
            };

            // Meters
            controlsWrapper.appendChild(this.volumeController.div);
            controlsWrapper.appendChild(this.panController.div);
            controlsWrapper.appendChild(this.transposeController.div);
            // Buttons
            controlsWrapper.appendChild(midiPanicButton);
            controlsWrapper.appendChild(resetCCButton);
            controlsWrapper.appendChild(showOnlyUsedButton);
            controlsWrapper.appendChild(advancedConfigurationButton);
            controlsWrapper.appendChild(groupSelector);
            controlsWrapper.appendChild(interpolation);

            this.mainMeters = [
                this.volumeController,
                this.panController,
                this.transposeController,
                this.voiceMeter
            ];
            this.mainButtons = [
                midiPanicButton,
                resetCCButton,
                advancedConfigurationButton,
                showControllerButton,
                interpolation
            ];
            // Main synth div
            this.uiDiv.appendChild(this.voiceMeter.div);
            this.uiDiv.appendChild(showControllerButton);
            controller.appendChild(controlsWrapper);
            this.mainControllerDiv = controller;
            // Stop propagation to not hide
            this.mainControllerDiv.onclick = (e) => e.stopPropagation();
            // Hide if clicked outside
            document.addEventListener("click", () => {
                if (!this.hideOnDocClick) {
                    this.hideOnDocClick = true;
                    return;
                }
                if (this.effectsConfigWindow !== undefined) {
                    closeNotification(this.effectsConfigWindow);
                    this.effectsConfigWindow = undefined;
                }
                controller.classList.remove("synthui_controller_show");
                this.isShown = false;
                this.hideControllers();
            });
        }

        // Create channel controllers
        for (let i = 0; i < this.synth.channelsAmount; i++) {
            this.appendNewController(i);
        }
        this.setEventListeners();

        setInterval(this.updateVoicesAmount.bind(this), 100);
        this.hideControllers();

        this.showControllerGroup("effects");

        document.addEventListener("keydown", (e) => {
            switch (e.key.toLowerCase()) {
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
                    this.synth.setMasterParameter(
                        "blackMIDIMode",
                        !this.synth.getMasterParameter("blackMIDIMode")
                    );
                    break;

                case keybinds.midiPanic:
                    e.preventDefault();
                    this.synth.stopAll(true);
                    break;
            }
        });

        // Add event listener for locale change
        this.locale.onLocaleChanged.push(() => {
            // Reload all meters
            // global meters
            this.voiceMeter.update(this.voiceMeter.currentValue, true);
            this.volumeController.update(
                this.volumeController.currentValue,
                true
            );
            this.panController.update(this.panController.currentValue, true);
            this.panController.update(this.panController.currentValue, true);
            this.transposeController.update(
                this.transposeController.currentValue,
                true
            );
            // Channel controller meters
            for (const controller of this.controllers) {
                controller.voiceMeter.update(
                    controller.voiceMeter.currentValue,
                    true
                );
                controller.pitchWheel.update(
                    controller.pitchWheel.currentValue,
                    true
                );
                for (const meter of Object.values(
                    controller.controllerMeters
                )) {
                    meter.update(meter.currentValue, true);
                }
                controller.transpose.update(
                    controller.transpose.currentValue,
                    true
                );
            }
        });
    }

    public toggleVisibility() {
        if (this.animationId !== -1) {
            window.clearTimeout(this.animationId);
        }
        const controller = document.getElementsByClassName(
            "synthui_controller"
        )[0] as HTMLElement;
        this.isShown = !this.isShown;
        if (this.isShown) {
            controller.style.display = "block";
            document
                .getElementsByClassName("top_part")[0]
                .classList.add("synthui_shown");
            this.showControllers();

            setTimeout(() => {
                controller.classList.add("synthui_controller_show");
            }, ANIMATION_REFLOW_TIME);
        } else {
            if (this.effectsConfigWindow !== undefined) {
                closeNotification(this.effectsConfigWindow);
                this.effectsConfigWindow = undefined;
            }
            document
                .getElementsByClassName("top_part")[0]
                .classList.remove("synthui_shown");
            this.hideControllers();
            controller.classList.remove("synthui_controller_show");
            this.animationId = window.setTimeout(() => {
                controller.style.display = "none";
            }, 200);
        }
    }

    public setCCVisibilityStartingFrom(start: number, visible: boolean) {
        if (visible) {
            for (let i = 0; i < this.controllers.length; i++) {
                this.setChannelControllerVisibility(i, true);
            }
            this.portDescriptors.forEach((e) => {
                // Do not show ports that are empty
                e.classList.remove("hidden");
            });
        } else {
            for (let i = start; i < this.controllers.length; i++) {
                this.setChannelControllerVisibility(i, false);
            }
            this.portDescriptors.forEach((e) => e.classList.add("hidden"));
        }
    }

    public setOnlyUsedControllersVisible(enabled: boolean) {
        this.showOnlyUsedEnabled = enabled;
        if (!this.sequencer.midiData) {
            return;
        }
        if (!enabled) {
            for (let i = 0; i < this.controllers.length; i++) {
                this.setChannelControllerVisibility(i, true, true);
                this.controllers[i].isHidingLocked = false;
            }
            return;
        }
        const usedChannels = new Set<number>();
        const mid = this.sequencer.midiData;
        mid.tracks.forEach((t) => {
            const used = t.channels;
            const port = t.port;
            const offset = mid.portChannelOffsetMap[port];
            used.values().forEach((v) => usedChannels.add(v + offset));
        });
        for (let i = 0; i < this.controllers.length; i++) {
            if (usedChannels.has(i)) {
                this.setChannelControllerVisibility(i, true, true);
                this.controllers[i].isHidingLocked = false;
            } else {
                this.setChannelControllerVisibility(i, false, true);
            }
        }
    }

    public showControllerGroup(groupType: ControllerGroupType) {
        const effectControllers = [
            midiControllers.chorusDepth,
            midiControllers.reverbDepth
        ];
        const envelopeControllers = [
            midiControllers.attackTime,
            midiControllers.releaseTime
        ];
        const filterControllers = [
            midiControllers.brightness,
            midiControllers.filterResonance
        ];
        const portamentoControllers = [
            midiControllers.portamentoTime,
            midiControllers.portamentoControl
        ];

        const hideCCs = (ccs: MIDIController[]) =>
            ccs.forEach((cc) => {
                this.controllers.forEach((controller) => {
                    controller.controllerMeters[cc]?.div.classList.add(
                        "hidden"
                    );
                });
            });
        const showCCs = (ccs: MIDIController[]) =>
            ccs.forEach((cc) => {
                this.controllers.forEach((controller) => {
                    controller.controllerMeters[cc]?.div.classList.remove(
                        "hidden"
                    );
                });
            });

        hideCCs(effectControllers);
        hideCCs(portamentoControllers);
        hideCCs(filterControllers);
        hideCCs(envelopeControllers);
        switch (groupType) {
            case "effects":
                showCCs(effectControllers);
                break;

            case "volumeEnvelope":
                showCCs(envelopeControllers);
                break;

            case "filter":
                showCCs(filterControllers);
                break;

            case "portamento":
                showCCs(portamentoControllers);
        }
    }

    protected appendNewController(channelNumber: number) {
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
                portElement.onclick = () => {
                    const port = this.ports[portNum];
                    clearTimeout(timeout);
                    if (!port.classList.contains("collapsed")) {
                        port.classList.add("collapsed");
                        timeout = window.setTimeout(() => {
                            port.classList.add("hidden");
                        }, 350);
                    } else {
                        port.classList.remove("hidden");
                        timeout = window.setTimeout(() => {
                            port.classList.remove("collapsed");
                        }, ANIMATION_REFLOW_TIME);
                    }
                };

                // This gets added to the main div, not the port group, to allow closing
                this.mainDivWrapper.appendChild(portElement);
                this.portDescriptors.push(portElement);
            }
        }
        const controller = this.createChannelController(channelNumber);
        this.controllers.push(controller);
        lastPortElement.appendChild(controller.controller);

        // Create a new port group if needed
        if (channelNumber % 16 === 15) {
            this.mainDivWrapper.appendChild(lastPortElement);
            lastPortElement = document.createElement("div");
            lastPortElement.classList.add("synthui_port_group");
            this.ports.push(lastPortElement);
        }
    }

    protected createChannelController(
        channelNumber: number
    ): ChannelController {
        // Controller
        const controller = document.createElement("div");
        controller.classList.add("channel_controller");

        // Voice meter
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

        // Pitch wheel
        const pitchWheel = new Meter(
            this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.pitchBendMeter",
            this.locale,
            [channelNumber + 1],
            -8192,
            8191,
            0,
            true,
            (val) => {
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
                // Get bend values
                const msb = val >> 7;
                const lsb = val & 0x7f;
                this.synth.pitchWheel(channelNumber, msb, lsb);
                if (meterLocked) {
                    this.synth.lockController(
                        channelNumber,
                        (NON_CC_INDEX_OFFSET +
                            modulatorSources.pitchWheel) as MIDIController,
                        true
                    );
                }
            },
            () =>
                this.synth.lockController(
                    channelNumber,
                    (NON_CC_INDEX_OFFSET +
                        modulatorSources.pitchWheel) as MIDIController,
                    true
                ),
            () =>
                this.synth.lockController(
                    channelNumber,
                    (NON_CC_INDEX_OFFSET +
                        modulatorSources.pitchWheel) as MIDIController,
                    false
                )
        );
        controller.appendChild(pitchWheel.div);

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

        const controllerMeters: Meter[] = [];

        const createCCMeterHelper = (
            ccNum: MIDIController,
            localePath: string,
            defaultValue: number,
            allowLocking = true
        ): Meter => {
            const meter = new Meter(
                this.channelColors[channelNumber % this.channelColors.length],
                LOCALE_PATH + localePath,
                this.locale,
                [channelNumber + 1],
                0,
                127,
                defaultValue,
                true,
                (val) => {
                    changeCCUserFunction(ccNum, Math.round(val), meter);
                },
                allowLocking
                    ? () =>
                          this.synth.lockController(channelNumber, ccNum, true)
                    : undefined,
                allowLocking
                    ? () =>
                          this.synth.lockController(channelNumber, ccNum, false)
                    : undefined
            );
            controllerMeters[ccNum] = meter;
            return meter;
        };

        // Pan controller
        const pan = createCCMeterHelper(
            midiControllers.pan,
            "channelController.panMeter",
            64
        );
        controller.appendChild(pan.div);

        // Expression controller
        const expression = createCCMeterHelper(
            midiControllers.expressionController,
            "channelController.expressionMeter",
            127
        );
        controller.appendChild(expression.div);

        // Volume controller
        const volume = createCCMeterHelper(
            midiControllers.mainVolume,
            "channelController.volumeMeter",
            100
        );
        controller.appendChild(volume.div);

        // Modulation wheel
        const modulation = createCCMeterHelper(
            midiControllers.modulationWheel,
            "channelController.modulationWheelMeter",
            0
        );
        controller.appendChild(modulation.div);

        // Chorus
        const chorus = createCCMeterHelper(
            midiControllers.chorusDepth,
            "channelController.chorusMeter",
            0
        );
        controller.appendChild(chorus.div);

        // Reverb
        const reverb = createCCMeterHelper(
            midiControllers.reverbDepth,
            "channelController.reverbMeter",
            0
        );
        controller.appendChild(reverb.div);

        // Filter cutoff
        const filterCutoff = createCCMeterHelper(
            midiControllers.brightness,
            "channelController.filterMeter",
            64
        );
        controller.appendChild(filterCutoff.div);

        // Attack time
        const attackTime = createCCMeterHelper(
            midiControllers.attackTime,
            "channelController.attackMeter",
            64
        );
        controller.appendChild(attackTime.div);

        // Release time
        const releaseTime = createCCMeterHelper(
            midiControllers.releaseTime,
            "channelController.releaseMeter",
            64
        );
        controller.appendChild(releaseTime.div);

        // Portamento time
        const portamentoTime = createCCMeterHelper(
            midiControllers.portamentoTime,
            "channelController.portamentoTimeMeter",
            0
        );
        controller.appendChild(portamentoTime.div);

        // Portamento control
        const portamentoControl = createCCMeterHelper(
            midiControllers.portamentoControl,
            "channelController.portamentoControlMeter",
            60,
            false // Don't allow locking portamento control
        );
        controller.appendChild(portamentoControl.div);

        // Resonance
        const filterResonance = createCCMeterHelper(
            midiControllers.filterResonance,
            "channelController.resonanceMeter",
            64
        );
        controller.appendChild(filterResonance.div);

        // Transpose is not a cc, add it manually
        const transpose = new Meter(
            this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.transposeMeter",
            this.locale,
            [channelNumber + 1],
            -36,
            36,
            0,
            true,
            (val) => {
                val = Math.round(val);
                this.synth.transposeChannel(channelNumber, val, true);
                transpose.update(val);
            },
            undefined,
            undefined,
            (active) => {
                // Do hide on multi-port files
                if (channelNumber >= 16) {
                    return;
                }
                this.setCCVisibilityStartingFrom(channelNumber + 1, !active);
            }
        );
        controller.appendChild(transpose.div);

        // Preset controller
        const presetSelector = new Selector(
            [], // Empty for now
            this.locale,
            LOCALE_PATH + "channelController.presetSelector",
            [channelNumber + 1],
            (presetName) => {
                const data = presetName.split(":");
                const bank = parseInt(data[0]);
                this.synth.lockController(
                    channelNumber,
                    ALL_CHANNELS_OR_DIFFERENT_ACTION,
                    false
                );
                if (
                    isSystemXG(this.synth.getMasterParameter("midiSystem")) &&
                    !isValidXGMSB(bank)
                ) {
                    // Msb 0
                    this.synth.controllerChange(
                        channelNumber,
                        midiControllers.bankSelect,
                        0
                    );
                    // Lsb actual
                    this.synth.controllerChange(
                        channelNumber,
                        midiControllers.lsbForControl0BankSelect,
                        bank
                    );
                } else {
                    this.synth.controllerChange(
                        channelNumber,
                        midiControllers.bankSelect,
                        bank
                    );
                }
                this.synth.programChange(channelNumber, parseInt(data[1]));
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
        controller.appendChild(presetSelector.mainButton);

        // Solo button
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
        soloButton.onclick = () => {
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
                    this.controllers[i].soloButton.innerHTML =
                        getMicSvg(ICON_SIZE);
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
        };
        controller.appendChild(soloButton);

        // Mute button
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
        muteButton.onclick = () => {
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
        };
        controller.appendChild(muteButton);

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
        drumsToggle.classList.add("controller_element");
        drumsToggle.classList.add("mute_button");
        drumsToggle.onclick = () => {
            if (
                presetSelector.mainButton.classList.contains("locked_selector")
            ) {
                this.synth.lockController(
                    channelNumber,
                    ALL_CHANNELS_OR_DIFFERENT_ACTION,
                    false
                );
                presetSelector.mainButton.classList.remove("locked_selector");
            }
            this.synth.setDrums(
                channelNumber,
                !this.synth.channelProperties[channelNumber].isDrum
            );
        };
        controller.appendChild(drumsToggle);

        return {
            controller,
            isHidingLocked: false,
            drumsToggle,
            voiceMeter,
            transpose,
            soloButton,
            muteButton,
            preset: presetSelector,
            controllerMeters,
            pitchWheel
        };
    }

    protected updateVoicesAmount() {
        this.voiceMeter.update(this.synth.voicesAmount);

        this.controllers.forEach((controller, i) => {
            // Update channel
            const voices = this.synth.channelProperties[i]?.voicesAmount;
            if (voices === undefined) {
                return;
            }
            controller.voiceMeter.update(voices);
            if (voices < 1 && this.synth.voicesAmount > 0) {
                controller.controller.classList.add("no_voices");
            } else {
                controller.controller.classList.remove("no_voices");
            }
        });
    }

    protected getInstrumentList() {
        this.synth.eventHandler.addEvent(
            "presetListChange",
            "synthui-preset-list-change",
            (e) => {
                const presetList = e;
                this.presetList = presetList;
                this.instrumentList = presetList
                    .filter((p) => !isXGDrums(p.bank) && p.bank !== 128)
                    .sort((a, b) => {
                        if (a.program === b.program) {
                            return a.bank - b.bank;
                        }
                        return a.program - b.program;
                    });
                this.percussionList = presetList
                    .filter((p) => isXGDrums(p.bank) || p.bank === 128)
                    .sort((a, b) => a.program - b.program);

                if (this.percussionList.length === 0) {
                    this.percussionList = this.instrumentList;
                } else if (this.instrumentList.length === 0) {
                    this.instrumentList = this.percussionList;
                }

                this.controllers.forEach((controller, i) => {
                    const list = this.synth.channelProperties[i].isDrum
                        ? this.percussionList
                        : this.instrumentList;
                    controller.preset.reload(list);
                    controller.preset.set(`${list[0].bank}:${list[0].program}`);
                });
            }
        );
    }

    protected setChannelControllerVisibility(
        channelNumber: number,
        isVisible: boolean,
        force = false
    ) {
        if (isVisible) {
            const c = this.controllers[channelNumber];
            if (!c.isHidingLocked || force) {
                c.controller.classList.remove("hidden");
                c.isHidingLocked = force;
            }
        } else {
            const c = this.controllers[channelNumber];
            if (!c.isHidingLocked || force) {
                c.controller.classList.add("hidden");
                c.isHidingLocked = force;
            }
        }
    }
}
