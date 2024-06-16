import { settingsLocale } from './settings/settings.js'
import { musicPlayerModeLocale } from './music_player_mode.js'
import { synthesizerControllerLocale } from './synthesizer_controller/synthesizer_controller.js'
import { sequencerControllerLocale } from './sequencer_controller.js'

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localePolish = {
    localeName: "Polski",
    // title messsage
    titleMessage: "SpessaSynth: JavaScriptowy Syntezator SoundFont2",
    demoTitleMessage: "SpessaSynth: JavaScriptowy Syntezator SoundFont2 Wersja Demo",

    // top bar buttons
    midiUploadButton: "Wgraj Twoje pliki MIDI",
    midiRenderButton: "Eksportuj audio",
    demoSoundfontUploadButton: "Wgraj SoundFonta",
    demoGithubPage: "Strona projektu",
    demoBundledSoundfont: "Użyj wbudowanego SoundFonta (22MB)",

    hideTopBar: {
        title: "Ukryj górny pasek",
        description: "Ukryj pasek tytułowy w celu poprawy widoczności na pionowych ekranach",
    },

    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};