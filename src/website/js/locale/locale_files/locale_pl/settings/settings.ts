import { rendererSettingsLocale } from "./renderer_settings.js";
import { keyboardSettingsLocale } from "./keyboard_settings.js";
import { midiSettingsLocale } from "./midi_settings.js";
import { interfaceSettings } from "./interface_settings.js";

/**
 *
 * @type {CompleteSettingsLocale}
 */
export const settingsLocale = {
    toggleButton: "Ustawienia",
    mainTitle: "Ustawienia programu",
    
    rendererSettings: rendererSettingsLocale,
    keyboardSettings: keyboardSettingsLocale,
    midiSettings: midiSettingsLocale,
    
    interfaceSettings: interfaceSettings
};