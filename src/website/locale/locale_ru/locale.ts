import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportFile } from "./export_file.js";

export const localeRussian = {
    localeName: "Русский",
    // Заголовки
    titleMessage: "SpessaSynth: JavaScript-синтезатор SF2/DLS",
    demoTitleMessage:
        "SpessaSynth: онлайн-демонстрация JavaScript-синтезатора SF2/DLS",

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
            description: "Смещение для дополнительного банка"
        },
        file: {
            title: "Звуковой банк",
            description: "Выберите звуковой банк (DLS/SF2/SF3)"
        },
        confirm: {
            title: "Подтвердить",
            description: "Подтвердить и применить дополнительный банк"
        },
        clear: {
            title: "Очистить",
            description: "Удалить дополнительный банк"
        },
        button: "Добавить дополнительный звуковой банк"
    },

    exportFile: exportFile,

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
                "Скачайте SpessaSynth: Local Edition, чтобы использовать программу на компьютере без подключения к интернету"
        }
    },
    demoSongButton: "Демонстрационная композиция",
    credits: "Авторы",
    dropPrompt: "Перетащите файлы сюда...",

    warnings: {
        outOfMemory:
            "В браузере закончилась доступная память. Попробуйте использовать Firefox или SoundFont в формате SF3. Подробности смотрите в консоли.",
        noMidiSupport: "Порты MIDI не обнаружены. Эта функция будет отключена.",
        warning: "Предупреждение",
        invalidMidiFile: "Недопустимый MIDI-файл:"
    },
    hideTopBar: {
        title: "Скрыть верхнюю панель",
        description:
            "Скрыть верхнюю панель с заголовком, чтобы интерфейс выглядел более целостным"
    },

    convertDls: {
        title: "Преобразование DLS",
        message:
            "Хотите преобразовать DLS в SF2 для использования в программах, поддерживающих только SF2?"
    },

    // Переводы разделены по файлам
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
} as const;
