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
        description: "Zapisz audio do pliku WAV lub MIDI"
    },

    exportAudio: {
        message: "Eksportowanie audio...",
        estimated: "Pozostało:"
    },

    exportAudioOptions: {
        title: "Opcje eksportowania",
        confirm: "Eksportuj",
        normalizeVolume: {
            title: "Normalizuj głośność",
            description: "Eksportuj audio z taką samą głośnością, niezależnie od głośności MIDI.",
        },
        additionalTime: {
            title: "Dodatkowy czas (s)",
            description: "Dodatkowy czas na końcu utworu aby pozwolić na wyciszenie się dźwięku. (sekundy)",
        }
    },

    demoSoundfontUploadButton: "Wgraj SoundFonta",
    demoGithubPage: "Strona projektu",
    demoBundledSoundfont: "Użyj wbudowanego SoundFonta (22MB)",

    warnings: {
        outOfMemory: "Twojej przeglądarce skończyła się pamięć. Rozważ użycie Firefoxa albo plików SF3.<br><br>(Zobacz błąd w konsoli)",
        noMidiSupport: "Twoja przeglądarka nie wspiera Web MIDI. Korzystanie z portów MIDI nie będzie dostępne. Rozważ użycie Chrome albo Firefoxa.",
        chromeMobile: "SpessaSynth działa wolno na Chromie na telefon. <br>Rozważ użycie Firefoxa Android.",
        warning: "Uwaga"
    },

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