import { rendererSettingsLocale } from "./renderer_settings.js";
import { keyboardSettingsLocale } from "./keyboard_settings.js";
import { midiSettingsLocale } from "./midi_settings.js";

/**
 * @type {CompleteSettingsLocale}
 */
export const settingsLocale = {
    toggleButton: "Configurations",
    mainTitle: "Configuration du synthétiseur",
    
    rendererSettings: rendererSettingsLocale,
    keyboardSettings: keyboardSettingsLocale,
    midiSettings: midiSettingsLocale,
    
    interfaceSettings: {
        title: "Configuration de l'interface",
        
        toggleTheme: {
            title: "Thème sombre",
            description: "Active ou non le thème sombre pour l'interface"
        },
        
        selectLanguage: {
            title: "Langue",
            description: "Change la langue de l'interface"
        },
        
        layoutDirection: {
            title: "Orientation de la mise en page",
            description: "Orientation du rendu des notes et du clavier",
            values: {
                downwards: "Vers le bas",
                upwards: "Vers le haut",
                leftToRight: "De gauche à droite",
                rightToLeft: "De droite à gauche"
            }
        },
        
        reminder: {
            title: "Saviez-vous que vous pouvez survoler les paramètres pour obtenir plus d'informations ?",
            description: "Comme ceci !"
        }
    }
};