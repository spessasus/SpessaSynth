import { channelControllerLocale } from "./channel_controller.js";

/**
 *
 * @type {{systemReset: {description: string, title: string}, disableCustomVibrato: {description: string, title: string}, mainTransposeMeter: {description: string, title: string}, mainVoiceMeter: {description: string, title: string}, midiPanic: {description: string, title: string}, mainPanMeter: {description: string, title: string}, mainVolumeMeter: {description: string, title: string}, toggleButton: {description: string, title: string}, channelController: {transposeMeter: {description: string, title: string}, voiceMeter: {description: string, title: string}, modulationWheelMeter: {description: string, title: string}, expressionMeter: {description: string, title: string}, panMeter: {description: string, title: string}, presetSelector: {description: string}, presetReset: {description: string}, pitchBendMeter: {description: string, title: string}, reverbMeter: {description: string, title: string}, volumeMeter: {description: string, title: string}, drumToggleButton: {description: string}, muteButton: {description: string}, chorusMeter: {description: string, title: string}}, blackMidiMode: {description: string, title: string}}}
 */
export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Contrôleurs du synthétiseur",
        description: "Affiche les contrôleurs du synthétiseur"
    },
    
    // meters
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
    
    // buttons
    midiPanic: {
        title: "Panique MIDI",
        description: "Stoppe toutes les voix immédiatement"
    },
    
    systemReset: {
        title: "Réinitialisation du système",
        description: "Réinitialise tous les contrôleurs à leur valeur par défaut"
    },
    
    blackMidiMode: {
        title: "Mode Black MIDI",
        description: "Active le mode haute performance, en simplifiant l'apparence générale et en arrêtant les notes plus rapidement"
    },
    
    disableCustomVibrato: {
        title: "Désactiver le vibrato personnalisé",
        description: "Désactive le vibrato personnalisé (NRPN) de manière permanente\nUn rechargement de la page web sera nécessaire pour le réactiver"
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
    
    channelController: channelControllerLocale
};