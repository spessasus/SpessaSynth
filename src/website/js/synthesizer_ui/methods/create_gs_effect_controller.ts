import type {
    GSChorusParams,
    GSDelayParams,
    GSParamType,
    GSReverbParams
} from "./gs_effect_params.ts";
import { Meter } from "./synthui_meter.ts";
import { LOCALE_PATH, SynthesizerUI } from "../synthetizer_ui.ts";
import { Ut } from "../../utils/other.js";
import type { MIDIMessage } from "spessasynth_core";

export function createGSEffectController<
    K extends GSDelayParams | GSChorusParams | GSReverbParams
>(
    this: SynthesizerUI,
    data: GSParamType<K>,
    path: string,
    getMessage: (parameter: K | "macro", value: number) => MIDIMessage
): Record<K, Meter> & {
    wrapper: HTMLElement;
    macro: HTMLSelectElement;
    toggleLock: () => unknown;
} {
    const wrapper = document.createElement("div");
    wrapper.classList.add("effect_wrapper", "synthui_tab");
    Ut.hide(wrapper);
    // Title
    const effectTitle = document.createElement("h2");
    this.locale.bindObjectProperty(effectTitle, "textContent", path + "title");
    wrapper.append(effectTitle);

    // Subtitle
    const effectSubtitle = document.createElement("h4");
    this.locale.bindObjectProperty(
        effectSubtitle,
        "textContent",
        path + "description"
    );
    wrapper.append(effectSubtitle);

    // Gain
    const gainWrapper = document.createElement("div");
    wrapper.append(gainWrapper);
    const gainLevel = new Meter({
        color: "",
        locale: this.locale,
        localePath: path + "gain",
        def: 1,
        min: 0,
        max: 10,
        transform: (value) => `${Math.floor(value * 100)}%`,
        onEdit: (value) => {
            const vRounded = Math.round(value * 100) / 100;
            this.synth.setSystemParameter(data.gainName, vRounded);
            gainLevel.update(vRounded);
        }
    });
    gainWrapper.append(gainLevel.div);

    // Macro/lock wrapper
    const macroLockWrapper = document.createElement("div");
    macroLockWrapper.style.display = "flex";
    macroLockWrapper.style.flexWrap = "wrap";
    wrapper.append(macroLockWrapper);

    let isEffectLocked = false;
    const send = (parameter: K | "macro", value: number) => {
        if (isEffectLocked) {
            this.synth.setSystemParameter(data.lockName, false);
        }
        this.synth.systemExclusive(getMessage(parameter, value).data);
        if (isEffectLocked) {
            this.synth.setSystemParameter(data.lockName, true);
        }
    };

    // Macro
    const macroSelector = document.createElement("select");
    macroSelector.classList.add("synthui_button");
    for (const [i, name] of data.macros.entries()) {
        const opt = document.createElement("option");
        opt.textContent = name;
        opt.value = i.toString();
        macroSelector.append(opt);
    }
    macroSelector.addEventListener("change", () => {
        send("macro", Number.parseInt(macroSelector.value));
    });
    macroLockWrapper.append(macroSelector);

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
        isEffectLocked = !isEffectLocked;
        this.synth.setSystemParameter(data.lockName, isEffectLocked);
        lock.style.color = isEffectLocked ? "red" : "";
    };
    lock.addEventListener("click", toggleLock);
    macroLockWrapper.append(lock);

    // Parameters
    const paramWrapper = document.createElement("div");
    paramWrapper.classList.add("effect_wrapper_params");
    wrapper.append(paramWrapper);
    const r: Partial<Record<K, Meter>> = {};
    for (const param of data.params) {
        const meter = new Meter({
            color: "",
            localePath: path + param.p,
            locale: this.locale,
            min: param.r?.min ?? 0,
            max: param?.r?.max ?? 127,
            def: 0,
            onEdit: (v) => {
                send(param.p, Math.round(v));
            },
            transform: param?.td
        });
        paramWrapper.append(meter.div);
        r[param.p] = meter;
    }
    return {
        ...(r as Record<K, Meter>),
        wrapper,
        macro: macroSelector,
        toggleLock
    };
}
