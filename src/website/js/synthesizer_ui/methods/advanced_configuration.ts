import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import { LOCALE_PATH, SynthetizerUI } from "../synthetizer_ui.js";
import { startKeyModifiersMenu } from "./key_modifier_ui.js";
import type { Synthesizer } from "../../utils/synthesizer.ts";

function getAttr(
    synth: Synthesizer,
    param: Parameters<Synthesizer["getMasterParameter"]>[0],
    invert = false
): object | { checked: "checked" } {
    let b = synth.getMasterParameter(param) as boolean;
    if (invert) {
        b = !b;
    }
    return b ? { checked: "checked" } : {};
}

export function showAdvancedConfiguration(this: SynthetizerUI) {
    const blackMIDIAttribute = getAttr(this.synth, "blackMIDIMode");
    const monophonicRetriggerAttribute = getAttr(
        this.synth,
        "monophonicRetriggerMode"
    );
    const drumEditingAttribute = getAttr(this.synth, "drumLock", true);
    const customVibratoAttribute = getAttr(
        this.synth,
        "customVibratoLock",
        true
    );
    showNotification(
        this.locale.getLocaleString(
            LOCALE_PATH + "advancedConfiguration.title"
        ),
        [
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "keyModifiers.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    startKeyModifiersMenu(
                        this.synth,
                        this.locale,
                        this.keyboard,
                        this.presetList
                    );
                }
            },

            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "sampleRate",
                listeners: {
                    change: (e) => {
                        const rate =
                            Number.parseInt(
                                (e.target as HTMLInputElement).value
                            ) || 44_100;
                        const n = showNotification(
                            this.locale.getLocaleString(
                                "locale.warnings.warning"
                            ),
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
                                        this.locale.getLocaleString(
                                            "locale.yes"
                                        ),
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
                                        this.locale.getLocaleString(
                                            "locale.no"
                                        ),
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
                    }
                },
                attributes: {
                    type: "number",
                    min: "1",
                    max: "1000",
                    value: this.synth.context.sampleRate.toString()
                }
            },

            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "voiceCap",
                listeners: {
                    change: (e) => {
                        const cap =
                            Number.parseInt(
                                (e.target as HTMLInputElement).value
                            ) || 100;
                        this.synth.setMasterParameter("voiceCap", cap);
                        this.voiceMeter.max = cap;
                    }
                },
                attributes: {
                    type: "number",
                    min: "1",
                    max: "1000",
                    value: this.synth.getMasterParameter("voiceCap").toString()
                }
            },

            {
                type: "toggle",
                translatePathTitle: LOCALE_PATH + "blackMidiMode",
                attributes: blackMIDIAttribute,
                listeners: {
                    input: (e) =>
                        this.synth.setMasterParameter(
                            "blackMIDIMode",
                            (e.target as HTMLInputElement).checked
                        )
                }
            },

            {
                type: "toggle",
                translatePathTitle: LOCALE_PATH + "msgsCutoff",
                attributes: monophonicRetriggerAttribute,
                listeners: {
                    input: (e) =>
                        this.synth.setMasterParameter(
                            "monophonicRetriggerMode",
                            !(e.target as HTMLInputElement).checked
                        )
                }
            },

            {
                type: "toggle",
                translatePathTitle: LOCALE_PATH + "drumEditing",
                attributes: drumEditingAttribute,
                listeners: {
                    input: (e) =>
                        this.synth.setMasterParameter(
                            "drumLock",
                            !(e.target as HTMLInputElement).checked
                        )
                }
            },

            {
                type: "toggle",
                translatePathTitle: LOCALE_PATH + "customVibrato",
                attributes: customVibratoAttribute,
                listeners: {
                    input: (e) => {
                        const enable = (e.target as HTMLInputElement).checked;
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
                    }
                }
            },

            {
                type: "text",
                textContent: this.locale.getLocaleString(
                    LOCALE_PATH + "effectsConfig.button.title"
                )
            },

            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "effectsConfig.reverb",
                onClick: (n) => {
                    closeNotification(n.id);
                    // Hide all ports
                    for (const port of this.mainControllerDiv.querySelectorAll<HTMLElement>(
                        ".synthui_port_group"
                    )) {
                        port.classList.add("hidden");
                    }
                    // Hide other effects
                    this.effectControllers.delay.wrapper.classList.add(
                        "hidden"
                    );
                    this.effectControllers.chorus.wrapper.classList.add(
                        "hidden"
                    );
                    // Show reverb
                    this.effectControllers.reverb.wrapper.classList.remove(
                        "hidden"
                    );
                }
            },

            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "effectsConfig.chorus",
                onClick: (n) => {
                    closeNotification(n.id);
                    // Hide all ports
                    for (const port of this.mainControllerDiv.querySelectorAll<HTMLElement>(
                        ".synthui_port_group"
                    )) {
                        port.classList.add("hidden");
                    }
                    // Hide other effects
                    this.effectControllers.delay.wrapper.classList.add(
                        "hidden"
                    );
                    this.effectControllers.reverb.wrapper.classList.add(
                        "hidden"
                    );
                    // Show chorus
                    this.effectControllers.chorus.wrapper.classList.remove(
                        "hidden"
                    );
                }
            },

            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "effectsConfig.delay",
                onClick: (n) => {
                    closeNotification(n.id);
                    // Hide all ports
                    for (const port of this.mainControllerDiv.querySelectorAll<HTMLElement>(
                        ".synthui_port_group"
                    )) {
                        port.classList.add("hidden");
                    }
                    // Hide other effects
                    this.effectControllers.reverb.wrapper.classList.add(
                        "hidden"
                    );
                    this.effectControllers.chorus.wrapper.classList.add(
                        "hidden"
                    );
                    // Show delay
                    this.effectControllers.delay.wrapper.classList.remove(
                        "hidden"
                    );
                }
            }
        ],
        99_999_999,
        true,
        this.locale
    );
}
