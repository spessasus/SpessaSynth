export const midiSettingsLocale = {
    title: "Настройки MIDI",

    midiInput: {
        title: "Вход MIDI",
        description: "Порт для приёма MIDI-сообщений",
        disabled: "Отключено"
    },

    midiOutput: {
        title: "Выход MIDI",
        description: "Порт для воспроизведения MIDI-файла",
        disabled: "Использовать SpessaSynth",
        doNotUse: "Не использовать",
        port1: {
            title: "Порт MIDI 1",
            description: "Порт 1 для многопортового MIDI-файла (каналы 16–31)"
        },
        port2: {
            title: "Порт MIDI 2",
            description: "Порт 2 для многопортового MIDI-файла (каналы 32–47)"
        },
        port3: {
            title: "Порт MIDI 3",
            description: "Порт 3 для многопортового MIDI-файла (каналы 48–64)"
        }
    },

    reminder: {
        title: "Обратите внимание: после подключения нового MIDI-устройства необходимо ПЕРЕЗАПУСТИТЬ БРАУЗЕР, чтобы устройство появилось здесь.",
        description:
            "Также учтите, что Safari не поддерживает WebMIDI. Если вы используете Mac, потребуется другой браузер."
    }
};
