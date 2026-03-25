import {
    hideControllers,
    showControllers
} from "./methods/hide_show_controllers.js";
import { toggleDarkMode } from "./methods/toggle_dark_mode.js";
import { setEventListeners } from "./methods/set_event_listeners.js";
import { keybinds } from "../utils/keybinds.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { Ut } from "../utils/other.js";
import { closeNotification } from "../notification/notification.js";
import {
    ALL_CHANNELS_OR_DIFFERENT_ACTION,
    DEFAULT_MASTER_PARAMETERS,
    type EffectChangeCallback,
    type MIDIController,
    midiControllers,
    type PresetList,
    type PresetListEntry
} from "spessasynth_core";
import type { Sequencer } from "spessasynth_lib";
import type { LocaleManager } from "../locale/locale_manager.ts";
import type { MIDIKeyboard } from "../midi_keyboard/midi_keyboard.ts";
import { Meter } from "./methods/synthui_meter.ts";
import { getEmptyMicSvg, getVolumeSvg } from "../utils/icons.ts";
import { createAdvancedConfiguration } from "./methods/create_advanced_configuration.ts";
import { Selector } from "./methods/synthui_selector.ts";
import type { Synthesizer } from "../utils/synthesizer.ts";
import {
    type ChorusController,
    chorusEffectData,
    type ChorusParams,
    type DelayController,
    delayEffectData,
    type DelayParams,
    type InsertionController,
    insertionEffectData,
    type ReverbController,
    reverbEffectData,
    type ReverbParams
} from "./methods/effect_params.ts";
import { createInsertionController } from "./methods/create_insertion_controller.ts";
import { createEffectController } from "./methods/create_effect_controller.ts";
import { appendNewController } from "./methods/append_new_controller.ts";
import type { Renderer } from "../renderer/renderer.ts";

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
    insertionEffectButton: HTMLDivElement;
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
    protected readonly renderer: Renderer;
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
        reverb: HTMLElement;
        chorus: HTMLElement;
        delay: HTMLElement;
        insertion: HTMLElement;
        configuration: HTMLElement;
    };
    protected readonly effectConfigs: {
        reverb: ReverbController;
        chorus: ChorusController;
        delay: DelayController;
        insertion: InsertionController;
    };
    protected currentInsertionEffect;
    protected insertionLock = false;
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
     * @param renderer
     */
    public constructor(
        colors: string[],
        element: HTMLElement,
        localeManager: LocaleManager,
        keyboard: MIDIKeyboard,
        synth: Synthesizer,
        seq: Sequencer,
        renderer: Renderer
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
                localePath: LOCALE_PATH + "mainVoiceMeter",
                locale: this.locale,
                min: 0,
                max: DEFAULT_MASTER_PARAMETERS.voiceCap,
                initialAndDefault: 0
            });
            this.voiceMeter.bar.classList.add("voice_meter_bar_smooth");
            this.voiceMeter.div.classList.add("main_controller_element");

            /**
             * Volume controller
             */
            this.volumeController = new Meter({
                color: "",
                localePath: LOCALE_PATH + "mainVolumeMeter",
                locale: this.locale,
                min: 0,
                max: 400,
                initialAndDefault: 100,
                editable: true,
                editCallback: (v) => {
                    this.synth.setMasterParameter(
                        "masterGain",
                        Math.round(v) / 100
                    );
                    this.volumeController.update(v);
                }
            });
            this.volumeController.bar.classList.add("voice_meter_bar_smooth");
            this.volumeController.div.classList.add("main_controller_element");

            /**
             * Pan controller
             */
            this.panController = new Meter({
                color: "",
                localePath: LOCALE_PATH + "mainPanMeter",
                locale: this.locale,
                min: -1,
                max: 1,
                initialAndDefault: 0,
                editable: true,
                editCallback: (v) => {
                    this.synth.setMasterParameter("masterPan", v);
                    this.panController.update(v);
                }
            });
            this.panController.bar.classList.add("voice_meter_bar_smooth");
            this.panController.div.classList.add("main_controller_element");

            /**
             * Transpose controller
             */
            this.transposeController = new Meter({
                color: "",
                localePath: LOCALE_PATH + "mainTransposeMeter",
                locale: this.locale,
                min: -12,
                max: 12,
                initialAndDefault: 0,
                editable: true,
                editCallback: (v) => {
                    // Limit to half semitone precision
                    this.synth.setMasterParameter(
                        "transposition",
                        Math.round(v * 2) / 2
                    );
                    this.transposeController.update(Math.round(v * 2) / 2);
                    this.onTranspose?.();
                },
                activeChangeCallback: (active) => {
                    this.setCCVisibilityStartingFrom(0, !active);
                }
            });
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
                this.synth.setMasterParameter("drumLock", false);
                this.synth.setMasterParameter("customVibratoLock", false);
                if (this.synth.getMasterParameter("reverbLock")) {
                    this.effectConfigs.reverb.toggleLock();
                }
                if (this.synth.getMasterParameter("chorusLock")) {
                    this.effectConfigs.chorus.toggleLock();
                }
                if (this.synth.getMasterParameter("delayLock")) {
                    this.effectConfigs.delay.toggleLock();
                }
                if (this.synth.getMasterParameter("insertionEffectLock")) {
                    this.effectConfigs.insertion.toggleLock();
                }
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

                // Reverb
                const reverb = document.createElement("option");
                reverb.value = "reverb";
                this.locale.bindObjectProperty(
                    reverb,
                    "textContent",
                    LOCALE_PATH + "tabs.reverb"
                );
                tabSelector.append(reverb);

                // Chorus
                const chorus = document.createElement("option");
                chorus.value = "chorus";
                this.locale.bindObjectProperty(
                    chorus,
                    "textContent",
                    LOCALE_PATH + "tabs.chorus"
                );
                tabSelector.append(chorus);

                // Delay
                const delay = document.createElement("option");
                delay.value = "delay";
                this.locale.bindObjectProperty(
                    delay,
                    "textContent",
                    LOCALE_PATH + "tabs.delay"
                );
                tabSelector.append(delay);

                const insertion = document.createElement("option");
                insertion.value = "insertion";
                this.locale.bindObjectProperty(
                    insertion,
                    "textContent",
                    LOCALE_PATH + "tabs.insertion"
                );
                tabSelector.append(insertion);

                tabSelector.addEventListener("change", () => {
                    const selectedTab =
                        tabSelector.value as keyof typeof this.tabs;
                    for (const el of this.mainControllerDiv.querySelectorAll<HTMLElement>(
                        ".synthui_tab"
                    )) {
                        Ut.hide(el);
                    }
                    // Hide group selector (and show only used) if needed
                    Ut.toggle(groupSelector, selectedTab !== "channels");
                    Ut.toggle(showOnlyUsedButton, selectedTab !== "channels");
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
            controlsWrapper.append(resetCCButton);

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
                resetCCButton,
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
                (createEffectController<ReverbParams>).call(
                    this,
                    reverbEffectData,
                    LOCALE_PATH + "effectsConfig.reverb."
                );

            const chorusController =
                (createEffectController<ChorusParams>).call(
                    this,
                    chorusEffectData,
                    LOCALE_PATH + "effectsConfig.chorus."
                );
            const delayController = (createEffectController<DelayParams>).call(
                this,
                delayEffectData,
                LOCALE_PATH + "effectsConfig.delay."
            );

            const insertionController = createInsertionController.call(this);
            this.currentInsertionEffect = insertionController.effects.get(0)!;

            const channelController = document.createElement("div");
            channelController.classList.add(
                "main_channel_controller",
                "synthui_tab"
            );

            // Advanced configuration
            const configuration = createAdvancedConfiguration.call(this);

            this.effectConfigs = {
                reverb: reverbController,
                chorus: chorusController,
                delay: delayController,
                insertion: insertionController
            };

            this.tabs = {
                reverb: reverbController.wrapper,
                chorus: chorusController.wrapper,
                delay: delayController.wrapper,
                insertion: insertionController.wrapper,
                channels: channelController,
                configuration: configuration
            };

            // Set the default macros
            // Hall2 default
            this.handleEffectChange({
                effect: "reverb",
                value: 4,
                parameter: "macro"
            });
            // Chorus3 default
            this.handleEffectChange({
                effect: "chorus",
                value: 3,
                parameter: "macro"
            });
            // Delay1 default
            this.handleEffectChange({
                effect: "delay",
                value: 0,
                parameter: "macro"
            });
            this.mainControllerDiv.append(channelController);
            this.mainControllerDiv.append(reverbController.wrapper);
            this.mainControllerDiv.append(chorusController.wrapper);
            this.mainControllerDiv.append(delayController.wrapper);
            this.mainControllerDiv.append(insertionController.wrapper);
            this.mainControllerDiv.append(this.tabs.configuration);
        }

        // Create channel controllers
        for (let i = 0; i < this.synth.channelsAmount; i++) {
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
            .sort(this.presetSort.bind(this));
        this.percussionList = presetList
            .filter((p) => p.isAnyDrums)
            .sort(this.presetSort.bind(this));

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

    protected handleEffectChange(e: EffectChangeCallback) {
        const fx = this.effectConfigs;
        if (e.effect === "insertion") {
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
                        insertionEffectData.find(
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

                case -1: {
                    this.controllers[
                        e.value
                    ].insertionEffectButton.classList.add("red");
                    break;
                }

                case -2: {
                    this.controllers[
                        e.value
                    ].insertionEffectButton.classList.remove("red");
                    break;
                }
            }
            return;
        }
        if (e.parameter === "macro") {
            switch (e.effect) {
                case "reverb": {
                    const macro = reverbEffectData.macros[e.value];
                    const meters = fx.reverb;
                    for (const [param, value] of Object.entries(macro)) {
                        if (param === "name") {
                            continue;
                        }
                        const params = reverbEffectData.params.find(
                            (p) => p.p === param
                        );
                        if (!params) {
                            continue;
                        }
                        meters[param as ReverbParams].update(value as number);
                    }
                    meters.macro.value = e.value.toString();
                    return;
                }

                case "chorus": {
                    const macro = chorusEffectData.macros[e.value];
                    const meters = fx.chorus;
                    for (const [param, value] of Object.entries(macro)) {
                        if (param === "name") {
                            continue;
                        }
                        const params = chorusEffectData.params.find(
                            (p) => p.p === param
                        );
                        if (!params) {
                            continue;
                        }
                        meters[param as ChorusParams].update(value as number);
                    }
                    meters.macro.value = e.value.toString();
                    return;
                }
                case "delay": {
                    const macro = delayEffectData.macros[e.value];
                    const meters = fx.delay;
                    for (const [param, value] of Object.entries(macro)) {
                        if (param === "name") {
                            continue;
                        }
                        const params = delayEffectData.params.find(
                            (p) => p.p === param
                        );
                        if (!params) {
                            continue;
                        }
                        meters[param as DelayParams].update(value as number);
                    }
                    meters.macro.value = e.value.toString();
                    return;
                }
            }
        }
        switch (e.effect) {
            case "reverb": {
                const param = reverbEffectData.params.find(
                    (p) => p.p === e.parameter
                );
                if (!param) {
                    return;
                }
                fx.reverb[e.parameter].update(e.value);
                return;
            }

            case "chorus": {
                const param = chorusEffectData.params.find(
                    (p) => p.p === e.parameter
                );
                if (!param) {
                    return;
                }
                fx.chorus[e.parameter].update(e.value);
                return;
            }
            case "delay": {
                const param = delayEffectData.params.find(
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

    private showCCs(ccs: MIDIController[]) {
        for (const cc of ccs) {
            for (const controller of this.controllers) {
                Ut.show(controller.controllerMeters[cc]?.div);
            }
        }
    }

    private hideCCs(ccs: MIDIController[]) {
        for (const cc of ccs) {
            for (const controller of this.controllers) {
                Ut.hide(controller.controllerMeters[cc]?.div);
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
