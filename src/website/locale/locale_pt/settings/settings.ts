// SpessaSynth Português do Brasil
// Por Lucas Gabriel (lucmsilva)
// https://github.com/lucmsilva651

import { rendererSettingsLocale } from "./renderer_settings.js";
import { keyboardSettingsLocale } from "./keyboard_settings.js";
import { midiSettingsLocale } from "./midi_settings.js";

export const settingsLocale = {
    toggleButton: "Configurações",
    mainTitle: "Configurações do Programa",

    rendererSettings: rendererSettingsLocale,
    keyboardSettings: keyboardSettingsLocale,
    midiSettings: midiSettingsLocale,

    interfaceSettings: {
        title: "Configurações da Interface",

        theme: {
            title: "Tema",
            description: "Escolher o tema de cores da interface"
        },

        selectLanguage: {
            title: "Idioma",
            description: "Alterar o idioma do programa",
            helpTranslate: "Traduzir o SpessaSynth"
        },

        layoutDirection: {
            title: "Direção do layout",
            description: "A direção do layout do renderizador e do teclado",
            values: {
                downwards: "Para baixo",
                upwards: "Para cima",
                leftToRight: "Da esquerda para a direita",
                rightToLeft: "Da direita para a esquerda"
            }
        },

        reminder: {
            title: "Você sabia que pode passar o mouse sobre as configurações para obter mais informações?",
            description: "Como esta!"
        }
    }
};
