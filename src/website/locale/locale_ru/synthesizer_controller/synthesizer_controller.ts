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
        description: "Общее количество звучащих в данный момент голосов"
    },

    mainVolumeMeter: {
        title: "Громкость: ",
        description: "Текущая общая громкость синтезатора"
    },

    mainPanMeter: {
        title: "Панорама: ",
        description: "Текущее положение общей стереопанорамы синтезатора"
    },

    mainTransposeMeter: {
        title: "Транспонирование: ",
        description:
            "Транспонирование: изменение тональности синтезатора в полутонах"
    },

    // Кнопки
    midiPanic: {
        title: "Экстренная остановка MIDI",
        description:
            "Экстренная остановка MIDI: немедленно прекращает звучание всех голосов"
    },

    gsReset: {
        title: "Сброс GS",
        description:
            "Сброс GS: переключает весь синтезатор в режим Roland GS и разблокирует все контроллеры"
    },

    xgReset: {
        title: "Сброс XG",
        description:
            "Сброс XG: переключает весь синтезатор в режим Yamaha XG и разблокирует все контроллеры"
    },

    showOnlyUsed: {
        title: "Показывать только используемые",
        description:
            "Показывать только используемые: отображать в контроллере синтезатора только MIDI-каналы, которые используются"
    },

    helpButton: {
        title: "Справка",
        description:
            "Справка: открыть внешний сайт с руководством по использованию"
    },

    tabs: {
        description: "Вкладки: выберите параметр для настройки",
        channels: "MIDI-каналы",
        gsReverb: "Реверберация GS",
        gsChorus: "Хор GS",
        gsDelay: "Задержка GS",
        gsInsertion: "Эффекты вставки GS",
        xgReverb: "Реверберация XG",
        xgChorus: "Хор XG",
        xgVariation: "Вариация XG",
        xgInsertion: "Эффекты вставки XG",
        configuration: "Конфигурация",
        gsUserDrumSet: "Пользовательский набор ударных GS"
    },

    holdPedalDown: "Педаль удержания нажата (Shift)",
    keyboardMode: "Режим игры на клавиатуре включён. Нажмите `, чтобы отключить",
    port: "Порт {0} (нажмите, чтобы переключить видимость)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};