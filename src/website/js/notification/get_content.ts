import { createSlider } from "../settings_ui/sliders.js";
import type { NotificationContent } from "./notification.ts";
import type { LocaleManager } from "../locale/locale_manager.ts";

function applyTextContent(
    el: HTMLElement,
    content: NotificationContent,
    locale?: LocaleManager
) {
    if (content.textContent) {
        el.textContent = content.textContent;
    }
    if (content.translatePathTitle) {
        if (!locale) {
            throw new Error(
                "Translate path title provided but no locale provided."
            );
        }
        locale.bindObjectProperty(
            el,
            "textContent",
            content.translatePathTitle + ".title",
            content?.translatePathTitleProps
        );
        locale.bindObjectProperty(
            el,
            "title",
            content.translatePathTitle + ".description",
            content?.translatePathTitleProps
        );
    }
}

export function getContent(
    content: NotificationContent,
    locale?: LocaleManager
): HTMLElement {
    switch (content.type) {
        case "button":
            const btn = document.createElement("button");
            applyTextContent(btn, content, locale);
            applyAttributes(content, [btn]);
            return btn;

        case "text":
            const p = document.createElement("p");
            applyTextContent(p, content, locale);
            applyAttributes(content, [p]);
            return p;

        case "input":
            const inputWrapper = document.createElement("div");
            inputWrapper.classList.add("notification_input_wrapper");
            const input = document.createElement("input");
            applyTextContent(input, content, locale);
            input.addEventListener("keydown", (e) => e.stopPropagation());
            const inputLabel = document.createElement("label");
            applyTextContent(inputLabel, content, locale);

            applyAttributes(content, [input, inputLabel]);
            inputWrapper.append(inputLabel);
            inputWrapper.appendChild(input);
            return inputWrapper;

        case "select":
            const selectWrapper = document.createElement("div");
            selectWrapper.classList.add("notification_input_wrapper");
            const select = document.createElement("select");
            if (content.selectOptions === undefined) {
                throw new Error("Select but no options given?");
            }
            for (const option of Object.entries(content.selectOptions)) {
                const opt = document.createElement("option");
                opt.value = option[0];
                opt.textContent = option[1];
                select.appendChild(opt);
            }
            const selectLabel = document.createElement("label");

            applyTextContent(selectLabel, content, locale);
            applyAttributes(content, [select, selectLabel]);
            selectWrapper.appendChild(selectLabel);
            selectWrapper.appendChild(select);
            return selectWrapper;

        case "file":
            const fileWrapper = document.createElement("label");
            fileWrapper.classList.add("notification_input_wrapper");
            const file = document.createElement("input");
            file.type = "file";
            const fileButton = document.createElement("label");
            fileButton.classList.add("notification_file_button");
            applyTextContent(fileButton, content, locale);

            const fileLabel = document.createElement("label");
            applyTextContent(fileLabel, content, locale);

            applyAttributes(content, [fileButton, file, fileLabel]);
            fileButton.appendChild(file);
            fileWrapper.append(fileLabel);
            fileWrapper.appendChild(fileButton);
            return fileWrapper;

        case "progress":
            const background = document.createElement("div");
            background.classList.add("notification_progress_background");
            const progress = document.createElement("div");
            progress.classList.add("notification_progress");
            applyAttributes(content, [progress, background]);
            background.appendChild(progress);
            return background;

        case "toggle":
            return getSwitch(content, locale);

        case "range":
            const range = document.createElement("input");
            range.type = "range";
            const label = document.createElement("label");
            applyAttributes(content, [range, label]);
            applyTextContent(label, content, locale);
            const slider = createSlider(range, false);
            const wrapper = document.createElement("div");
            wrapper.classList.add("notification_slider_wrapper");
            wrapper.appendChild(label);
            wrapper.appendChild(slider);
            return wrapper;

        default:
            throw new Error("Invalid type.");
    }
}

function applyAttributes(
    content: NotificationContent,
    elements: HTMLElement[]
) {
    if (content.attributes) {
        for (const [key, value] of Object.entries(content.attributes)) {
            for (const element of elements) {
                if (key === "checked") {
                    continue;
                }
                if (key === "onchange") {
                    element.onchange = value as () => unknown;
                } else {
                    element.setAttribute(key, value as string);
                }
            }
        }
    }
    if (content.listeners) {
        for (const [key, value] of Object.entries(content.listeners)) {
            for (const element of elements) {
                element.addEventListener(key, value);
            }
        }
    }
}

function getSwitch(
    content: NotificationContent,
    locale?: LocaleManager
): HTMLLabelElement {
    const switchWrapper = document.createElement("label");
    switchWrapper.classList.add("notification_switch_wrapper");
    const toggleText = document.createElement("label");
    applyTextContent(toggleText, content, locale);

    const toggleInput = document.createElement("input");
    toggleInput.type = "checkbox";
    applyAttributes(content, [toggleText, toggleInput]);

    const toggle = document.createElement("div");
    toggle.classList.add("notification_switch");
    toggle.appendChild(toggleInput);

    const slider = document.createElement("div");
    slider.classList.add("notification_switch_slider");
    toggle.appendChild(slider);

    switchWrapper.appendChild(toggleText);
    switchWrapper.appendChild(toggle);

    if (content.attributes?.checked === "checked") {
        toggleInput.checked = true;
    }
    return switchWrapper;
}
