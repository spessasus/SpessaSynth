import { createSlider } from '../settings_ui/sliders.js'

/**
 * @param el {HTMLElement}
 * @param content {NotificationContent}
 * @param locale {LocaleManager}
 */
function applyTextContent(el, content, locale)
{
    if(content.textContent)
    {
        el.textContent = content.textContent;
    }
    if(content.translatePathTitle)
    {
        if(!locale)
        {
            throw new Error("Translate path title provided but no locale provided.");
        }
        locale.bindObjectProperty(el, "textContent", content.translatePathTitle + ".title");
        locale.bindObjectProperty(el, "title", content.translatePathTitle + ".description");
    }
}

/**
 * @param content {NotificationContent}
 * @param locale {LocaleManager}
 * @returns {HTMLElement}
 */
export function getContent(content, locale)
{
    switch(content.type)
    {
        case "button":
            const btn = document.createElement("button");
            applyTextContent(btn, content, locale);
            applyAttributes(content, [btn])
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
            input.addEventListener("keydown", e => e.stopPropagation());
            const inputLabel = document.createElement("label");
            applyTextContent(inputLabel, content, locale);

            applyAttributes(content, [input, inputLabel]);
            inputWrapper.append(inputLabel);
            inputWrapper.appendChild(input);
            return inputWrapper;

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

    }
}

/**
 * @param content {NotificationContent}
 * @param elements {HTMLElement[]}
 */
function applyAttributes(content, elements)
{
    if(content.attributes)
    {
        for(const [key, value] of Object.entries(content.attributes))
        {
            for(const element of elements)
            {
                element.setAttribute(key, value);
            }
        }
    }
}

/**
 * @param content {NotificationContent}
 * @param locale {LocaleManager}
 * @returns {HTMLLabelElement}
 */
function getSwitch(content, locale)
{
    const switchWrapper = document.createElement("label");
    switchWrapper.classList.add("notification_switch_wrapper");
    const toggleText= document.createElement("label");
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
    return switchWrapper;
}