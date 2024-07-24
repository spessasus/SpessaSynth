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