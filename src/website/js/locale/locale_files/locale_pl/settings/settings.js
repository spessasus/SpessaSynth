import { rendererSettingsLocale } from "./renderer_settings.js";
import { keyboardSettingsLocale } from "./keyboard_settings.js";
import { midiSettingsLocale } from "./midi_settings.js";

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
            description: "Zmień język programu",
            helpTranslate: "Przetłumacz SpessaSynth"
        },
        
        layoutDirection: {
            title: "Układ",
            description: "Kierunek układu wizualizacji i pianina",
            values: {
                downwards: "W dół",
                upwards: "W górę",
                leftToRight: "Od lewej do prawej",
                rightToLeft: "Od prawej do lewej"
            }
        },
        
        reminder: {
            title: "Czy wiedziałeś, że możesz najechać na ustawienia, aby uzyskać więcej informacji?",
            description: "Tak jak ta!"
        },
        
        useFirefox: {
            firefox: "Przeglądarka firefox",
            recommended: "jest mocno zalecana dla najlepszej wydajności."
        }
    }
};