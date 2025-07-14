import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localePolish = {
    localeName: "Polski",
    // title messsage
    titleMessage: "SpessaSynth: JavaScriptowy Syntezator SF2/DLS",
    demoTitleMessage: "SpessaSynth: JavaScriptowy Syntezator SF2/DLS Wersja Demo",
    
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
    
    
    extraBank: {
        title: "Wybór dodatkowego banku",
        offset: {
            title: "Przesunięcie banku",
            description: "Przesunięcie banku dla dodatkowego banku"
        },
        file: {
            title: "Plik banku",
            description: "Wybierz plik dla banku dźwiękowego (DLS/SF2/SF3)"
        },
        confirm: {
            title: "Zatwierdź",
            description: "Potwierdź i zastosuj wybrany bank"
        },
        clear: {
            title: "Wyczyść",
            description: "Wyczyść dodatkowy bank"
        },
        button: "Dodaj dodatkowy bank dźwięków"
    },
    
    exportAudio: exportAudio,
    
    yes: "Tak",
    no: "Nie",
    error: "Błąd",
    none: "Brak",
    
    demoSoundfontUploadButton: "Wgraj SoundFonta",
    demoGithubPage: "Strona projektu",
    soundfontEditor: "Edytor SoundFontów",
    demoDownload: {
        main: "Pobierz",
        downloadLocal: {
            title: "Pobierz Edycję Lokalną",
            description: "Pobierz SpessaSynth: Edycja Lokalna aby używać jej na swoim komputerze bez internetu"
        }
    },
    demoSongButton: "Piosenka demo",
    credits: "Twórcy",
    dropPrompt: "Upuść pliki tutaj...",
    
    warnings: {
        outOfMemory: "Twojej przeglądarce skończyła się pamięć. Rozważ użycie Firefoxa albo plików SF3. (Zobacz błąd w konsoli)",
        noMidiSupport: "Nie wykryto MIDI. Korzystanie z portów MIDI nie będzie dostępne.",
        warning: "Uwaga"
    },
    
    hideTopBar: {
        title: "Ukryj górny pasek",
        description: "Ukryj pasek tytułowy w celu poprawy widoczności na pionowych ekranach"
    },
    
    convertDls: {
        title: "Konwersja DLS",
        message: "Wygląda na to, że wgrałeś plik DLS. Czy chcesz przekonwertować go do SF2?"
    },
    
    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};