import {
    hideControllers,
    showControllers
} from "./methods/hide_show_controllers.js";
import { setEventListeners } from "./methods/set_event_listeners.js";
import { keybinds } from "../utils/keybinds.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { Ut } from "../utils/other.js";
import { closeNotification } from "../notification/notification.js";
import {
    type ChannelMIDIParameter,
    type ChannelSystemParameter,
    DEFAULT_GLOBAL_SYSTEM_PARAMETERS,
    type EffectChangeEvent,
    type MIDIController,
    MIDIControllers,
    MIDIMessageTypes,
    type MIDIPatchFull,
    MIDIPatchTools,
    MIDIUtils,
    type XGChorusParameterMessage,
    type XGInsertionParameterMessage,
    type XGReverbParameterMessage
} from "spessasynth_core";
import type { Sequencer } from "spessasynth_lib";
import { MIDIDeviceHandler } from "spessasynth_lib";
import type { LocaleManager } from "../manager/locale_manager.ts";
import type { LiveKeyboard } from "../canvas_keyboard/live/live_keyboard.ts";
import { Meter } from "./methods/synthui_meter.ts";
import { getEmptyMicSvg, getVolumeSvg } from "../utils/icons.ts";
import { createAdvancedConfiguration } from "./methods/create_advanced_configuration.ts";
import { Selector } from "./methods/synthui_selector.ts";
import type { Synthesizer } from "../utils/synthesizer.ts";
import {
    type GSChorusController,
    gsChorusEffectData,
    type GSChorusParams,
    type GSDelayController,
    gsDelayEffectData,
    type GSDelayParams,
    type GSInsertionController,
    gsInsertionEffectData,
    type GSReverbController,
    gsReverbEffectData,
    type GSReverbParams
} from "./methods/gs_effect_params.ts";
import { createGSInsertionController } from "./methods/create_gs_insertion_controller.ts";
import { createGSEffectController } from "./methods/create_gs_effect_controller.ts";
import {
    xgChorusData,
    type XGController,
    xgInsertionData,
    xgReverbData,
    xgVariationData
} from "./methods/xg_effect_params.ts";
import { createXGEffectController } from "./methods/create_xg_effect_controller.ts";
import { appendNewController } from "./methods/append_new_controller.ts";
import { UserDrumSetEditor } from "./methods/user_drum_set_editor.ts";
import type { LiveRenderer } from "../renderer/live/live_renderer.ts";
import {
    createConvolverModeToggle,
    createConvolverReverbController
} from "./methods/create_convolver_reverb_controller.ts";
import {
    createXGRouting,
    getXGInsertionLabels
} from "../renderer/base/xg_insertion_labels.ts";

export interface PresetListElement extends MIDIPatchFull {
    stringified: string;
}

export const MONO_ON = "<pre style='color: red;'>M</pre>";
export const POLY_ON = "<pre>P</pre>";

export const LOCALE_PATH = "locale.synthesizerController.";

export type ChannelControllerKey =
    | MIDIController
    | keyof ChannelSystemParameter
    | keyof ChannelMIDIParameter
    // Separated because System and MIDI overlap otherwise
    | "systemKeyShift"
    | "systemFineTune";

export interface ChannelController {
    controller: HTMLDivElement;
    controllerMeters: Map<ChannelControllerKey, Meter>;
    voiceMeter: Meter;
    preset: Selector;
    drumsToggle: HTMLDivElement;
    soloButton: HTMLDivElement;
    muteButton: HTMLDivElement;
    polyMonoButton: HTMLDivElement;
    isHidingLocked: boolean;
}

export const ICON_SIZE = 32;

const controllerGroups: Record<string, ChannelControllerKey[]> = {
    effects: [
        MIDIControllers.reverbDepth,
        MIDIControllers.chorusDepth,
        MIDIControllers.variationDepth
    ],
    volumeEnvelope: [
        MIDIControllers.attackTime,
        MIDIControllers.releaseTime,
        MIDIControllers.decayTime
    ],
    filter: [MIDIControllers.brightness, MIDIControllers.filterResonance],
    portamento: [
        MIDIControllers.portamentoTime,
        MIDIControllers.portamentoControl
    ],
    velocitySense: ["velocitySenseDepth", "velocitySenseOffset"],
    systemParameters: ["systemKeyShift", "systemFineTune", "gain"]
} as const;

export type ControllerGroup = keyof typeof controllerGroups;

/**
 * Synthesizer_ui.js
 * purpose: manages the graphical user interface for the synthesizer
 */

type LibMIDIOutput =
    typeof MIDIDeviceHandler.prototype.outputs extends Map<unknown, infer V>
        ? V
        : never;

export class SynthesizerUI {
    public readonly channelColors: string[];
    public onProgramChange?: (channel: number) => unknown;
    public onTranspose?: () => unknown;
    public onMute: ((channel: number, isMuted: boolean) => unknown)[] = [];
    public outputPorts: {
        primary?: LibMIDIOutput;
        extra: (LibMIDIOutput | undefined)[];
    } = { extra: [] };
    protected readonly synth: Synthesizer;
    protected readonly keyboard: LiveKeyboard;
    protected readonly locale: LocaleManager;
    protected readonly sequencer: Sequencer;
    protected readonly renderer;
    protected readonly voiceMeter: Meter;
    protected readonly volumeController: Meter;
    protected readonly panController: Meter;
    protected readonly transposeController: Meter;
    protected readonly mainMeters: Meter[];
    protected readonly mainButtons: HTMLElement[];
    protected readonly mainControllerDiv: HTMLDivElement;
    protected controllers: ChannelController[] = [];
    protected readonly tabs: {
        channels: HTMLElement;
        gsReverb: HTMLElement;
        gsChorus: HTMLElement;
        gsDelay: HTMLElement;
        gsInsertion: HTMLElement;
        xgReverb: HTMLElement;
        xgChorus: HTMLElement;
        xgVariation: HTMLElement;
        xgInsertion: HTMLElement;
        configuration: HTMLElement;
        gsUserDrumSet: HTMLElement;
    };
    protected readonly effectConfigs: {
        reverb: GSReverbController;
        chorus: GSChorusController;
        delay: GSDelayController;
        insertion: GSInsertionController;
        xgReverb: XGController;
        xgChorus: XGController;
        xgVariation: XGController;
        xgInsertion: XGController;
    };
    protected currentInsertionEffect;
    protected insertionLock = false;
    protected readonly xgRouting = createXGRouting();
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
    protected readonly presets = {
        full: new Array<PresetListElement>(),
        melodic: new Array<PresetListElement>(),
        gsDrum: new Array<PresetListElement>(),
        xgDrum: new Array<PresetListElement>()
    };
    protected readonly userDrumSetEditor;
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
     * @param renderer
     */
    public constructor(
        colors: string[],
        element: HTMLElement,
        localeManager: LocaleManager,
        keyboard: LiveKeyboard,
        synth: Synthesizer,
        seq: Sequencer,
        renderer: LiveRenderer
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
        this.renderer = renderer;

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
            this.voiceMeter = new Meter({
                color: "",
                smooth: true,
                localePath: LOCALE_PATH + "mainVoiceMeter",
                locale: this.locale,
                min: 0,
                max: DEFAULT_GLOBAL_SYSTEM_PARAMETERS.voiceCap,
                def: 0
            });
            this.voiceMeter.div.classList.add("main_controller_element");

            /**
             * Volume controller
             */
            this.volumeController = new Meter({
                color: "",
                smooth: true,
                localePath: LOCALE_PATH + "mainVolumeMeter",
                locale: this.locale,
                min: 0,
                max: 400,
                def: 100,
                onEdit: (v) => {
                    this.synth.setSystemParameter("gain", Math.round(v) / 100);
                    this.volumeController.update(v);
                }
            });
            this.volumeController.div.classList.add("main_controller_element");

            /**
             * Pan controller
             */
            this.panController = new Meter({
                color: "",
                smooth: true,
                localePath: LOCALE_PATH + "mainPanMeter",
                locale: this.locale,
                min: -1,
                max: 1,
                def: 0,
                onEdit: (v) => {
                    this.synth.setSystemParameter("pan", v);
                    this.panController.update(v);
                }
            });
            this.panController.div.classList.add("main_controller_element");

            /**
             * Transpose controller
             */
            this.transposeController = new Meter({
                color: "",
                smooth: true,
                localePath: LOCALE_PATH + "mainTransposeMeter",
                locale: this.locale,
                min: -12,
                max: 12,
                def: 0,
                onEdit: (v) => {
                    const pitch = Math.round(v * 2) / 2;
                    const keyShift = Math.trunc(pitch);
                    // Limit to half semitone precision
                    this.synth.setSystemParameter("keyShift", keyShift);
                    this.synth.setSystemParameter(
                        "fineTune",
                        (pitch - keyShift) * 100
                    );
                    this.transposeController.update(pitch);
                    this.onTranspose?.();
                },
                activeChangeCallback: (active) => {
                    this.setCCVisibilityStartingFrom(0, !active);
                }
            });
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

            // System reset buttons
            const resetSynth = (system: "gs" | "xg") => {
                // Unlock everything
                this.synth.setSystemParameter("drumLock", false);
                if (this.synth.systemParameters.gsReverbLock) {
                    this.effectConfigs.reverb.toggleLock();
                }
                if (this.synth.systemParameters.gsChorusLock) {
                    this.effectConfigs.chorus.toggleLock();
                }
                if (this.synth.systemParameters.gsDelayLock) {
                    this.effectConfigs.delay.toggleLock();
                }
                if (this.synth.systemParameters.gsInsertionLock) {
                    this.effectConfigs.insertion.toggleLock();
                }
                if (this.synth.systemParameters.xgReverbLock) {
                    this.effectConfigs.xgReverb.toggleLock();
                }
                if (this.synth.systemParameters.xgChorusLock) {
                    this.effectConfigs.xgChorus.toggleLock();
                }
                if (this.synth.systemParameters.xgVariationLock) {
                    this.effectConfigs.xgVariation.toggleLock();
                }
                if (this.synth.systemParameters.xgInsertionLock) {
                    this.effectConfigs.xgInsertion.toggleLock();
                }
                if (this.synth.systemParameters.userDrumLock) {
                    this.userDrumSetEditor.toggleLock();
                }
                // Reset transpose
                this.synth.setSystemParameter("keyShift", 0);
                this.synth.setSystemParameter("fineTune", 0);
                this.transposeController.update(0);
                for (const [
                    channelNumber,
                    controller
                ] of this.controllers.entries()) {
                    // CCs
                    for (const meter of controller.controllerMeters.values()) {
                        if (meter.isLocked) {
                            meter.toggleLock();
                        }
                    }
                    const ch = this.synth.midiChannels[channelNumber];
                    // Program
                    if (
                        controller.preset.mainButton.classList.contains(
                            "locked_selector"
                        )
                    ) {
                        ch.setSystemParameter("presetLock", false);
                        controller.preset.mainButton.classList.remove(
                            "locked_selector"
                        );
                    }
                    // Transpose (only key shift)
                    ch.setSystemParameter("keyShift", 0);
                    controller.controllerMeters
                        .get("systemKeyShift")
                        ?.update(0);
                    // Fine tune
                    ch.setSystemParameter("fineTune", 0);
                    controller.controllerMeters.get("systemFineTune")?.reset();
                    // Gain
                    ch.setSystemParameter("gain", 1);
                    controller.controllerMeters.get("gain")?.reset();

                    // Mute/solo
                    controller.soloButton.innerHTML = getEmptyMicSvg(ICON_SIZE);
                    controller.muteButton.innerHTML = getVolumeSvg(ICON_SIZE);
                    controller.muteButton.removeAttribute("is_muted");
                    ch.setSystemParameter("isMuted", false);
                    for (const m of this.onMute) {
                        m?.(channelNumber, false);
                    }

                    // EFX assign
                    ch.lockMIDIParameter("efxAssign", false);

                    // Poly/mono
                    {
                        ch.lockMIDIParameter("polyMode", false);
                        controller.polyMonoButton.setAttribute(
                            "isPoly",
                            "true"
                        );
                        controller.polyMonoButton.innerHTML = POLY_ON;
                    }
                }
                this.soloChannels.clear();
                const resetMessage = MIDIUtils.reset(0, system).data;
                this.synth.systemExclusive(resetMessage);
                this.outputPorts.primary?.port?.send([
                    MIDIMessageTypes.systemExclusive,
                    ...resetMessage
                ]);
            };

            const resetButtons = document.createElement("div");
            resetButtons.classList.add(
                "synthui_button_group",
                "main_controller_element"
            );
            for (const system of ["gs", "xg"] as const) {
                const resetButton = document.createElement("button");
                this.locale.bindObjectProperty(
                    resetButton,
                    "textContent",
                    LOCALE_PATH + `${system}Reset.title`
                );
                this.locale.bindObjectProperty(
                    resetButton,
                    "title",
                    LOCALE_PATH + `${system}Reset.description`
                );
                resetButton.classList.add("synthui_button");
                resetButton.addEventListener("click", () => resetSynth(system));
                resetButtons.append(resetButton);
            }

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
            for (const option of Object.keys(controllerGroups)) {
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
                this.showControllerGroup(groupSelector.value);
            });
            this.groupSelector = groupSelector;

            /**
             * Tab selector
             */
            const tabSelector = document.createElement("select");
            tabSelector.classList.add(
                "main_controller_element",
                "synthui_button"
            );

            this.locale.bindObjectProperty(
                tabSelector,
                "title",
                LOCALE_PATH + "tabs.description"
            );

            // Tabs
            {
                // MIDI Channels (default)
                const channels = document.createElement("option");
                channels.value = "channels";
                this.locale.bindObjectProperty(
                    channels,
                    "textContent",
                    LOCALE_PATH + "tabs.channels"
                );
                tabSelector.append(channels);

                // Configuration
                const configuration = document.createElement("option");
                configuration.value = "configuration";
                this.locale.bindObjectProperty(
                    configuration,
                    "textContent",
                    LOCALE_PATH + "tabs.configuration"
                );
                tabSelector.append(configuration);

                // Effects, shown only for their system
                const createEffectTabs = (names: string[], isXG: boolean) =>
                    names.map((name) => {
                        const option = document.createElement("option");
                        option.value = name;
                        this.locale.bindObjectProperty(
                            option,
                            "textContent",
                            LOCALE_PATH + "tabs." + name
                        );
                        option.hidden =
                            (this.synth.midiParameters.system === "xg") !==
                            isXG;
                        tabSelector.append(option);
                        return option;
                    });
                const gsTabs = createEffectTabs(
                    ["gsReverb", "gsChorus", "gsDelay", "gsInsertion"],
                    false
                );
                const xgTabs = createEffectTabs(
                    ["xgReverb", "xgChorus", "xgVariation", "xgInsertion"],
                    true
                );
                gsTabs.push(...createEffectTabs(["gsUserDrumSet"], false));
                // An open tab stays open, only the option gets hidden
                this.synth.eventHandler.addEvent(
                    "globalParamChange",
                    "synthui-system-change",
                    (e) => {
                        if (e.parameter !== "system") {
                            return;
                        }
                        for (const option of gsTabs) {
                            option.hidden = e.value === "xg";
                        }
                        for (const option of xgTabs) {
                            option.hidden = e.value !== "xg";
                        }
                    }
                );

                tabSelector.addEventListener("change", () => {
                    const selectedTab =
                        tabSelector.value as keyof typeof this.tabs;
                    for (const el of this.mainControllerDiv.querySelectorAll<HTMLElement>(
                        ".synthui_tab"
                    )) {
                        Ut.hide(el);
                    }
                    // Hide group selector (and show only used) if needed
                    Ut.toggle(groupSelector, selectedTab === "channels");
                    Ut.toggle(showOnlyUsedButton, selectedTab === "channels");
                    Ut.show(this.tabs[selectedTab]);
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
            controlsWrapper.append(resetButtons);

            // MIDI Channel specific
            controlsWrapper.append(showOnlyUsedButton);
            controlsWrapper.append(groupSelector);

            // Tab selector
            controlsWrapper.append(tabSelector);

            this.mainMeters = [
                this.volumeController,
                this.panController,
                this.transposeController,
                this.voiceMeter
            ];
            this.mainButtons = [
                midiPanicButton,
                resetButtons,
                showOnlyUsedButton,
                tabSelector,
                groupSelector,
                showControllerButton
            ];
            // Main synth div
            this.uiDiv.append(this.voiceMeter.div);
            this.uiDiv.append(showControllerButton);
            controller.append(controlsWrapper);
            this.mainControllerDiv = controller;
        }

        // Create tabs
        {
            const reverbController =
                (createGSEffectController<GSReverbParams>).call(
                    this,
                    gsReverbEffectData,
                    LOCALE_PATH + "effectsConfig.reverb."
                );
            reverbController.wrapper.append(
                createConvolverModeToggle.call(this)
            );
            // Optional convolver, replaces standard reverb
            const convolverReverbController = this.synth.convolverNode
                ? createConvolverReverbController.call(this)
                : undefined;

            const chorusController =
                (createGSEffectController<GSChorusParams>).call(
                    this,
                    gsChorusEffectData,
                    LOCALE_PATH + "effectsConfig.chorus."
                );
            const delayController =
                (createGSEffectController<GSDelayParams>).call(
                    this,
                    gsDelayEffectData,
                    LOCALE_PATH + "effectsConfig.delay."
                );

            const insertionController = createGSInsertionController.call(this);
            this.currentInsertionEffect = insertionController.effects.get(0)!;

            const xgReverbController = createXGEffectController.call(
                this,
                xgReverbData,
                (parameter, value) =>
                    MIDIUtils.setXGReverbParameter(
                        0,
                        parameter as XGReverbParameterMessage["parameter"],
                        value as number
                    )
            );
            const xgChorusController = createXGEffectController.call(
                this,
                xgChorusData,
                (parameter, value) =>
                    MIDIUtils.setXGChorusParameter(
                        0,
                        parameter as XGChorusParameterMessage["parameter"],
                        value as number
                    )
            );
            const xgVariationController = createXGEffectController.call(
                this,
                xgVariationData,
                (parameter, value) =>
                    MIDIUtils.setXGVariationParameter(0, parameter, value)
            );
            const xgInsertionController = createXGEffectController.call(
                this,
                xgInsertionData,
                (parameter, value, insertionNumber) =>
                    MIDIUtils.setXGInsertionParameter(
                        0,
                        insertionNumber,
                        parameter as XGInsertionParameterMessage["parameter"],
                        value as number
                    )
            );

            const channelController = document.createElement("div");
            channelController.classList.add(
                "main_channel_controller",
                "synthui_tab"
            );

            // Advanced configuration
            const configuration = createAdvancedConfiguration.call(this);

            // User drum set
            this.userDrumSetEditor = new UserDrumSetEditor(
                this.synth,
                this.locale,
                LOCALE_PATH + "effectsConfig.userDrumSet."
            );

            this.effectConfigs = {
                reverb: reverbController,
                chorus: chorusController,
                delay: delayController,
                insertion: insertionController,
                xgReverb: xgReverbController,
                xgChorus: xgChorusController,
                xgVariation: xgVariationController,
                xgInsertion: xgInsertionController
            };

            this.tabs = {
                gsReverb: convolverReverbController ?? reverbController.wrapper,
                gsChorus: chorusController.wrapper,
                gsDelay: delayController.wrapper,
                gsInsertion: insertionController.wrapper,
                xgReverb: xgReverbController.wrapper,
                xgChorus: xgChorusController.wrapper,
                xgVariation: xgVariationController.wrapper,
                xgInsertion: xgInsertionController.wrapper,
                channels: channelController,
                configuration: configuration,
                gsUserDrumSet: this.userDrumSetEditor.wrapper
            };

            // Set the default macros
            // Hall2 default
            this.handleEffectChange({
                effect: "gsReverb",
                value: 4,
                parameter: "macro"
            });
            // Chorus3 default
            this.handleEffectChange({
                effect: "gsChorus",
                value: 3,
                parameter: "macro"
            });
            // Delay1 default
            this.handleEffectChange({
                effect: "gsDelay",
                value: 0,
                parameter: "macro"
            });
            this.mainControllerDiv.append(channelController);
            this.mainControllerDiv.append(this.tabs.gsReverb);
            this.mainControllerDiv.append(chorusController.wrapper);
            this.mainControllerDiv.append(delayController.wrapper);
            this.mainControllerDiv.append(insertionController.wrapper);
            this.mainControllerDiv.append(xgReverbController.wrapper);
            this.mainControllerDiv.append(xgChorusController.wrapper);
            this.mainControllerDiv.append(xgVariationController.wrapper);
            this.mainControllerDiv.append(xgInsertionController.wrapper);
            this.mainControllerDiv.append(configuration);
            this.mainControllerDiv.append(this.userDrumSetEditor.wrapper);
        }

        // Create channel controllers
        for (let i = 0; i < this.synth.midiChannels.length; i++) {
            appendNewController.call(this, i);
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
                    this.synth.setSystemParameter(
                        "blackMIDIMode",
                        !this.synth.systemParameters.blackMIDIMode
                    );
                    this.renderer.renderOneFrame();
                    break;
                }

                case keybinds.midiPanic: {
                    e.preventDefault();
                    this.synth.stopAll(true);
                    break;
                }
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
                Ut.show(e);
            }
        } else {
            for (let i = start; i < this.controllers.length; i++) {
                this.setChannelControllerVisibility(i, false);
            }
            for (const e of this.portDescriptors) {
                Ut.hide(e);
            }
        }
    }

    public setOnlyUsedControllersVisible(enabled: boolean) {
        this.showOnlyUsedEnabled = enabled;
        if (!this.sequencer.midiData) {
            return;
        }
        const insertionButtons = this.effectConfigs.insertion.efxAssignButtons;
        if (!enabled) {
            for (let i = 0; i < this.controllers.length; i++) {
                this.setChannelControllerVisibility(i, true, true);
                this.controllers[i].isHidingLocked = false;
            }
            // Remember about insertion buttons
            for (const btn of insertionButtons) {
                Ut.show(btn);
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
                Ut.show(insertionButtons[i]);
            } else {
                this.setChannelControllerVisibility(i, false, true);
                Ut.hide(insertionButtons[i]);
            }
        }
    }

    public showControllerGroup(groupType: ControllerGroup) {
        for (const cc of Object.values(
            controllerGroups
        ) as (readonly MIDIController[])[]) {
            this.hideCCs(cc);
        }
        this.showCCs(controllerGroups[groupType]);
    }

    protected updatePresetList(presetList: MIDIPatchFull[]) {
        const p = this.presets;
        p.full = presetList.map((p) => ({
            ...p,
            stringified: MIDIPatchTools.toFullMIDIString(p),
            name: p.name.replace(/\d{3}:\d{3}/, "") // Remove those pesky "000:001"
        }));

        const presetListSorted = [...p.full].sort(
            MIDIPatchTools.compare.bind(MIDIPatchTools)
        );
        p.melodic.length = 0;
        p.xgDrum.length = 0;
        p.gsDrum.length = 0;
        for (const preset of presetListSorted) {
            if (preset.isDrum) {
                if (preset.isGMGSDrum) {
                    p.gsDrum.push(preset);
                } else {
                    p.xgDrum.push(preset);
                }
            } else {
                p.melodic.push(preset);
            }
        }
        // Backfill missing drums
        for (const preset of p.xgDrum) {
            if (!p.gsDrum.some((p) => p.program === preset.program)) {
                p.gsDrum.push(preset);
            }
        }
        for (const preset of p.gsDrum) {
            if (!p.xgDrum.some((p) => p.program === preset.program)) {
                p.xgDrum.push(preset);
            }
        }
        if (p.melodic.length === 0) {
            console.warn("No presets found. There may be unexpected behavior!");
        }

        if (p.melodic.length === 0) {
            p.melodic = p.full;
        }
        if (p.xgDrum.length === 0) {
            p.xgDrum = p.full;
        }
        if (p.gsDrum.length === 0) {
            p.gsDrum = p.full;
        }

        // Apply the updates
        this.userDrumSetEditor.updateDrumList(p.gsDrum);
        for (let i = 0; i < this.controllers.length; i++) {
            const controller = this.controllers[i];
            const list = this.synth.midiChannels[i].patch.isDrum
                ? this.synth.midiParameters.system === "gs"
                    ? p.gsDrum
                    : p.xgDrum
                : p.melodic;
            controller.preset.reload(list);
            if (list.length > 0) {
                controller.preset.set(list[0]);
            }
        }
    }

    protected updateVoicesAmount() {
        this.voiceMeter.update(this.synth.voiceCount);

        for (const [i, controller] of this.controllers.entries()) {
            // Update channel
            const voices = this.synth.midiChannels[i]?.voiceCount;
            if (voices === undefined) {
                continue;
            }
            controller.voiceMeter.update(voices);
            controller.controller.classList.toggle(
                "no_voices",
                voices < 1 && this.synth.voiceCount > 0
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
                Ut.show(c.controller);
                c.isHidingLocked = force;
            }
        } else {
            const c = this.controllers[channelNumber];
            if (!c.isHidingLocked || force) {
                Ut.hide(c.controller);
                c.isHidingLocked = force;
            }
        }
    }

    protected updateXGInsertionLabels() {
        const labels = getXGInsertionLabels(this.xgRouting);
        for (const [channel, label] of labels.entries()) {
            this.renderer.setXGInsertion(channel, label);
        }
    }

    protected handleEffectChange(e: EffectChangeEvent) {
        const fx = this.effectConfigs;
        switch (e.effect) {
            case "xgReverb": {
                fx.xgReverb.update(e.parameter, e.value, 0);
                return;
            }
            case "xgChorus": {
                fx.xgChorus.update(e.parameter, e.value, 0);
                return;
            }
            case "xgVariation": {
                fx.xgVariation.update(e.parameter, e.value, 0);
                const variation = this.xgRouting.variation;
                switch (e.parameter) {
                    case "partNumber": {
                        variation.part = e.value;
                        break;
                    }
                    case "type": {
                        variation.type = e.value;
                        break;
                    }
                    case "connection": {
                        variation.insertionMode = e.value === "insertion";
                        break;
                    }
                    default: {
                        return;
                    }
                }
                this.updateXGInsertionLabels();
                return;
            }
            case "xgInsertion": {
                fx.xgInsertion.update(e.parameter, e.value, e.insertionNumber);
                const block = this.xgRouting.insertions[e.insertionNumber];
                if (e.parameter === "partNumber") {
                    block.part = e.value;
                } else if (e.parameter === "type") {
                    block.type = e.value;
                } else {
                    return;
                }
                this.updateXGInsertionLabels();
                return;
            }
        }
        if (e.effect === "gsInsertion") {
            switch (e.parameter) {
                default: {
                    const param = this.currentInsertionEffect.controllers.get(
                        e.parameter
                    );
                    if (!param) {
                        return;
                    }
                    param.update(e.value);
                    break;
                }

                case 0x17: {
                    fx.insertion.reverb.update(e.value);
                    break;
                }

                case 0x18: {
                    fx.insertion.chorus.update(e.value);
                    break;
                }
                case 0x19: {
                    fx.insertion.delay.update(e.value);
                    break;
                }

                case 0: {
                    let targetEffect = e.value;
                    if (!fx.insertion.effects.get(targetEffect)) {
                        // Thru
                        targetEffect = 0;
                    }
                    this.currentInsertionEffect =
                        fx.insertion.effects.get(targetEffect)!;

                    // Hide all except the one we want
                    for (const [key, param] of fx.insertion.effects) {
                        for (const controllerGroup of param.controllerGroups) {
                            controllerGroup.classList.toggle(
                                "hidden",
                                !(targetEffect === key)
                            );
                        }
                    }
                    fx.insertion.effectSelector.value = targetEffect.toString();
                    this.renderer.efxText =
                        gsInsertionEffectData.find(
                            (fx) => fx.type === targetEffect
                        )?.name ?? "Thru";

                    // Reset its effects
                    for (const controller of this.currentInsertionEffect.controllers.values()) {
                        controller.reset();
                    }
                    fx.insertion.reverb.reset();
                    fx.insertion.chorus.reset();
                    fx.insertion.delay.reset();

                    break;
                }
            }
            return;
        }
        if (e.parameter === "macro") {
            switch (e.effect) {
                case "gsReverb": {
                    const macro = gsReverbEffectData.macros[e.value];
                    const meters = fx.reverb;
                    for (const [param, value] of Object.entries(macro)) {
                        if (param === "name") {
                            continue;
                        }
                        const params = gsReverbEffectData.params.find(
                            (p) => p.p === param
                        );
                        if (!params) {
                            continue;
                        }
                        meters[param as GSReverbParams].update(value as number);
                    }
                    meters.macro.value = e.value.toString();
                    return;
                }

                case "gsChorus": {
                    const macro = gsChorusEffectData.macros[e.value];
                    const meters = fx.chorus;
                    for (const [param, value] of Object.entries(macro)) {
                        if (param === "name") {
                            continue;
                        }
                        const params = gsChorusEffectData.params.find(
                            (p) => p.p === param
                        );
                        if (!params) {
                            continue;
                        }
                        meters[param as GSChorusParams].update(value as number);
                    }
                    meters.macro.value = e.value.toString();
                    return;
                }
                case "gsDelay": {
                    const macro = gsDelayEffectData.macros[e.value];
                    const meters = fx.delay;
                    for (const [param, value] of Object.entries(macro)) {
                        if (param === "name") {
                            continue;
                        }
                        const params = gsDelayEffectData.params.find(
                            (p) => p.p === param
                        );
                        if (!params) {
                            continue;
                        }
                        meters[param as GSDelayParams].update(value as number);
                    }
                    meters.macro.value = e.value.toString();
                    return;
                }
            }
        }
        switch (e.effect) {
            case "gsReverb": {
                const param = gsReverbEffectData.params.find(
                    (p) => p.p === e.parameter
                );
                if (!param) {
                    return;
                }
                fx.reverb[e.parameter].update(e.value);
                return;
            }

            case "gsChorus": {
                const param = gsChorusEffectData.params.find(
                    (p) => p.p === e.parameter
                );
                if (!param) {
                    return;
                }
                fx.chorus[e.parameter].update(e.value);
                return;
            }
            case "gsDelay": {
                const param = gsDelayEffectData.params.find(
                    (p) => p.p === e.parameter
                );
                if (!param) {
                    return;
                }
                fx.delay[e.parameter].update(e.value);
                return;
            }
        }
    }

    private showCCs(ccs: readonly ChannelControllerKey[]) {
        for (const cc of ccs) {
            for (const controller of this.controllers) {
                Ut.show(controller.controllerMeters.get(cc)?.div);
            }
        }
    }

    private hideCCs(ccs: readonly ChannelControllerKey[]) {
        for (const cc of ccs) {
            for (const controller of this.controllers) {
                Ut.hide(controller.controllerMeters.get(cc)?.div);
            }
        }
    }
}
