import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportFile } from "./export_file.js";

export const localePolish = {
    localeName: "Polski",
    // Title message
    titleMessage: "SpessaSynth: JavaScriptowy Syntezator SF2/DLS",
    demoTitleMessage:
        "SpessaSynth: JavaScriptowy Syntezator SF2/DLS Wersja Demo",

    synthInit: {
        genericLoading: "Wczytywanie...",
        loadingSoundfont: "Wczytywanie SoundFonta...",
        loadingBundledSoundfont: "Wczytywanie wbudowanego SoundFonta...",
        startingSynthesizer: "Uruchamianie syntezatora...",
        savingSoundfont: "Zapisywanie SoundFonta do przeglądarki...",
        noWebAudio: "Twoja przeglądarka nie wspiera Web Audio.",
        done: "Gotowe!"
    },

    // Top bar buttons
    songUploadLocale: "Wgraj Twoje utwory",
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

    exportFile: exportFile,

    yes: "Tak",
    no: "Nie",
    error: "Błąd",
    none: "Brak",

    demoSoundfontUploadButton: "Wgraj SoundFonta",
    demoGithubPage: "Strona projektu",
    discord: "Dołącz do serwera Discord!",
    soundfontEditor: "Edytor SF2/DLS",
    demoDownload: {
        main: "Pobierz",
        downloadLocal: {
            title: "Pobierz Edycję Lokalną",
            description:
                "Pobierz SpessaSynth: Edycja Lokalna aby używać jej na swoim komputerze bez internetu"
        }
    },
    demoSongButton: "Piosenka demo",
    demoSongPlay: "Odtwórz",
    demoSongRemoval:
        "Jeśli twoja piosenka znajduje się na tej liście i chcesz ją usunąć, napisz na adres spesekspesek@gmail.com, a zostanie usunięta. Piosenki nie są przechowywane w repozytorium SpessaSynth, są hostowane pod adresem https://github.com/spessasus/spessasynth-demo-songs/",
    credits: "Twórcy",
    dropPrompt: "Upuść pliki tutaj...",

    warnings: {
        outOfMemory:
            "Twojej przeglądarce skończyła się pamięć. Rozważ użycie Firefoxa albo plików SF3. (Zobacz błąd w konsoli)",
        noMidiSupport:
            "Nie wykryto MIDI. Korzystanie z portów MIDI nie będzie dostępne.",
        warning: "Uwaga",
        invalidMidiFile: "Uszkodzony plik MIDI:"
    },

    hideTopBar: {
        title: "Ukryj górny pasek",
        description:
            "Ukryj pasek tytułowy w celu poprawy widoczności na pionowych ekranach"
    },
    fullscreen: {
        title: "Pełny ekran",
        description: "Przełącz tryb pełnoekranowy"
    },

    convertDls: {
        title: "Konwersja DLS",
        message:
            "Wygląda na to, że wgrałeś plik DLS. Czy chcesz przekonwertować go do SF2?"
    },

    // All translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};
