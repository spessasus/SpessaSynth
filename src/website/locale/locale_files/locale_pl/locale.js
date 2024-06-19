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
    midiRenderButton: {
        title: "Eksportuj audio",
        description: "Zapisz audio do pliku WAV"
    },

    exportAudio: {
        message: "Eksportowanie audio...",
        estimated: "Pozostało:"
    },

    demoSoundfontUploadButton: "Wgraj SoundFonta",
    demoGithubPage: "Strona projektu",
    demoBundledSoundfont: "Użyj wbudowanego SoundFonta (22MB)",

    outOfMemory: "Twojej przeglądarce skończyła się pamięć. Rozważ użycie Firefoxa albo plików SF3.\n\n(Zobacz błąd w konsoli)",

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