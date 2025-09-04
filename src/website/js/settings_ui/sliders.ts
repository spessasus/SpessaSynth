export function getSpan(element: HTMLInputElement): HTMLSpanElement {
    if (!element?.parentElement?.nextElementSibling) {
        throw new Error("Element has no sibling!");
    }
    return element.parentElement.nextElementSibling as HTMLSpanElement;
}

export function handleSliders(div: HTMLDivElement) {
    const inputs = div.getElementsByTagName(
        "spessarange"
    ) as HTMLCollectionOf<HTMLInputElement>;
    for (const input of inputs) {
        input.parentElement?.insertBefore(createSlider(input, true), input);
    }
    while (inputs.length > 0) {
        inputs[0].parentNode?.removeChild(inputs[0]);
    }
}

export function createSlider(
    input: HTMLInputElement,
    showSpan = true
): HTMLDivElement {
    // Main wrapper wraps the visual wrapper and span
    const mainWrapper = document.createElement("div");
    mainWrapper.classList.add("settings_slider_wrapper");
    // Copy over values to the actual input
    const min = input.getAttribute("min") ?? "";
    const max = input.getAttribute("max") ?? "";
    const current = input.value;
    const units = input.getAttribute("units") ?? "";
    const id = input.getAttribute("input_id") ?? "";
    const htmlInput = document.createElement("input");
    htmlInput.classList.add("settings_slider");
    htmlInput.type = "range";
    htmlInput.id = id;
    htmlInput.min = min;
    htmlInput.max = max;
    htmlInput.value = current;

    let span;
    if (showSpan) {
        span = document.createElement("span");
        span.textContent = current + units;
    }

    // Visual wrapper wraps the input, thumb and progress
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
        // Calculate the difference between values, if larger than 5%, enable transition
        const val = parseInt(
            visualWrapper.style
                .getPropertyValue("--visual-width")
                .replace("%", "")
        );
        const newVal = Math.round(
            ((parseInt(htmlInput.value) - parseInt(htmlInput.min)) /
                (parseInt(htmlInput.max) - parseInt(htmlInput.min))) *
                100
        );
        if (Math.abs((val - newVal) / 100) > 0.05) {
            visualWrapper.classList.add("settings_slider_transition");
        } else {
            visualWrapper.classList.remove("settings_slider_transition");
        }
        // Apply the width
        visualWrapper.style.setProperty("--visual-width", `${newVal}%`);
    });
    visualWrapper.style.setProperty(
        "--visual-width",
        `${((parseInt(htmlInput.value) - parseInt(htmlInput.min)) / (parseInt(htmlInput.max) - parseInt(htmlInput.min))) * 100}%`
    );
    mainWrapper.appendChild(visualWrapper);
    if (span) {
        mainWrapper.appendChild(span);
    }
    return mainWrapper;
}
