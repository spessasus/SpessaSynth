import {
    type XGBlockData,
    type XGController,
    xgPanDisplay,
    type XGParameter
} from "./xg_effect_params.ts";
import { Meter } from "./synthui_meter.ts";
import { LOCALE_PATH, type SynthesizerUI } from "../synthetizer_ui.ts";
import { Ut } from "../../utils/other.js";
import type { MIDIMessage, XGVariationConnection } from "spessasynth_core";

/**
 * A single effect block in the controller: a type selector with its parameters.
 */
interface XGEffectSection {
    /**
     * Only for the variation and insertion blocks, 127 is off.
     */
    partSelector?: HTMLSelectElement;
    /**
     * Map<parameter number, Meter> for the currently selected type.
     */
    controllers: Map<number, Meter>;
    /**
     * Shows the parameters of the given type with their default values.
     */
    setType: (type: number) => unknown;
}

/**
 * Creates the controller of an XG effect block.
 * @param data The block configuration.
 * @param getMessage Creates the system exclusive message that sets the given parameter.
 */
export function createXGEffectController(
    this: SynthesizerUI,
    data: XGBlockData,
    getMessage: (
        parameter: XGParameter | "connection",
        value: number | XGVariationConnection,
        insertionNumber: number
    ) => MIDIMessage
): XGController {
    let isLocked = false;
    const send = (
        parameter: XGParameter | "connection",
        value: number | XGVariationConnection,
        insertionNumber = 0
    ) => {
        if (isLocked) {
            this.synth.setSystemParameter(data.lockName, false);
        }
        this.synth.systemExclusive(
            getMessage(parameter, value, insertionNumber).data
        );
        if (isLocked) {
            this.synth.setSystemParameter(data.lockName, true);
        }
    };

    const wrapper = document.createElement("div");
    wrapper.classList.add("effect_wrapper", "synthui_tab");
    Ut.hide(wrapper);

    // Title
    const effectTitle = document.createElement("h2");
    this.locale.bindObjectProperty(
        effectTitle,
        "textContent",
        data.localePath + "title"
    );
    wrapper.append(effectTitle);

    // Subtitle
    const effectSubtitle = document.createElement("h4");
    this.locale.bindObjectProperty(
        effectSubtitle,
        "textContent",
        data.localePath + "description"
    );
    wrapper.append(effectSubtitle);

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
        isLocked = !isLocked;
        this.synth.setSystemParameter(data.lockName, isLocked);
        lock.style.color = isLocked ? "red" : "";
    };
    lock.addEventListener("click", toggleLock);

    // Connection (variation only)
    let connectionSelector: HTMLSelectElement | undefined;
    if (data.hasConnection) {
        connectionSelector = document.createElement("select");
        connectionSelector.classList.add("synthui_button");
        this.locale.bindObjectProperty(
            connectionSelector,
            "title",
            data.localePath + "connection.description"
        );
        for (const connection of ["insertion", "system"] as const) {
            const opt = document.createElement("option");
            opt.value = connection;
            this.locale.bindObjectProperty(
                opt,
                "textContent",
                data.localePath + `connection.${connection}`
            );
            connectionSelector.append(opt);
        }
        const selector = connectionSelector;
        selector.addEventListener("change", () =>
            send("connection", selector.value as XGVariationConnection)
        );
    }

    // Shared parameters
    const sharedMeters = new Map<XGParameter, Meter>();
    if (data.shared.length > 0) {
        const sharedWrapper = document.createElement("div");
        sharedWrapper.classList.add(
            "effect_wrapper_params",
            "global_insertion"
        );
        for (const parameter of data.shared) {
            const isPan = parameter === "pan";
            const meter = new Meter({
                color: "",
                locale: this.locale,
                localePath: data.localePath + parameter,
                min: isPan ? 1 : 0,
                max: 127,
                def: parameter === "return" || isPan ? 64 : 0,
                transform: isPan ? xgPanDisplay : undefined,
                onEdit: (v) => send(parameter, Math.round(v))
            });
            sharedWrapper.append(meter.div);
            sharedMeters.set(parameter, meter);
        }
        wrapper.append(sharedWrapper);
    }

    // Effect blocks
    const partSelectors: HTMLSelectElement[] = [];
    const addPartOption = (selector: HTMLSelectElement, channel: number) => {
        const opt = document.createElement("option");
        opt.value = channel.toString();
        this.locale.bindObjectProperty(
            opt,
            "textContent",
            "locale.settings.keyboardSettings.selectedChannel.channelOption",
            [channel + 1]
        );
        opt.style.background = this.channelColors[channel % 16];
        opt.style.color = "rgb(0, 0, 0)";
        // Keep "off" at the end
        selector.lastElementChild?.before(opt);
    };

    const typeWrapper = document.createElement("div");
    typeWrapper.style.display = "flex";
    typeWrapper.style.flexWrap = "wrap";
    wrapper.append(typeWrapper);

    // Only one block is shown at a time
    const blockElements: HTMLElement[][] = [];
    if (data.blockCount > 1) {
        const blockSelector = document.createElement("select");
        blockSelector.classList.add("synthui_button");
        for (let i = 0; i < data.blockCount; i++) {
            const opt = document.createElement("option");
            opt.value = i.toString();
            this.locale.bindObjectProperty(
                opt,
                "textContent",
                data.localePath + "block",
                [i + 1]
            );
            blockSelector.append(opt);
        }
        blockSelector.addEventListener("change", () => {
            const selected = Number.parseInt(blockSelector.value);
            for (const [i, elements] of blockElements.entries()) {
                for (const element of elements) {
                    Ut.toggle(element, i === selected);
                }
            }
        });
        typeWrapper.append(blockSelector);
    }

    const sections: XGEffectSection[] = [];
    for (
        let insertionNumber = 0;
        insertionNumber < data.blockCount;
        insertionNumber++
    ) {
        // Effect selector
        const effectSelector = document.createElement("select");
        effectSelector.classList.add("synthui_button");
        for (const type of data.types) {
            const opt = document.createElement("option");
            opt.textContent = type.name;
            opt.value = type.type.toString();
            effectSelector.append(opt);
        }
        effectSelector.addEventListener("change", () =>
            send("type", Number.parseInt(effectSelector.value), insertionNumber)
        );
        typeWrapper.append(effectSelector);

        // Part number
        let partSelector: HTMLSelectElement | undefined;
        if (data.hasPartNumber) {
            const selector = document.createElement("select");
            selector.classList.add("synthui_button");
            this.locale.bindObjectProperty(
                selector,
                "title",
                data.localePath + "partNumber.description"
            );
            const off = document.createElement("option");
            off.value = "127";
            this.locale.bindObjectProperty(
                off,
                "textContent",
                data.localePath + "partNumber.off"
            );
            selector.append(off);
            for (let i = 0; i < this.synth.midiChannels.length; i++) {
                addPartOption(selector, i);
            }
            selector.value = "127";
            selector.addEventListener("change", () =>
                send(
                    "partNumber",
                    Number.parseInt(selector.value),
                    insertionNumber
                )
            );
            typeWrapper.append(selector);
            partSelectors.push(selector);
            partSelector = selector;
        }

        // Parameters, created for the selected type only
        const paramWrapper = document.createElement("div");
        paramWrapper.classList.add("effect_wrapper_params");
        wrapper.append(paramWrapper);

        const elements = [effectSelector, paramWrapper];
        if (partSelector) {
            elements.push(partSelector);
        }
        for (const element of elements) {
            Ut.toggle(element, insertionNumber === 0);
        }
        blockElements.push(elements);

        const controllers = new Map<number, Meter>();
        const setType = (type: number) => {
            // Resolve like the synthesizer does
            const effect =
                data.types.find((t) => t.type === type) ??
                data.types.find((t) => t.type === (type & 0xff_00)) ??
                data.types.find((t) => t.type === data.fallbackType);
            if (!effect) {
                return;
            }
            effectSelector.value = effect.type.toString();
            controllers.clear();
            paramWrapper.replaceChildren();
            for (const param of effect.params) {
                const index = param.index;
                const meter = new Meter({
                    color: "",
                    rawText: param.name + ": ",
                    min: param.min,
                    max: param.max,
                    def: param.def,
                    transform: param.td,
                    onEdit: (v) => send(index, Math.round(v), insertionNumber)
                });
                paramWrapper.append(meter.div);
                controllers.set(index, meter);
            }
        };
        setType(data.defaultType);

        sections.push({ partSelector, controllers, setType });
    }

    // The part number and Dry/Wet only apply in the insertion connection
    const updateConnectionVisibility = () => {
        const section = sections[0];
        if (!connectionSelector || !section) {
            return;
        }
        const isInsertion = connectionSelector.value === "insertion";
        Ut.toggle(section.partSelector, isInsertion);
        Ut.toggle(section.controllers.get(9)?.div, isInsertion);
    };
    if (connectionSelector) {
        connectionSelector.addEventListener(
            "change",
            updateConnectionVisibility
        );
        typeWrapper.append(connectionSelector);
        updateConnectionVisibility();
    }
    typeWrapper.append(lock);

    const addNewChannel = () => {
        for (const selector of partSelectors) {
            addPartOption(selector, selector.options.length - 1);
        }
    };

    const update = (
        parameter: XGParameter | "connection",
        value: number | XGVariationConnection,
        insertionNumber: number
    ) => {
        if (parameter === "connection") {
            if (connectionSelector) {
                connectionSelector.value = value.toString();
                updateConnectionVisibility();
            }
            return;
        }
        if (typeof value !== "number") {
            return;
        }
        const section = sections[insertionNumber];
        if (!section) {
            return;
        }
        switch (parameter) {
            case "type": {
                section.setType(value);
                updateConnectionVisibility();
                return;
            }

            case "partNumber": {
                const selector = section.partSelector;
                if (!selector) {
                    return;
                }
                selector.value = value.toString();
                // Unknown channel
                if (selector.selectedIndex === -1) {
                    selector.value = "127";
                }
                return;
            }

            default: {
                if (typeof parameter === "number") {
                    section.controllers.get(parameter)?.update(value);
                    return;
                }
                sharedMeters.get(parameter)?.update(value);
            }
        }
    };

    return { wrapper, toggleLock, addNewChannel, update };
}
