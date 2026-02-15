import { hideControllers, showControllers } from "./methods/hide_show_controllers.js";
import { toggleDarkMode } from "./methods/toggle_dark_mode.js";
import { setEventListeners } from "./methods/set_event_listeners.js";
import { keybinds } from "../utils/keybinds.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { closeNotification } from "../notification/notification.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    DEFAULT_MASTER_PARAMETERS,
    DEFAULT_PERCUSSION,
    defaultMIDIControllerValues,
    type InterpolationType,
    interpolationTypes,
    type MIDIController,
    midiControllers,
    modulatorSources,
    NON_CC_INDEX_OFFSET,
    type PresetList,
    type PresetListEntry
} from "spessasynth_core";
import type { Sequencer } from "spessasynth_lib";
import type { LocaleManager } from "../locale/locale_manager.ts";
import type { MIDIKeyboard } from "../midi_keyboard/midi_keyboard.ts";
import { Meter } from "./methods/synthui_meter.ts";
import { getDrumsSvg, getEmptyMicSvg, getMicSvg, getMuteSvg, getNoteSvg, getVolumeSvg } from "../utils/icons.ts";
import { showAdvancedConfiguration } from "./methods/advanced_configuration.ts";
import { Selector } from "./methods/synthui_selector.ts";
import type { Synthesizer } from "../utils/synthesizer.ts";

export const MONO_ON = "<pre style='color: red;'>M</pre>";
export const POLY_ON = "<pre>P</pre>";

export const LOCALE_PATH = "locale.synthesizerController.";
export type ControllerGroupType =
    | "effects"
    | "portamento"
    | "volumeEnvelope"
    | "filter";

export interface ChannelController {
    controller: HTMLDivElement;
    controllerMeters: Partial<Record<MIDIController, Meter>>;
    voiceMeter: Meter;
    pitchWheel: Meter;
    transpose: Meter;
    preset: Selector;
    drumsToggle: HTMLDivElement;
    soloButton: HTMLDivElement;
    muteButton: HTMLDivElement;
    polyMonoButton: HTMLDivElement;
    isHidingLocked: boolean;
}

export const ICON_SIZE = 32;

/**
 * Synthesizer_ui.js
 * purpose: manages the graphical user interface for the synthesizer
 */

export class SynthetizerUI {
    public readonly toggleDarkMode = toggleDarkMode.bind(this);
    public readonly channelColors: string[];
    public onProgramChange?: (channel: number) => unknown;
    public onTranspose?: () => unknown;
    protected readonly synth: Synthesizer;
    protected readonly keyboard: MIDIKeyboard;
    protected readonly locale: LocaleManager;
    protected readonly sequencer: Sequencer;
    protected readonly voiceMeter: Meter;
    protected readonly volumeController: Meter;
    protected readonly panController: Meter;
    protected readonly transposeController: Meter;
    protected readonly mainMeters: Meter[];
    protected readonly mainButtons: HTMLElement[];
    protected readonly mainControllerDiv: HTMLDivElement;
    protected controllers: ChannelController[] = [];
    protected ports: HTMLDivElement[] = [];
    protected portDescriptors: HTMLDivElement[] = [];
    protected readonly soloChannels = new Set<number>();
    protected readonly mainDivWrapper: HTMLDivElement;
    protected readonly groupSelector: HTMLSelectElement;
    protected readonly uiDiv: HTMLDivElement;
    protected showOnlyUsedEnabled = false;
    protected isShown = false;
    protected animationId = -1;
    /**
     * For closing the effect window when closing the synthui.
     */
    protected effectsConfigWindow?: number;
    protected instrumentList: PresetList = [];
    protected percussionList: PresetList = [];
    protected presetList: PresetList = [];
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
        keyboard: MIDIKeyboard,
        synth: Synthesizer,
        seq: Sequencer
    ) {
        this.channelColors = colors;
        const wrapper = element;
        this.uiDiv = document.createElement("div");
        this.uiDiv.classList.add("wrapper");
        wrapper.append(this.uiDiv);
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

        this.synth.eventHandler.addEvent(
            "presetListChange",
            "synthui-preset-list-change",
            (e) => {
                this.updatePresetList(e);
            }
        );

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
                    this.onTranspose?.();
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

            midiPanicButton.classList.add(
                "synthui_button",
                "main_controller_element"
            );
            midiPanicButton.addEventListener("click", () =>
                this.synth.stopAll(true)
            );

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

            resetCCButton.classList.add(
                "synthui_button",
                "main_controller_element"
            );
            resetCCButton.addEventListener("click", () => {
                // Unlock everything
                for (const [number, channel] of this.controllers.entries()) {
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

                    // Poly/mono
                    {
                        this.synth.lockController(
                            number,
                            midiControllers.polyModeOn,
                            false
                        );
                        this.synth.lockController(
                            number,
                            midiControllers.monoModeOn,
                            false
                        );
                        channel.polyMonoButton.innerHTML = POLY_ON;
                    }

                    this.synth.muteChannel(number, false);
                }
                this.soloChannels.clear();
                this.synth.resetControllers();
            });

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
            showOnlyUsedButton.classList.add(
                "synthui_button",
                "main_controller_element"
            );
            showOnlyUsedButton.addEventListener("click", () => {
                this.showOnlyUsedEnabled = !this.showOnlyUsedEnabled;
                showOnlyUsedButton.classList.toggle("enabled");
                this.setOnlyUsedControllersVisible(this.showOnlyUsedEnabled);
            });

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
            advancedConfigurationButton.classList.add(
                "synthui_button",
                "main_controller_element"
            );
            advancedConfigurationButton.addEventListener(
                "click",
                showAdvancedConfiguration.bind(this)
            );

            // Shown CC group selector
            const groupSelector = document.createElement("select");
            groupSelector.classList.add(
                "synthui_button",
                "main_controller_element"
            );
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
                groupSelector.append(optionElement);
            }

            groupSelector.addEventListener("change", () => {
                this.showControllerGroup(
                    groupSelector.value as ControllerGroupType
                );
            });
            this.groupSelector = groupSelector;

            /**
             * Interpolation type
             */
            const interpolation = document.createElement("select");
            interpolation.classList.add(
                "main_controller_element",
                "synthui_button"
            );
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
                interpolation.append(linear);

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
                interpolation.append(nearest);

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
                interpolation.append(cubic);

                interpolation.addEventListener("change", () => {
                    this.synth.setMasterParameter(
                        "interpolationType",
                        Number.parseInt(
                            interpolation.value
                        ) as InterpolationType
                    );
                });
            }

            /**
             * Main controller
             */
            const controller = document.createElement("div");
            controller.classList.add("synthui_controller");
            this.uiDiv.append(controller);
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
            showControllerButton.addEventListener("click", () => {
                this.toggleVisibility();
            });

            // Meters
            controlsWrapper.append(this.volumeController.div);
            controlsWrapper.append(this.panController.div);
            controlsWrapper.append(this.transposeController.div);
            // Buttons
            controlsWrapper.append(midiPanicButton);
            controlsWrapper.append(resetCCButton);
            controlsWrapper.append(showOnlyUsedButton);
            controlsWrapper.append(advancedConfigurationButton);
            controlsWrapper.append(groupSelector);
            controlsWrapper.append(interpolation);

            this.mainMeters = [
                this.volumeController,
                this.panController,
                this.transposeController,
                this.voiceMeter
            ];
            this.mainButtons = [
                midiPanicButton,
                resetCCButton,
                showOnlyUsedButton,
                advancedConfigurationButton,
                groupSelector,
                showControllerButton,
                interpolation
            ];
            // Main synth div
            this.uiDiv.append(this.voiceMeter.div);
            this.uiDiv.append(showControllerButton);
            controller.append(controlsWrapper);
            this.mainControllerDiv = controller;
        }

        // Create channel controllers
        for (let i = 0; i < this.synth.channelsAmount; i++) {
            this.appendNewController(i);
        }
        this.setEventListeners();

        window.setInterval(this.updateVoicesAmount.bind(this), 100);
        this.hideControllers();

        this.showControllerGroup("effects");

        document.addEventListener("keydown", (e) => {
            switch (e.key.toLowerCase()) {
                case keybinds.synthesizerUIShow: {
                    e.preventDefault();
                    this.toggleVisibility();
                    break;
                }

                //
                case keybinds.settingsShow: {
                    this.isShown = true;
                    this.toggleVisibility();
                    break;
                }

                case keybinds.blackMidiMode: {
                    e.preventDefault();
                    this.synth.setMasterParameter(
                        "blackMIDIMode",
                        !this.synth.getMasterParameter("blackMIDIMode")
                    );
                    break;
                }

                case keybinds.midiPanic: {
                    e.preventDefault();
                    this.synth.stopAll(true);
                    break;
                }
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

        // Update preset list
        this.updatePresetList(this.synth.presetList);
    }

    public toggleVisibility() {
        if (this.animationId !== -1) {
            window.clearTimeout(this.animationId);
        }
        const controller = document.querySelectorAll(
            ".synthui_controller"
        )[0] as HTMLElement;
        this.isShown = !this.isShown;
        if (this.isShown) {
            controller.style.display = "block";
            document
                .querySelectorAll(".top_part")[0]
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
                .querySelectorAll(".top_part")[0]
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
            for (const e of this.portDescriptors) {
                // Do not show ports that are empty
                e.classList.remove("hidden");
            }
        } else {
            for (let i = start; i < this.controllers.length; i++) {
                this.setChannelControllerVisibility(i, false);
            }
            for (const e of this.portDescriptors) {
                e.classList.add("hidden");
            }
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
        for (const t of mid.tracks) {
            const used = t.channels;
            const port = t.port;
            const offset = mid.portChannelOffsetMap[port];
            for (const v of used) {
                usedChannels.add(v + offset);
            }
        }
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
            midiControllers.reverbDepth,
            midiControllers.chorusDepth,
            midiControllers.variationDepth
        ];
        const envelopeControllers = [
            midiControllers.attackTime,
            midiControllers.releaseTime,
            midiControllers.decayTime
        ];
        const filterControllers = [
            midiControllers.brightness,
            midiControllers.filterResonance
        ];
        const portamentoControllers = [
            midiControllers.portamentoTime,
            midiControllers.portamentoControl
        ];

        this.hideCCs(effectControllers);
        this.hideCCs(portamentoControllers);
        this.hideCCs(filterControllers);
        this.hideCCs(envelopeControllers);
        switch (groupType) {
            case "effects": {
                this.showCCs(effectControllers);
                break;
            }

            case "volumeEnvelope": {
                this.showCCs(envelopeControllers);
                break;
            }

            case "filter": {
                this.showCCs(filterControllers);
                break;
            }

            case "portamento": {
                this.showCCs(portamentoControllers);
            }
        }
    }

    protected updatePresetList(presetList: PresetList) {
        this.presetList = presetList;
        this.instrumentList = presetList
            .filter((p) => !p.isAnyDrums)
            .toSorted(this.presetSort.bind(this));
        this.percussionList = presetList
            .filter((p) => p.isAnyDrums)
            .toSorted(this.presetSort.bind(this));

        if (this.percussionList.length === 0) {
            this.percussionList = this.instrumentList;
        } else if (this.instrumentList.length === 0) {
            this.instrumentList = this.percussionList;
        }

        for (const [i, controller] of this.controllers.entries()) {
            const list = this.synth.channelProperties[i].isDrum
                ? this.percussionList
                : this.instrumentList;
            controller.preset.reload(list);
            if (list.length > 0) {
                controller.preset.set(list[0]);
            }
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
                portElement.addEventListener("click", () => {
                    const port = this.ports[portNum];
                    clearTimeout(timeout);
                    if (port.classList.contains("collapsed")) {
                        port.classList.remove("hidden");
                        timeout = window.setTimeout(() => {
                            port.classList.remove("collapsed");
                        }, ANIMATION_REFLOW_TIME);
                    } else {
                        port.classList.add("collapsed");
                        timeout = window.setTimeout(() => {
                            port.classList.add("hidden");
                        }, 350);
                    }
                });

                // This gets added to the main div, not the port group, to allow closing
                this.mainDivWrapper.append(portElement);
                this.portDescriptors.push(portElement);
            }
        }
        const controller = this.createChannelController(channelNumber);
        this.controllers.push(controller);
        lastPortElement.append(controller.controller);

        // Create a new port group if needed
        if (channelNumber % 16 === 15) {
            this.mainDivWrapper.append(lastPortElement);
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
        controller.append(voiceMeter.div);

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
            const meter = new Meter(
                this.channelColors[channelNumber % this.channelColors.length],
                LOCALE_PATH + localePath,
                this.locale,
                [channelNumber + 1],
                0,
                127,
                defaultMIDIControllerValues[ccNum] >> 7,
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
        const portamentoTime = new Meter(
            this.channelColors[channelNumber % this.channelColors.length],
            LOCALE_PATH + "channelController.portamentoTimeMeter",
            this.locale,
            [channelNumber + 1],
            0,
            127,
            0,
            true,
            (val) => {
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
            () => {
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
            () => {
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
        );
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
                this.onTranspose?.();
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

        return {
            controller,
            isHidingLocked: false,
            drumsToggle,
            voiceMeter,
            transpose,
            soloButton,
            muteButton,
            polyMonoButton,
            preset: presetSelector,
            controllerMeters,
            pitchWheel
        };
    }

    protected updateVoicesAmount() {
        this.voiceMeter.update(this.synth.voicesAmount);

        for (const [i, controller] of this.controllers.entries()) {
            // Update channel
            const voices = this.synth.channelProperties[i]?.voicesAmount;
            if (voices === undefined) {
                continue;
            }
            controller.voiceMeter.update(voices);
            controller.controller.classList.toggle(
                "no_voices",
                voices < 1 && this.synth.voicesAmount > 0
            );
        }
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

    private showCCs(ccs: MIDIController[]) {
        for (const cc of ccs) {
            for (const controller of this.controllers) {
                controller.controllerMeters[cc]?.div.classList.remove("hidden");
            }
        }
    }

    private hideCCs(ccs: MIDIController[]) {
        for (const cc of ccs) {
            for (const controller of this.controllers) {
                controller.controllerMeters[cc]?.div.classList.add("hidden");
            }
        }
    }

    private presetSort(a: PresetListEntry, b: PresetListEntry): number {
        // Force drum presets to be last
        if (a.isGMGSDrum && !b.isGMGSDrum) {
            return 1;
        }
        if (!a.isGMGSDrum && b.isGMGSDrum) {
            return -1;
        }

        // First, sort by program
        if (a.program !== b.program) {
            return a.program - b.program;
        }

        // Next, sort by bankMSB
        if (a.bankMSB !== b.bankMSB) {
            return a.bankMSB - b.bankMSB;
        }

        // Finally, sort by bankLSB
        return a.bankLSB - b.bankLSB;
    }
}
