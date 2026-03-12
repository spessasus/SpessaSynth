import type {
    ChorusParams,
    DelayParams,
    ParamType,
    ReverbParams
} from "./effect_params.ts";
import { Meter } from "./synthui_meter.ts";
import { sendAddress } from "./send_address.ts";
import { LOCALE_PATH, SynthetizerUI } from "../synthetizer_ui.ts";

export function createEffectController<
    K extends DelayParams | ChorusParams | ReverbParams
>(
    this: SynthetizerUI,
    data: ParamType<K>,
    path: string
): Record<K, Meter> & {
    wrapper: HTMLElement;
    macro: HTMLSelectElement;
    toggleLock: () => unknown;
} {
    const wrapper = document.createElement("div");
    wrapper.classList.add("effect_wrapper", "synthui_tab", "hidden");
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

    // Macro/lock wrapper
    const macroLockWrapper = document.createElement("div");
    macroLockWrapper.style.display = "flex";
    macroLockWrapper.style.flexWrap = "wrap";
    wrapper.append(macroLockWrapper);

    let isEffectLocked = false;

    // Macro
    const macroSelector = document.createElement("select");
    macroSelector.classList.add("synthui_button");
    for (let i = 0; i < data.macros.length; i++) {
        const macro = data.macros[i];
        const opt = document.createElement("option");
        opt.textContent = macro.name;
        opt.value = i.toString();
        macroSelector.append(opt);
    }
    const a = data.macroAddress;

    macroSelector.addEventListener("change", () => {
        const v = Number.parseInt(macroSelector.value);
        if (isEffectLocked) {
            this.synth.setMasterParameter(data.lockName, false);
        }

        sendAddress(this.synth, 0x40, 0x01, a, [v]);
        if (isEffectLocked) {
            this.synth.setMasterParameter(data.lockName, true);
        }
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
        this.synth.setMasterParameter(data.lockName, isEffectLocked);
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
        // Prevent change!
        const a = param.a;
        const meter = new Meter({
            color: "",
            localePath: path + param.p,
            locale: this.locale,
            min: param.r?.min ?? 0,
            max: param?.r?.max ?? 127,
            initialAndDefault: 0,
            editable: true,
            editCallback: (v) => {
                if (isEffectLocked) {
                    this.synth.setMasterParameter(data.lockName, false);
                }
                sendAddress(this.synth, 0x40, 0x01, a, [Math.round(v)]);
                if (isEffectLocked) {
                    this.synth.setMasterParameter(data.lockName, true);
                }
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
