import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";
import { keyModifiers } from "./key_modifiers.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Contrôleurs du synthétiseur (S)",
        description: "Affiche les contrôleurs du synthétiseur"
    },

    // Meters
    mainVoiceMeter: {
        title: "Voix : ",
        description: "Le nombre total de voix jouées actuellement"
    },

    mainVolumeMeter: {
        title: "Volume : ",
        description: "Le volume global actuel du synthétiseur"
    },

    mainPanMeter: {
        title: "Balance : ",
        description: "La panoramique globale actuelle du synthétiseur"
    },

    mainTransposeMeter: {
        title: "Transposition : ",
        description: "Pour transposer le synthétiseur (en demi-tons ou notes)"
    },

    // Buttons
    midiPanic: {
        title: "Panique MIDI",
        description: "Stoppe toutes les voix immédiatement"
    },

    systemReset: {
        title: "Réinitialisation du système",
        description:
            "Réinitialise tous les contrôleurs à leur valeur par défaut"
    },

    helpButton: {
        title: "Aide",
        description: "Ouvre une page web pour afficher un guide"
    },

    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
