// Translated by: ArchDev

import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

export const localeItalian = {
    localeName: "Italiano",
    // Title message
    titleMessage: "SpessaSynth: Sintetizzatore Javascript SF2/DLS",
    demoTitleMessage: "SpessaSynth: Demo Online Sintetizzatore Javascript SF2/DLS",

    synthInit: {
        genericLoading: "Caricamento in corso...",
        loadingSoundfont: "Caricamento SoundFont...",
        loadingBundledSoundfont: "Caricamento SoundFont incluso...",
        startingSynthesizer: "Avvio sintetizzatore...",
        savingSoundfont: "Salvataggio SoundFont per riutilizzo...",
        noWebAudio: "Il tuo browser non supporta Web Audio.",
        done: "Pronto!"
    },

    // Top bar buttons
    midiUploadButton: "Carica i tuoi file MIDI",

    extraBank: {
        title: "Selezione bank aggiuntivo",
        offset: {
            title: "Offset bank",
            description: "Offset bank per il bank aggiuntivo"
        },
        file: {
            title: "Sound bank",
            description: "Seleziona il sound bank (DLS/SF2/SF3)"
        },
        confirm: {
            title: "Conferma",
            description: "Conferma e applica il bank aggiuntivo"
        },
        clear: {
            title: "Cancella",
            description: "Cancella il bank aggiuntivo"
        },
        button: "Aggiungi un sound bank aggiuntivo"
    },

    exportAudio: exportAudio,

    error: "Errore",
    yes: "Sì",
    no: "No",
    none: "Nessuno",

    demoSoundfontUploadButton: "Carica il soundfont",
    demoGithubPage: "Pagina del progetto",
    soundfontEditor: "Editor SF2/DLS",
    demoDownload: {
        main: "Scarica",
        downloadLocal: {
            title: "Scarica Edizione Locale",
            description:
                "Scarica SpessaSynth: Edizione Locale per utilizzarlo offline sul tuo computer"
        }
    },
    demoSongButton: "Brano demo",
    credits: "Crediti",
    dropPrompt: "Trascina qui i file...",

    warnings: {
        outOfMemory:
            "Il tuo browser ha esaurito la memoria. Considera l'uso di Firefox o di un soundfont SF3. (vedi console per l'errore).",
        noMidiSupport:
            "Nessuna porta MIDI rilevata, questa funzionalità sarà disabilitata.",
        warning: "Attenzione"
    },
    hideTopBar: {
        title: "Nascondi barra superiore",
        description:
            "Nasconde la barra superiore (titolo) per un'esperienza più fluida"
    },

    convertDls: {
        title: "Conversione DLS",
        message:
            "Vuoi convertire il DLS in SF2 per l'uso con programmi che supportano solo SF2?"
    },

    // All translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
} as const;