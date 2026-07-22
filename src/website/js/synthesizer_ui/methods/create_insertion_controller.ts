import {
    type InsertionController,
    insertionEffectData
} from "./effect_params.ts";
import { Meter } from "./synthui_meter.ts";
import { LOCALE_PATH, SynthesizerUI } from "../synthetizer_ui.ts";
import { sendAddress } from "./send_address.ts";
import { Ut } from "../../utils/other.js";
import { MIDIUtils } from "spessasynth_core";

export function createInsertionController(
    this: SynthesizerUI
): InsertionController {
    const insertionEffects = insertionEffectData;

    const wrapper = document.createElement("div");
    wrapper.classList.add("effect_wrapper", "synthui_tab");
    Ut.hide(wrapper);
    // Title
    const effectTitle = document.createElement("h2");
    this.locale.bindObjectProperty(
        effectTitle,
        "textContent",
        LOCALE_PATH + "effectsConfig.insertion.title"
    );
    wrapper.append(effectTitle);

    // Subtitle
    const effectSubtitle = document.createElement("h4");
    this.locale.bindObjectProperty(
        effectSubtitle,
        "textContent",
        LOCALE_PATH + "effectsConfig.insertion.description"
    );
    wrapper.append(effectSubtitle);

    // Type/lock wrapper
    const typeLockWrapper = document.createElement("div");
    typeLockWrapper.style.display = "flex";
    typeLockWrapper.style.flexWrap = "wrap";
    wrapper.append(typeLockWrapper);

    // Effect selector
    const effectSelector = document.createElement("select");
    effectSelector.classList.add("synthui_button");
    for (const insertionEffect of insertionEffects) {
        const opt = document.createElement("option");
        opt.textContent = insertionEffect.name;
        opt.value = insertionEffect.type.toString();
        effectSelector.append(opt);
    }
    effectSelector.addEventListener("change", () => {
        const v = Number.parseInt(effectSelector.value);
        if (this.insertionLock) {
            this.synth.setSystemParameter("insertionEffectLock", false);
        }

        const msb = (v >> 8) & 0x7f;
        const lsb = v & 0x7f;

        sendAddress(this.synth, 0x40, 0x03, 0x00, [msb, lsb]);
        if (this.insertionLock) {
            this.synth.setSystemParameter("insertionEffectLock", true);
        }
    });
    typeLockWrapper.append(effectSelector);

    // Lock
    const lock = document.createElement("button");
    lock.classList.add("synthui_button");
    this.locale.bindObjectProperty(
        lock,
        "textContent",
        LOCALE_PATH + "effectsConfig.toggleLock.title"
    );
    this.locale.bindObjectProperty(
        lock,
        "title",
        LOCALE_PATH + "effectsConfig.toggleLock.description"
    );
    const toggleLock = () => {
        this.insertionLock = !this.insertionLock;
        this.synth.setSystemParameter(
            "insertionEffectLock",
            this.insertionLock
        );
        lock.style.color = this.insertionLock ? "red" : "";
        // Lock the buttons as well
        for (const channel of this.synth.midiChannels) {
            channel.lockMIDIParameter("efxAssign", this.insertionLock);
        }
    };
    lock.addEventListener("click", toggleLock);
    typeLockWrapper.append(lock);

    // Effect sends
    const effectSendsWrapper = document.createElement("div");
    effectSendsWrapper.classList.add(
        "effect_wrapper_params",
        "global_insertion"
    );
    const reverb = new Meter({
        color: "",
        locale: this.locale,
        localePath: LOCALE_PATH + "effectsConfig.insertion.sendLevelToReverb",
        min: 0,
        max: 127,
        def: 40,
        onEdit: (v) => {
            if (this.insertionLock) {
                this.synth.setSystemParameter("insertionEffectLock", false);
            }
            sendAddress(this.synth, 0x40, 0x03, 0x17, [Math.round(v)]);
            if (this.insertionLock) {
                this.synth.setSystemParameter("insertionEffectLock", true);
            }
        }
    });
    effectSendsWrapper.append(reverb.div);
    const chorus = new Meter({
        color: "",
        locale: this.locale,
        localePath: LOCALE_PATH + "effectsConfig.insertion.sendLevelToChorus",
        min: 0,
        max: 127,
        def: 0,
        onEdit: (v) => {
            if (this.insertionLock) {
                this.synth.setSystemParameter("insertionEffectLock", false);
            }
            sendAddress(this.synth, 0x40, 0x03, 0x18, [Math.round(v)]);
            if (this.insertionLock) {
                this.synth.setSystemParameter("insertionEffectLock", true);
            }
        }
    });
    effectSendsWrapper.append(chorus.div);
    const delay = new Meter({
        color: "",
        locale: this.locale,
        localePath: LOCALE_PATH + "effectsConfig.insertion.sendLevelToDelay",
        min: 0,
        max: 127,
        def: 0,
        onEdit: (v) => {
            if (this.insertionLock) {
                this.synth.setSystemParameter("insertionEffectLock", false);
            }
            sendAddress(this.synth, 0x40, 0x03, 0x19, [Math.round(v)]);
            if (this.insertionLock) {
                this.synth.setSystemParameter("insertionEffectLock", true);
            }
        }
    });
    effectSendsWrapper.append(delay.div);

    wrapper.append(effectSendsWrapper);

    // Parameters
    const params = new Map<
        number,
        { controllerGroups: HTMLElement[]; controllers: Map<number, Meter> }
    >();
    for (const insertionEffect of insertionEffects) {
        const controllers = new Map<number, Meter>();
        const controllerGroups = new Array<HTMLElement>();
        for (const paramGroup of insertionEffect.params) {
            const controllerGroup = document.createElement("div");
            controllerGroup.classList.add("effect_wrapper_params");
            Ut.hide(controllerGroup);
            wrapper.append(controllerGroup);
            controllerGroups.push(controllerGroup);

            for (const param of paramGroup) {
                // Prevent change!
                const a = param.a;
                const meter = new Meter({
                    color: "",
                    rawText: param.p + ": ",
                    min: param.r?.min ?? 0,
                    max: param?.r?.max ?? 127,
                    def: param.d,
                    onEdit: (v) => {
                        if (this.insertionLock) {
                            this.synth.setSystemParameter(
                                "insertionEffectLock",
                                false
                            );
                        }
                        sendAddress(this.synth, 0x40, 0x03, a, [Math.round(v)]);
                        if (this.insertionLock) {
                            this.synth.setSystemParameter(
                                "insertionEffectLock",
                                true
                            );
                        }
                    },
                    transform: param?.td
                });
                controllerGroup.append(meter.div);
                controllers.set(param.a, meter);
            }
        }
        params.set(insertionEffect.type, {
            controllers,
            controllerGroups: controllerGroups
        });
    }

    // -----------------
    // EFX ASSIGN SECTION
    // ------------------

    // EFX assign title
    const efxAssignTitle = document.createElement("h2");
    this.locale.bindObjectProperty(
        efxAssignTitle,
        "textContent",
        LOCALE_PATH + "effectsConfig.insertion.activeChannels.title"
    );
    wrapper.append(efxAssignTitle);

    // EFX assign subtitle
    const efxAssignSubtitle = document.createElement("h4");
    this.locale.bindObjectProperty(
        efxAssignSubtitle,
        "textContent",
        LOCALE_PATH + "effectsConfig.insertion.activeChannels.description"
    );
    wrapper.append(efxAssignSubtitle);

    // EFX assign buttons
    const efxAssignButtons = new Array<HTMLDivElement>();

    // Wrapped, so the channel number stays as set
    const createEFXAssign = (channelNumber: number) => {
        // Create the button here
        const efxAssign = document.createElement("div");
        efxAssign.innerHTML = `<pre>${channelNumber + 1}</pre>`;
        this.locale.bindObjectProperty(
            efxAssign,
            "title",
            LOCALE_PATH + "channelController.insertionEffectButton.description",
            [channelNumber + 1]
        );
        efxAssign.classList.add("controller_element", "mute_button");

        // Style border after channel color
        efxAssign.style.setProperty(
            "--btn-border-color",
            this.channelColors[channelNumber % 16]
        );

        efxAssign.addEventListener("click", () => {
            const isFX = !efxAssign.classList.contains("red");
            const ch = channelNumber % 16;
            const offset = channelNumber - ch;
            if (this.insertionLock) {
                this.synth.midiChannels[channelNumber].lockMIDIParameter(
                    "efxAssign",
                    false
                );
            }
            sendAddress(
                this.synth,
                0x40,
                0x40 | MIDIUtils.channelToSyx(channelNumber),
                0x22,
                isFX ? [1] : [0],
                offset
            );
            if (this.insertionLock) {
                this.synth.midiChannels[channelNumber].lockMIDIParameter(
                    "efxAssign",
                    true
                );
            }
        });
        return efxAssign;
    };

    let channelNumber = 0;
    let efxAssignWrapper: HTMLDivElement | null = null;
    const addNewChannel = () => {
        if (channelNumber % 16 === 0) {
            // Add a new port (new row)
            efxAssignWrapper = document.createElement("div");
            efxAssignWrapper.classList.add(
                "effect_wrapper_params",
                "efx_assign"
            );
            wrapper.append(efxAssignWrapper);
        }

        // Sanity check
        if (!efxAssignWrapper) {
            return;
        }

        const efxAssign = createEFXAssign(channelNumber);
        efxAssignWrapper.append(efxAssign);
        efxAssignButtons.push(efxAssign);
        channelNumber++;
    };
    // Create first 16 sends
    for (let i = 0; i < 16; i++) {
        addNewChannel();
    }

    return {
        wrapper,
        effectSelector,
        reverb,
        chorus,
        delay,
        efxAssignButtons,
        addNewChannel,
        toggleLock,
        effects: params
    };
}
