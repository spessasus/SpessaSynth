import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localeFrench = {
    localeName: "Français",
    // Title message
    titleMessage:
        "SpessaSynth : synthétiseur compatible SF2, écrit en javascript",
    demoTitleMessage:
        "SpessaSynth : démo en ligne du synthétiseur compatible SF2/DLS",

    synthInit: {
        genericLoading: "Chargement...",
        loadingSoundfont: "Chargement de la banque de sons...",
        loadingBundledSoundfont: "Chargement de la banque de sons intégrée...",
        startingSynthesizer: "Démarrage du synthétiseur...",
        savingSoundfont:
            "Sauvegarde de la banque de sons pour une utilisation ultérieure...",
        noWebAudio: "Votre navigateur ne supporte pas l'API Web Audio.",
        done: "Prêt !"
    },

    // Top bar buttons
    midiUploadButton: "Charger des fichiers MIDI",

    extraBank: {
        title: "Sélection de la banque en plus",
        offset: {
            title: "Décalage de la banque",
            description: "Décalage de la banque en plus"
        },
        file: {
            title: "Banque de sons",
            description: "Sélectionner la banque de sons (DLS/SF2/SF3)"
        },
        confirm: {
            title: "Confirmer",
            description: "Confirmer et appliquer la banque en plus"
        },
        clear: {
            title: "Réinitialiser",
            description: "Retirer toutes les banques de sons"
        },
        button: "Ajouter une banque de son"
    },

    exportAudio: exportAudio,

    yes: "Oui",
    no: "Non",
    none: "Aucun",
    error: "Erreur",

    demoSoundfontUploadButton: "Charger une banque de sons",
    demoGithubPage: "Page du projet",
    discord: "Allez rejoindre le serveur Discord!",
    soundfontEditor: "Éditeur de banque de sons",
    demoDownload: {
        main: "Télécharger",
        downloadLocal: {
            title: "Télécharger l'édition locale",
            description:
                "Télécharger l'édition locale de SpessaSynth pour l'utiliser hors-ligne sur votre ordinateur"
        }
    },
    demoSongButton: "Morceau démo",
    credits: "Crédits",
    dropPrompt: "Déposer les fichiers ici...",

    warnings: {
        outOfMemory:
            "Votre navigateur est à cours de mémoire. L'usage de Firefox ou des banques de sons au format SF3 est recommandé (voir la console pour plus de détails concernant l'erreur).",
        noMidiSupport:
            "Aucun port MIDI détecté, cette fonctionnalité sera désactivée.",
        warning: "Attention",
        invalidMidiFile: "Fichier MIDI invalide :"
    },
    hideTopBar: {
        title: "Masquer la barre supérieure",
        description:
            "Masquer la barre supérieure (titre) pour offrir une meilleure expérience"
    },

    convertDls: {
        title: "Conversion DLS",
        message:
            "Le fichier chargé semble être au format DLS. Voulez-vous le convertir au format SF2 ?"
    },

    // All translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};
