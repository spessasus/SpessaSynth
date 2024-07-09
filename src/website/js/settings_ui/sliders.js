/**
 * @param element {HTMLInputElement}
 * @returns {HTMLSpanElement}
 */
export function getSpan(element)
{
    return element.parentElement.nextElementSibling;
}

/**
 * @param div {HTMLDivElement}
 */
export function handleSliders(div)
{
    /**
     * @type {HTMLCollectionOf<Element>}
     */
    const inputs = div.getElementsByTagName("spessarange");
    for(const input of inputs)
    {
        // main wrapper wraps the visual wrapper and span
        const mainWrapper = document.createElement("div");
        mainWrapper.classList.add("settings_slider_wrapper");
        // copy over values to the actual input
        const min = input.getAttribute("min");
        const max = input.getAttribute("max");
        const current = input.getAttribute("value");
        const units = input.getAttribute("units");
        const id = input.getAttribute("input_id");
        const htmlInput = document.createElement("input");
        htmlInput.classList.add("settings_slider");
        htmlInput.type = "range";
        htmlInput.id = id;
        htmlInput.min = min;
        htmlInput.max = max;
        htmlInput.value = current;


        const span = document.createElement("span");
        span.textContent = current + units;

        // visual wrapper wraps the input, thumb and progress
        const visualWrapper = document.createElement("div");
        visualWrapper.classList.add("settings_visual_wrapper");

        const progressBar = document.createElement("div");
        progressBar.classList.add("settings_slider_progress");
        visualWrapper.appendChild(progressBar);

        const thumb = document.createElement("div");
        thumb.classList.add("settings_slider_thumb");
        visualWrapper.appendChild(thumb);
        visualWrapper.appendChild(htmlInput);

        htmlInput.addEventListener("input", () => {
            // calculate the difference between values, if larger than 5%, enable transition
            const val = parseInt(visualWrapper.style.getPropertyValue("--visual-width").replace("%", ""));
            const newVal = Math.round((htmlInput.value - htmlInput.min) / (htmlInput.max - htmlInput.min) * 100);
            if(Math.abs((val - newVal) / 100) > 0.05)
            {
                visualWrapper.classList.add("settings_slider_transition");
            }
            else
            {
                visualWrapper.classList.remove("settings_slider_transition");
            }
            // apply the width
            visualWrapper.style.setProperty("--visual-width", `${newVal}%`);
        });
        visualWrapper.style.setProperty("--visual-width", `${(htmlInput.value - htmlInput.min) / (htmlInput.max - htmlInput.min) * 100}%`);
        const parent = input.parentElement;
        mainWrapper.appendChild(visualWrapper);
        mainWrapper.appendChild(span);
        parent.insertBefore(mainWrapper, input);
    }
    while(inputs.length > 0)
    {
        inputs[0].parentNode.removeChild(inputs[0]);
    }
}