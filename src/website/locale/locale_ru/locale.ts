import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

export const localeRussian = {
    localeName: "Русский",
    // Сообщение заголовка
    titleMessage: "SpessaSynth: Javascript-синтезатор SF2/DLS",
    demoTitleMessage: "SpessaSynth: Онлайн-демо Javascript-синтезатора SF2/DLS",

    synthInit: {
        genericLoading: "Загрузка...",
        loadingSoundfont: "Загрузка SoundFont...",
        loadingBundledSoundfont: "Загрузка встроенного SoundFont...",
        startingSynthesizer: "Запуск синтезатора...",
        savingSoundfont: "Сохранение SoundFont для повторного использования...",
        noWebAudio: "Ваш браузер не поддерживает Web Audio.",
        done: "Готово!"
    },

    // Кнопки верхней панели
    midiUploadButton: "Загрузить MIDI-файлы",

    extraBank: {
        title: "Выбор дополнительного банка",
        offset: {
            title: "Смещение банка",
            description: "Смещение банка для дополнительного банка"
        },
        file: {
            title: "Банк звуков",
            description: "Выберите банк звуков (DLS/SF2/SF3)"
        },
        confirm: {
            title: "Подтвердить",
            description: "Подтвердить и применить дополнительный банк"
        },
        clear: {
            title: "Очистить",
            description: "Очистить дополнительный банк"
        },
        button: "Добавить дополнительный банк звуков"
    },

    exportAudio: exportAudio,

    error: "Ошибка",
    yes: "Да",
    no: "Нет",
    none: "Нет",

    demoSoundfontUploadButton: "Загрузить SoundFont",
    demoGithubPage: "Страница проекта",
    discord: "Присоединиться к серверу Discord!",
    soundfontEditor: "Редактор SF2/DLS",
    demoDownload: {
        main: "Скачать",
        downloadLocal: {
            title: "Скачать локальную версию",
            description:
                "Скачать SpessaSynth: Local Edition для использования в автономном режиме на компьютере"
        }
    },
    demoSongButton: "Демонстрационная композиция",
    credits: "Авторы",
    dropPrompt: "Перетащите файлы сюда...",

    warnings: {
        outOfMemory:
            "В браузере закончилась память. Попробуйте использовать Firefox или SoundFont в формате SF3. (Подробности смотрите в консоли.)",
        noMidiSupport: "Порты MIDI не обнаружены, эта функция будет отключена.",
        warning: "Предупреждение",
        invalidMidiFile: "Недействительный MIDI-файл:"
    },
    hideTopBar: {
        title: "Скрыть верхнюю панель",
        description:
            "Скрыть верхнюю панель (с заголовком) для более удобной работы"
    },

    convertDls: {
        title: "Преобразование DLS",
        message:
            "Хотите преобразовать DLS в SF2 для использования с программами, поддерживающими только SF2?"
    },

    // Все переводы разделены по категориям
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
} as const;
