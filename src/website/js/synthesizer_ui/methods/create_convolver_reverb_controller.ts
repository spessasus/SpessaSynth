import { Meter } from "./synthui_meter.ts";
import { LOCALE_PATH, SynthesizerUI } from "../synthetizer_ui.ts";
import { showNotification } from "../../notification/notification.js";
import { Ut } from "../../utils/other.js";
import { URLParamUtils } from "../../utils/url_params.ts";

export function createConvolverModeToggle(this: SynthesizerUI) {
    const toggle = document.createElement("a");
    toggle.classList.add("synthui_button");

    const url = new URL(window.location.href);
    if (this.synth.convolverNode) {
        this.locale.bindObjectProperty(
            toggle,
            "textContent",
            LOCALE_PATH + "effectsConfig.convolver.reloadNormal"
        );
        url.searchParams.delete(URLParamUtils.CONVOLVER);
    } else {
        this.locale.bindObjectProperty(
            toggle,
            "textContent",
            LOCALE_PATH + "effectsConfig.convolver.reloadConvolver"
        );
        url.searchParams.set(URLParamUtils.CONVOLVER, "1");
    }
    toggle.href = url.toString();
    return toggle;
}

/**
 * Creates the convolver replacement for the standard reverb editor
 */
export function createConvolverReverbController(this: SynthesizerUI) {
    const convolver = this.synth.convolverNode;
    if (!convolver) {
        throw new Error("Convolver editor created without convolver mode!");
    }

    const wrapper = document.createElement("div");
    wrapper.classList.add("effect_wrapper", "synthui_tab");
    Ut.hide(wrapper);

    // Title + description
    const title = document.createElement("h2");
    this.locale.bindObjectProperty(
        title,
        "textContent",
        LOCALE_PATH + "effectsConfig.convolver.title"
    );
    wrapper.append(title);

    const description = document.createElement("h4");
    this.locale.bindObjectProperty(
        description,
        "textContent",
        LOCALE_PATH + "effectsConfig.convolver.description"
    );
    wrapper.append(description);

    const gain = new Meter({
        color: "",
        locale: this.locale,
        localePath: LOCALE_PATH + "effectsConfig.reverb.gain",
        def: 1,
        min: 0,
        max: 10,
        transform: (value) => `${Math.floor(value * 100)}%`,
        onEdit: (value) => {
            const rounded = Math.round(value * 100) / 100;
            this.synth.setSystemParameter("reverbGain", rounded);
            gain.update(rounded);
        }
    });
    const gainWrapper = document.createElement("div");
    gainWrapper.append(gain.div);
    wrapper.append(gainWrapper);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.id = "convolver_impulse_response_upload";
    input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        try {
            convolver.buffer = await this.synth.context.decodeAudioData(
                await file.arrayBuffer()
            );
        } catch (error) {
            console.error(
                "Could not decode convolver impulse response!",
                error
            );
            const errorPath =
                LOCALE_PATH +
                "effectsConfig.convolver.impulseResponse.decodeError";
            showNotification(
                this.locale.getLocaleString(errorPath + ".title"),
                [
                    {
                        type: "text",
                        textContent: this.locale.getLocaleString(
                            errorPath + ".description"
                        )
                    }
                ]
            );
        }
    });
    wrapper.append(input);

    const impulseLabel = document.createElement("label");
    impulseLabel.htmlFor = input.id;
    impulseLabel.classList.add("synthui_button");
    this.locale.bindObjectProperty(
        impulseLabel,
        "textContent",
        LOCALE_PATH + "effectsConfig.convolver.impulseResponse.title"
    );
    this.locale.bindObjectProperty(
        impulseLabel,
        "title",
        LOCALE_PATH + "effectsConfig.convolver.impulseResponse.description"
    );
    wrapper.append(impulseLabel);

    wrapper.append(createConvolverModeToggle.call(this));
    return wrapper;
}
