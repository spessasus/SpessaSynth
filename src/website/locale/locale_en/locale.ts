import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportFile } from "./export_file.js";

export const localeEnglish = {
    localeName: "English",
    // Title message
    titleMessage: "SpessaSynth: SF2/DLS Javascript Synthesizer",
    demoTitleMessage: "SpessaSynth: SF2/DLS Javascript Synthesizer Online Demo",

    synthInit: {
        genericLoading: "Loading...",
        loadingSoundfont: "Loading SoundFont...",
        loadingBundledSoundfont: "Loading bundled SoundFont...",
        startingSynthesizer: "Starting Synthesizer...",
        savingSoundfont: "Saving SoundFont for reuse...",
        noWebAudio: "Your browser does not support Web Audio.",
        done: "Ready!"
    },

    // Top bar buttons
    midiUploadButton: "Upload your MIDI files",

    extraBank: {
        title: "Extra bank selection",
        offset: {
            title: "Bank offset",
            description: "Bank offset for the extra bank"
        },
        file: {
            title: "Sound bank",
            description: "Select the sound bank (DLS/SF2/SF3)"
        },
        confirm: {
            title: "Confirm",
            description: "Confirm and apply the extra bank"
        },
        clear: {
            title: "Clear",
            description: "Clear the extra bank"
        },
        button: "Add an extra sound bank"
    },

    exportFile: exportFile,

    error: "Error",
    yes: "Yes",
    no: "No",
    none: "None",

    demoSoundfontUploadButton: "Upload the soundfont",
    demoGithubPage: "Project page",
    discord: "Join the Discord server!",
    soundfontEditor: "SF2/DLS Editor",
    demoDownload: {
        main: "Download",
        downloadLocal: {
            title: "Download Local Edition",
            description:
                "Download SpessaSynth: Local Edition to use offline on your computer"
        }
    },
    demoSongButton: "Demo Song",
    demoSongPlay: "Play",
    demoSongRemoval:
        "If your song is on this list and you would like it removed, please email spesekspesek@gmail.com and it will be taken down. The songs are not stored in the SpessaSynth repository, they are hosted at https://github.com/spessasus/spessasynth-demo-songs/",
    credits: "Credits",
    dropPrompt: "Drop files here...",

    warnings: {
        outOfMemory:
            "Your browser ran out of memory. Consider using Firefox or SF3 soundfont instead. (see console for error).",
        noMidiSupport:
            "No MIDI ports detected, this functionality will be disabled.",
        warning: "Warning",
        invalidMidiFile: "Invalid MIDI file:"
    },
    hideTopBar: {
        title: "Hide top bar",
        description:
            "Hide the top (title) bar to provide a more seamless experience"
    },
    fullscreen: {
        title: "Fullscreen",
        description: "Toggle fullscreen mode"
    },

    convertDls: {
        title: "DLS Conversion",
        message:
            "Do you want to convert the DLS to SF2 for use with SF2-only programs?"
    },

    // All translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
} as const;
