import { rendererSettingsLocale } from './renderer_settings.js'
import { keyboardSettingsLocale } from './keyboard_settings.js'
import { midiSettingsLocale } from './midi_settings.js'

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

    interfaceSettings: {
        title: "Ustawienia interfejsu",

        toggleTheme: {
            title: "Włącz ciemny motyw",
            description: "Włącz ciemny motyw programu"
        },

        selectLanguage: {
            title: "Język",
            description: "Zmień język programu"
        }
    }
};