/**
 * @param content {NotificationContent}
 * @returns {HTMLElement}
 */
export function getContent(content)
{
    switch(content.type)
    {
        case "button":
            const btn = document.createElement("button");
            btn.textContent = content.textContent;
            applyAttributes(content, [btn])
            return btn;

        case "text":
            const p = document.createElement("p");
            p.textContent = content.textContent;
            applyAttributes(content, [p]);
            return p;

        case "input":
            const inputWrapper = document.createElement("div");
            inputWrapper.classList.add("notification_input_wrapper");
            const input = document.createElement("input");
            input.textContent = content.textContent;
            input.addEventListener("keydown", e => e.stopPropagation());
            const inputLabel = document.createElement("label");
            inputLabel.textContent = content.textContent;

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
            return getSwitch(content);
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
 * @returns {HTMLLabelElement}
 */
function getSwitch(content)
{
    const switchWrapper = document.createElement("label");
    switchWrapper.classList.add("notification_switch_wrapper");
    const toggleText= document.createElement("label");
    toggleText.textContent = content.textContent;
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