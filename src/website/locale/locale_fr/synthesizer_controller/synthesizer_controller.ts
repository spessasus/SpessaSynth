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

    gsReset: {
        title: "Réinit. GS",
        description:
            "Réinitialisation GS : réinitialise tout le synthétiseur en mode Roland GS et déverrouille tous les contrôleurs"
    },

    xgReset: {
        title: "Réinit. XG",
        description:
            "Réinitialisation XG : réinitialise tout le synthétiseur en mode Yamaha XG et déverrouille tous les contrôleurs"
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
        description: "Tabs: Sélectionnez ce que vous voulez configurer",
        channels: "Canaux MIDI",
        gsReverb: "Réverbération GS",
        gsChorus: "Chorus GS",
        gsDelay: "Delai GS",
        gsInsertion: "Insertion GS",
        xgReverb: "Réverbération XG",
        xgChorus: "Chorus XG",
        xgVariation: "Variation XG",
        xgInsertion: "Insertion XG",
        configuration: "Configuration",
        userDrumSet: "Set de batterie de l'utilisateur"
    },

    holdPedalDown: "La pédale de maintien est appuyée (Shift)",
    keyboardMode:
        "La lecture sur le clavier est activée, appuyez sur ` pour la désactiver",
    port: "Port {0} (clic pour changer la visibilité)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
