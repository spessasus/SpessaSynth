import { settingsLocale } from './settings/settings.js'
import { musicPlayerModeLocale } from './music_player_mode.js'
import { synthesizerControllerLocale } from './synthesizer_controller/synthesizer_controller.js'
import { sequencerControllerLocale } from './sequencer_controller.js'
import { exportAudio } from './export_audio.js'

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localeEnglish = {
    localeName: "English",
    // title messsage
    titleMessage: "SpessaSynth: SoundFont2 Javascript Synthesizer",
    demoTitleMessage: "SpessaSynth: SoundFont2 Javascript Synthesizer Online Demo",

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


    demoSoundfontUploadButton: "Upload the soundfont",
    demoGithubPage: "Project's page",
    demoSongButton: "Demo Song",
    credits: "Credits",

    warnings: {
        outOfMemory: "Your browser ran out of memory. Consider using Firefox or SF3 soundfont instead. (see console for error).",
        noMidiSupport: "MIDI Inputs are not supported by this browser, this functionality will not be available. Consider using Chrome or Firefox.",
        chromeMobile: "SpessaSynth performs poorly on Chrome Mobile. Consider using Firefox Android instead.",
        warning: "Warning"
    },
    hideTopBar: {
        title: "Hide top bar",
        description: "Hide the top (title) bar to provide a more seamless experience",
    },

    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};