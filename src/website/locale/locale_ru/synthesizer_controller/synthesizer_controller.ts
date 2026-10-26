import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Контроллер синтезатора (S)",
        description: "Показать контроллер синтезатора"
    },

    // Индикаторы
    mainVoiceMeter: {
        title: "Голоса: ",
        description: "Общее количество голосов, воспроизводимых в данный момент"
    },

    mainVolumeMeter: {
        title: "Громкость: ",
        description: "Текущая общая громкость синтезатора"
    },

    mainPanMeter: {
        title: "Панорама: ",
        description: "Текущая стереопанорама синтезатора"
    },

    mainTransposeMeter: {
        title: "Транспонирование: ",
        description:
            "Транспонирование: изменяет высоту тона синтезатора (в полутонах или клавишах)"
    },

    // Кнопки
    midiPanic: {
        title: "MIDI Panic",
        description: "MIDI Panic: немедленно останавливает все голоса"
    },

    gsReset: {
        title: "Сброс GS",
        description:
            "Сброс GS: сбрасывает весь синтезатор в режим Roland GS и разблокирует все контроллеры"
    },

    xgReset: {
        title: "Сброс XG",
        description:
            "Сброс XG: сбрасывает весь синтезатор в режим Yamaha XG и разблокирует все контроллеры"
    },

    showOnlyUsed: {
        title: "Показывать только используемые",
        description:
            "Показывать только используемые MIDI-каналы в контроллере синтезатора"
    },

    helpButton: {
        title: "Помощь",
        description:
            "Помощь: открывает внешний веб-сайт с руководством по использованию"
    },

    tabs: {
        description: "Вкладки: выберите, что настроить",
        channels: "MIDI-каналы",
        gsReverb: "Реверберация GS",
        gsChorus: "Хорус GS",
        gsDelay: "Задержка GS",
        gsInsertion: "Вставка GS",
        xgReverb: "Реверберация XG",
        xgChorus: "Хорус XG",
        xgVariation: "Вариация XG",
        xgInsertion: "Вставка XG",
        configuration: "Конфигурация"
    },

    holdPedalDown: "Педаль удержания нажата (Shift)",
    keyboardMode:
        "Воспроизведение с клавиатуры включено, нажмите ` для отключения",
    port: "Порт {0} (нажмите, чтобы изменить видимость)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
