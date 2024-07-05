import { rendererSettingsLocale } from './renderer_settings.js'
import { keyboardSettingsLocale } from './keyboard_settings.js'
import { midiSettingsLocale } from './midi_settings.js'

/**
 * @type {CompleteSettingsLocale}
 */
export const settingsLocale = {
    toggleButton: "Settings",
    mainTitle: "Program settings",

    rendererSettings: rendererSettingsLocale,
    keyboardSettings: keyboardSettingsLocale,
    midiSettings: midiSettingsLocale,

    interfaceSettings: {
        title: "Interface settings",

        toggleTheme: {
            title: "Use dark theme",
            description: "Enable the dark theme for the interface"
        },

        selectLanguage: {
            title: "Language",
            description: "Change the program language"
        }
    }
};