import { settingsLocale } from './settings/settings.js'
import { musicPlayerModeLocale } from './music_player_mode.js'
import { synthesizerControllerLocale } from './synthesizer_controller/synthesizer_controller.js'
import { sequencerControllerLocale } from './sequencer_controller.js'
import { exportAudio } from './export_audio.js'

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localePolish = {
    localeName: "Polski",
    // title messsage
    titleMessage: "SpessaSynth: JavaScriptowy Syntezator SoundFont2",
    demoTitleMessage: "SpessaSynth: JavaScriptowy Syntezator SoundFont2 Wersja Demo",

    synthInit: {
        genericLoading: "Wczytywanie...",
        loadingSoundfont: "Wczytywanie SoundFonta...",
        loadingBundledSoundfont: "Wczytywanie wbudowanego SoundFonta...",
        startingSynthesizer: "Uruchamianie syntezatora...",
        savingSoundfont: "Zapisywanie SoundFonta do przeglądarki...",
        noWebAudio: "Twoja przeglądarka nie wspiera Web Audio.",
        done: "Gotowe!"
    },

    // top bar buttons
    midiUploadButton: "Wgraj Twoje pliki MIDI",
    midiRenderButton: {
        title: "Eksportuj audio",
        description: "Zapisz audio do pliku WAV lub MIDI"
    },

    exportAudio: exportAudio,

    demoSoundfontUploadButton: "Wgraj SoundFonta",
    demoGithubPage: "Strona projektu",
    demoSongButton: "Piosenka demo",

    warnings: {
        outOfMemory: "Twojej przeglądarce skończyła się pamięć. Rozważ użycie Firefoxa albo plików SF3. (Zobacz błąd w konsoli)",
        noMidiSupport: "Twoja przeglądarka nie wspiera Web MIDI. Korzystanie z portów MIDI nie będzie dostępne. Rozważ użycie Chrome albo Firefoxa.",
        chromeMobile: "SpessaSynth działa wolno na Chromie na telefon. Rozważ użycie Firefoxa Android.",
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