import { type InsertionController, insertionData } from "./effect_params.ts";
import { Meter } from "./synthui_meter.ts";
import { LOCALE_PATH, SynthetizerUI } from "../synthetizer_ui.ts";
import { sendAddress } from "./send_address.ts";
import { Ut } from "../../utils/other.js";

export function createInsertionController(
    this: SynthetizerUI
): InsertionController {
    const insertionEffects = insertionData;

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
            this.synth.setMasterParameter("insertionEffectLock", false);
        }

        const msb = (v >> 8) & 0x7f;
        const lsb = v & 0x7f;

        sendAddress(this.synth, 0x40, 0x03, 0x00, [msb, lsb]);
        if (this.insertionLock) {
            this.synth.setMasterParameter("insertionEffectLock", true);
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
        this.synth.setMasterParameter(
            "insertionEffectLock",
            this.insertionLock
        );
        lock.style.color = this.insertionLock ? "red" : "";
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
        locale: this.locale,
        localePath: LOCALE_PATH + "effectsConfig.insertion.sendLevelToReverb",
        min: 0,
        max: 127,
        initialAndDefault: 40,
        editable: true,
        editCallback: (v) => {
            if (this.insertionLock) {
                this.synth.setMasterParameter("insertionEffectLock", false);
            }
            sendAddress(this.synth, 0x40, 0x03, 0x17, [Math.round(v)]);
            if (this.insertionLock) {
                this.synth.setMasterParameter("insertionEffectLock", true);
            }
        }
    });
    effectSendsWrapper.append(reverb.div);
    const chorus = new Meter({
        locale: this.locale,
        localePath: LOCALE_PATH + "effectsConfig.insertion.sendLevelToChorus",
        min: 0,
        max: 127,
        initialAndDefault: 0,
        editable: true,
        editCallback: (v) => {
            if (this.insertionLock) {
                this.synth.setMasterParameter("insertionEffectLock", false);
            }
            sendAddress(this.synth, 0x40, 0x03, 0x18, [Math.round(v)]);
            if (this.insertionLock) {
                this.synth.setMasterParameter("insertionEffectLock", true);
            }
        }
    });
    effectSendsWrapper.append(chorus.div);
    const delay = new Meter({
        locale: this.locale,
        localePath: LOCALE_PATH + "effectsConfig.insertion.sendLevelToDelay",
        min: 0,
        max: 127,
        initialAndDefault: 0,
        editable: true,
        editCallback: (v) => {
            if (this.insertionLock) {
                this.synth.setMasterParameter("insertionEffectLock", false);
            }
            sendAddress(this.synth, 0x40, 0x03, 0x19, [Math.round(v)]);
            if (this.insertionLock) {
                this.synth.setMasterParameter("insertionEffectLock", true);
            }
        }
    });
    effectSendsWrapper.append(delay.div);

    wrapper.append(effectSendsWrapper);

    // Parameters
    const params = new Map<
        number,
        { controllerWrapper: HTMLElement; controllers: Map<number, Meter> }
    >();
    for (const insertionEffect of insertionEffects) {
        const controllerWrapper = document.createElement("div");
        controllerWrapper.classList.add("effect_wrapper_params");
        Ut.hide(controllerWrapper);
        wrapper.append(controllerWrapper);
        const controllers = new Map<number, Meter>();
        for (const param of insertionEffect.params) {
            // Prevent change!
            const a = param.a;
            const meter = new Meter({
                rawText: param.p + ": ",
                min: param.r?.min ?? 0,
                max: param?.r?.max ?? 127,
                initialAndDefault: param.d,
                editable: true,
                editCallback: (v) => {
                    if (this.insertionLock) {
                        this.synth.setMasterParameter(
                            "insertionEffectLock",
                            false
                        );
                    }
                    sendAddress(this.synth, 0x40, 0x03, a, [Math.round(v)]);
                    if (this.insertionLock) {
                        this.synth.setMasterParameter(
                            "insertionEffectLock",
                            true
                        );
                    }
                },
                transform: param?.td
            });
            controllerWrapper.append(meter.div);
            controllers.set(param.a, meter);
        }

        params.set(insertionEffect.type, {
            controllers,
            controllerWrapper
        });
    }

    return {
        wrapper,
        effectSelector,
        reverb,
        chorus,
        delay,
        toggleLock,
        effects: params
    };
}
