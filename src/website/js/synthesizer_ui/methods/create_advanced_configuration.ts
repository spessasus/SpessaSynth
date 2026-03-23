import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import { SynthetizerUI } from "../synthetizer_ui.js";
import { startKeyModifiersMenu } from "./key_modifier_ui.js";
import { Meter } from "./synthui_meter.ts";
import { Ut } from "../../utils/other.js";
import type { LocaleManager } from "../../locale/locale_manager.ts";
import { type InterpolationType, interpolationTypes } from "spessasynth_core";

const LOCALE_PATH = "locale.synthesizerController.effectsConfig.misc.";
const KEY_MODIFIERS_PATH = "locale.synthesizerController.keyModifiers.";

function toggleMeter(
    locale: LocaleManager,
    path: string,
    callback: (v: boolean) => unknown,
    def: boolean,
    yesNo: { yes: string; no: string }
) {
    let value = def;
    const meter = new Meter({
        localePath: LOCALE_PATH + path,
        locale: locale,
        initialAndDefault: def ? 1 : 0,
        min: 0,
        max: 1,
        transform: (v) => (v === 1 ? ": " + yesNo.yes : ": " + yesNo.no),
        editable: true,
        editCallback: (v) => {
            v = Math.round(v);
            if ((v === 1) === value) {
                return;
            }
            value = v === 1;
            meter.update(v);
            callback(value);
        }
    });
    return meter;
}

function input(
    locale: LocaleManager,
    pathTitle: string,
    callback: (v: number) => unknown,
    initial: number,
    min: number,
    max: number
) {
    const wrapperDiv = document.createElement("div");
    wrapperDiv.classList.add("synthui_button", "synthui_input");
    const label = document.createElement("label");
    wrapperDiv.append(label);
    locale.bindObjectProperty(
        label,
        "textContent",
        LOCALE_PATH + pathTitle + ".title"
    );
    locale.bindObjectProperty(
        wrapperDiv,
        "title",
        LOCALE_PATH + pathTitle + ".description"
    );
    const input = document.createElement("input");
    input.type = "number";
    input.min = min.toString();
    input.max = max.toString();
    input.value = initial.toString();
    input.addEventListener("keydown", (e) => e.stopPropagation());
    input.addEventListener("change", () => {
        let v = Number.parseInt(input.value);
        if (Number.isNaN(v)) {
            return;
        }
        v = Math.max(min, Math.min(max, v));
        input.value = v.toString();
        callback(v);
    });
    wrapperDiv.append(input);

    return wrapperDiv;
}

export function createAdvancedConfiguration(
    this: SynthetizerUI
): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.classList.add("effect_wrapper", "synthui_tab");
    Ut.hide(wrapper);

    // Title
    const title = document.createElement("h2");
    this.locale.bindObjectProperty(title, "textContent", LOCALE_PATH + "title");
    wrapper.append(title);

    // Subtitle
    const effectSubtitle = document.createElement("h4");
    this.locale.bindObjectProperty(
        effectSubtitle,
        "textContent",
        LOCALE_PATH + "description"
    );
    wrapper.append(effectSubtitle);

    // Buttons, selects, inputs
    {
        const paramWrapper = document.createElement("div");
        paramWrapper.classList.add("effect_wrapper_params");
        wrapper.append(paramWrapper);

        // Key modifiers
        {
            const keyModifierBuffon = document.createElement("div");
            keyModifierBuffon.classList.add("synthui_button");
            this.locale.bindObjectProperty(
                keyModifierBuffon,
                "textContent",
                KEY_MODIFIERS_PATH + "button.title"
            );
            this.locale.bindObjectProperty(
                keyModifierBuffon,
                "title",
                KEY_MODIFIERS_PATH + "button.description"
            );

            keyModifierBuffon.addEventListener("click", () =>
                startKeyModifiersMenu(
                    this.synth,
                    this.locale,
                    this.keyboard,
                    this.presetList
                )
            );

            paramWrapper.append(keyModifierBuffon);
        }

        // Interpolation
        {
            const interpolation = document.createElement("select");
            interpolation.classList.add("synthui_button");
            const INTERP_PATH = LOCALE_PATH + "interpolation.";
            this.locale.bindObjectProperty(
                interpolation,
                "title",
                INTERP_PATH + "description"
            );
            /**
             * Linear
             */
            const linear = document.createElement("option");
            linear.value = interpolationTypes.linear.toString();
            this.locale.bindObjectProperty(
                linear,
                "textContent",
                INTERP_PATH + "linear"
            );
            interpolation.append(linear);

            /**
             * Nearest neighbor
             */
            const nearest = document.createElement("option");
            nearest.value = interpolationTypes.nearestNeighbor.toString();
            this.locale.bindObjectProperty(
                nearest,
                "textContent",
                INTERP_PATH + "nearestNeighbor"
            );
            interpolation.append(nearest);

            /**
             * Cubic (default)
             */
            const cubic = document.createElement("option");
            cubic.value = interpolationTypes.hermite.toString();
            cubic.selected = true;
            this.locale.bindObjectProperty(
                cubic,
                "textContent",
                INTERP_PATH + "cubic"
            );
            interpolation.append(cubic);

            interpolation.addEventListener("change", () => {
                this.synth.setMasterParameter(
                    "interpolationType",
                    Number.parseInt(interpolation.value) as InterpolationType
                );
            });

            paramWrapper.append(interpolation);
        }

        paramWrapper.append(
            input(
                this.locale,
                "sampleRate",
                (rate) => {
                    const n = showNotification(
                        this.locale.getLocaleString("locale.warnings.warning"),
                        [
                            {
                                type: "text",
                                textContent: this.locale.getLocaleString(
                                    LOCALE_PATH + "sampleRate.warning"
                                )
                            },
                            {
                                type: "button",
                                textContent:
                                    this.locale.getLocaleString("locale.yes"),
                                listeners: {
                                    click: () => {
                                        const url = new URL(
                                            window.location.href
                                        );
                                        url.searchParams.set(
                                            "samplerate",
                                            rate.toString()
                                        );
                                        window.location.replace(url);
                                    }
                                }
                            },
                            {
                                type: "button",
                                textContent:
                                    this.locale.getLocaleString("locale.no"),
                                listeners: {
                                    click: () => {
                                        closeNotification(n.id);
                                    }
                                }
                            }
                        ],
                        999_999,
                        true
                    );
                },
                this.synth.context.sampleRate,
                8000,
                384_000
            )
        );

        paramWrapper.append(
            input(
                this.locale,
                "voiceCap",
                (cap) => {
                    this.synth.setMasterParameter("voiceCap", cap);
                    this.voiceMeter.max = cap;
                },
                this.synth.getMasterParameter("voiceCap"),
                1,
                10_000
            )
        );
    }

    // Toggles
    {
        const paramWrapper = document.createElement("div");
        paramWrapper.classList.add("effect_wrapper_params");
        wrapper.append(paramWrapper);

        // Allow dynamic updates that way
        const yesNo = {
            yes: "",
            no: ""
        };
        this.locale.bindObjectProperty(yesNo, "yes", "locale.yes");
        this.locale.bindObjectProperty(yesNo, "no", "locale.no");

        paramWrapper.append(
            toggleMeter(
                this.locale,
                "customVibrato",
                (enable) => {
                    if (enable) {
                        this.synth.setMasterParameter(
                            "customVibratoLock",
                            false
                        );
                    } else {
                        this.synth.resetControllers();
                        this.synth.setMasterParameter(
                            "customVibratoLock",
                            true
                        );
                        if (this.sequencer) {
                            this.sequencer.currentTime -= 0.1;
                        }
                    }
                },
                true,
                yesNo
            ).div
        );
        paramWrapper.append(
            toggleMeter(
                this.locale,
                "drumEditing",
                (enable) => {
                    if (enable) {
                        this.synth.setMasterParameter("drumLock", false);
                    } else {
                        this.synth.resetControllers();
                        this.synth.setMasterParameter("drumLock", true);
                        if (this.sequencer) {
                            this.sequencer.currentTime -= 0.1;
                        }
                    }
                },
                true,
                yesNo
            ).div
        );
        paramWrapper.append(
            toggleMeter(
                this.locale,
                "msgsCutoff",
                (enable) => {
                    this.synth.setMasterParameter(
                        "monophonicRetriggerMode",
                        enable
                    );
                },
                false,
                yesNo
            ).div
        );

        paramWrapper.append(
            toggleMeter(
                this.locale,
                "blackMidiMode",
                (enable) => {
                    this.synth.setMasterParameter("blackMIDIMode", enable);
                },
                false,
                yesNo
            ).div
        );
    }

    return wrapper;
}
