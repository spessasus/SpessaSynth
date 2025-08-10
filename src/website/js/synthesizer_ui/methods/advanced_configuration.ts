import { closeNotification, showNotification } from "../../notification/notification.js";
import { LOCALE_PATH } from "../synthetizer_ui.js";
import { showEffectsConfigWindow } from "./effects_config.js";
import { startKeyModifiersMenu } from "./key_modifier_ui.js";

/**
 * @this {SynthetizerUI}
 */
export function showAdvancedConfiguration()
{
    this.hideOnDocClick = false;
    const blackMidiAttribute = this.synth.highPerformanceMode ? { checked: "checked" } : {};
    showNotification(
        this.locale.getLocaleString(LOCALE_PATH + "advancedConfiguration.title"),
        [
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "effectsConfig.button",
                onClick: n =>
                {
                    closeNotification(n.id);
                    if (this.effectsConfigWindow !== undefined)
                    {
                        closeNotification(this.effectsConfigWindow);
                        this.effectsConfigWindow = undefined;
                        return;
                    }
                    this.effectsConfigWindow = showEffectsConfigWindow(this.locale, LOCALE_PATH, this.synth).id;
                }
            },
            
            {
                type: "button",
                translatePathTitle: LOCALE_PATH + "keyModifiers.button",
                onClick: n =>
                {
                    closeNotification(n.id);
                    startKeyModifiersMenu(this.synth, this.locale, this.keyboard, this.presetList);
                }
            },
            
            {
                type: "input",
                translatePathTitle: LOCALE_PATH + "voiceCap",
                listeners: {
                    "input": e =>
                    {
                        this.synth.voiceCap = parseInt(e.target.value) || 100;
                        this.voiceMeter.max = this.synth.voiceCap;
                    }
                },
                attributes: {
                    "type": "number",
                    "min": "1",
                    "max": "1000",
                    "value": this.synth.voiceCap.toString()
                }
            },
            
            {
                type: "toggle",
                translatePathTitle: LOCALE_PATH + "blackMidiMode",
                attributes: blackMidiAttribute,
                listeners: {
                    "input": e => this.synth.highPerformanceMode = e.target.checked
                }
            }
        ],
        99999999,
        true,
        this.locale
    );
}