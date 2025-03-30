import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localeEnglish = {
    localeName: "English",
    // title message
    titleMessage: "SpessaSynth: SoundFont2 Javascript Synthesizer",
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
    
    // top bar buttons
    midiUploadButton: "Upload your MIDI files",
    
    exportAudio: exportAudio,
    
    error: "Error",
    yes: "Yes",
    no: "No",
    none: "None",
    
    
    demoSoundfontUploadButton: "Upload the soundfont",
    demoGithubPage: "Project page",
    demoDownload: {
        main: "Download",
        downloadLocal: {
            title: "Download Local Edition",
            description: "Download SpessaSynth: Local Edition to use offline on your computer"
        }
    },
    demoSongButton: "Demo Song",
    credits: "Credits",
    dropPrompt: "Drop files here...",
    
    warnings: {
        outOfMemory: "Your browser ran out of memory. Consider using Firefox or SF3 soundfont instead. (see console for error).",
        noMidiSupport: "No MIDI ports detected, this functionality will be disabled.",
        chromeMobile: "SpessaSynth performs poorly on Chrome Mobile. Consider using Firefox Android instead.",
        warning: "Warning"
    },
    hideTopBar: {
        title: "Hide top bar",
        description: "Hide the top (title) bar to provide a more seamless experience"
    },
    
    convertDls: {
        title: "DLS Conversion",
        message: "Looks like you've uploaded a DLS file. Do you want to convert it to SF2?"
    },
    
    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};