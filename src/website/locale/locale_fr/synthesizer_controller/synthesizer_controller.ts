import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

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

    showOnlyUsed: {
        title: "N'afficher que les canaux utilisés",
        description:
            "N'afficher que les canaux utilisés : N'afficher que les canaux utilisés dans le contrôleur du synthetiseur"
    },

    helpButton: {
        title: "Aide",
        description: "Ouvre une page web pour afficher un guide"
    },

    tabs: {
        description: "Tabs: Select what to configure",
        channels: "Canaux MIDI",
        reverb: "Réverbération",
        chorus: "Chorus",
        delay: "Delai",
        insertion: "Insertion",
        configuration: "Configuration"
    },

    holdPedalDown: "La pédale de maintien est appuyée (Shift)",
    keyboardMode:
        "La lecture sur le clavier est activée, appuyez sur ` pour la désactiver",
    port: "Port {0} (clic pour changer la visibilité)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
