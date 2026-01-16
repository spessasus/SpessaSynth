import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import { LOCALE_PATH, SynthetizerUI } from "../synthetizer_ui.js";
import { showEffectsConfigWindow } from "./effects_config.js";
import { startKeyModifiersMenu } from "./key_modifier_ui.js";

export function showAdvancedConfiguration(this: SynthetizerUI) {
    const blackMIDIAttribute: { checked: "checked" } | object =
        this.synth.getMasterParameter("blackMIDIMode")
            ? { checked: "checked" }
            : {};
    const monophonicRetriggerAttribute: { checked: "checked" } | object =
        this.synth.getMasterParameter("monophonicRetriggerMode")
            ? { checked: "checked" }
            : {};
    showNotification(
        this.locale.getLocaleString(
            LOCALE_PATH + "advancedConfiguration.title"
        ),
        [
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "effectsConfig.button",
                onClick: (n) => {
                    closeNotification(n.id);
                    if (this.effectsConfigWindow !== undefined) {
                        closeNotification(this.effectsConfigWindow);
                        this.effectsConfigWindow = undefined;
                        return;
                    }
                    this.effectsConfigWindow = showEffectsConfigWindow(
                        this.locale,
                        LOCALE_PATH,
                        this.synth
                    ).id;
                }
            },

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
                translatePathTitle: LOCALE_PATH + "voiceCap",
                listeners: {
                    input: (e) => {
                        const cap =
                            parseInt((e.target as HTMLInputElement).value) ||
                            100;
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
                            (e.target as HTMLInputElement).checked
                        )
                }
            }
        ],
        99999999,
        true,
        this.locale
    );
}
