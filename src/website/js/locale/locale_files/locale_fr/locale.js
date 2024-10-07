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
    // title message
    titleMessage: "SpessaSynth&nbsp;: synthétiseur compatible SoundFont2, écrit en javascript",
    demoTitleMessage: "SpessaSynth&nbsp;: démo en ligne du synthétiseur compatible SoundFont2",
    
    synthInit: {
        genericLoading: "Chargement&hellip;",
        loadingSoundfont: "Chargement de la banque de sons&hellip;",
        loadingBundledSoundfont: "Chargement de la banque de sons intégrée&hellip;",
        startingSynthesizer: "Démarrage du synthétiseur&hellip;",
        savingSoundfont: "Sauvegarde de la banque de sons pour une utilisation ultérieure&hellip;",
        noWebAudio: "Votre navigateur ne supporte pas l&prime;audio par le web.",
        done: "Prêt&nbsp;!"
    },
    
    // top bar buttons
    midiUploadButton: "Charger des fichiers MIDI",
    
    exportAudio: exportAudio,
    
    yes: "Oui",
    no: "Non",
    
    
    demoSoundfontUploadButton: "Charger une banque de sons",
    demoGithubPage: "Page du projet",
    demoSongButton: "Morceau démo",
    credits: "Crédits",
    dropPrompt: "Relâchez les fichiers ici&hellip;",
    
    warnings: {
        outOfMemory: "Votre navigateur est à cours de mémoire. L&prime;usage de Firefox ou des banques de sons au format SF3 est recommandé (voir la console pour plus de détails concernant l&prime;erreur).",
        noMidiSupport: "Aucun port MIDI détecté, cette fonctionnalité sera désactivée.",
        chromeMobile: "Les performances de SpessaSynth sont basses sur Chrome pour mobile. L&prime;usage de Firefox est recommandé.",
        warning: "Attention"
    },
    hideTopBar: {
        title: "Masquer la barre supérieure",
        description: "Masquer la barre supérieure (titre) pour offrir une meilleure expérience"
    },
    
    convertDls: {
        title: "Conversion DLS",
        message: "Le fichier chargé semble être au format DLS. Voulez-vous le convertir au format SF2&nbsp;?"
    },
    
    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};