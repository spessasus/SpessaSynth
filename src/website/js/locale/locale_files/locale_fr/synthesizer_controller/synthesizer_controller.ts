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

    blackMidiMode: {
        title: "Mode Black MIDI",
        description:
            "Active le mode haute performance, en simplifiant l'apparence générale et en arrêtant les notes plus rapidement"
    },

    disableCustomVibrato: {
        title: "Désactiver le vibrato personnalisé",
        description:
            "Désactive le vibrato personnalisé (NRPN) de manière permanente\nUn rechargement de la page web sera nécessaire pour le réactiver"
    },

    helpButton: {
        title: "Aide",
        description: "Ouvre une page web pour afficher un guide"
    },

    interpolation: {
        description: "Sélection de la méthode d'interpolation du synthétiseur",
        linear: "Interpolation linéaire",
        nearestNeighbor: "Aucune (valeur la plus proche)",
        cubic: "Interpolation cubique"
    },

    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
