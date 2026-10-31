export const midiSettingsLocale = {
    title: "Ustawienia MIDI",

    midiInput: {
        title: "Wejście MIDI",
        description: "Port MIDI, który będzie nasłuchiwany",
        disabled: "Wyłączony"
    },

    midiOutput: {
        title: "Wyjście MIDI",
        description: "Port MIDI, do którego będzie grany utwór",
        disabled: "Użyj SpessaSynth",
        doNotUse: "Nie używaj",
        port1: {
            title: "Port MIDI 1",
            description: "Port 1 dla wielo-portowego pliku MIDI (kanały 16-31)"
        },
        port2: {
            title: "Port MIDI 2",
            description: "Port 2 dla wielo-portowego pliku MIDI (kanały 32-47)"
        },
        port3: {
            title: "Port MIDI 3",
            description: "Port 3 dla wielo-portowego pliku MIDI (kanały 48-64)"
        }
    },

    reminder: {
        title: "Zauważ, że po podłączeniu nowego urządzenia MIDI MUSISZ ZRESTARTOWAĆ PRZEGLĄDARKĘ, aby pojawiło się ono tutaj.",
        description:
            "Zauważ również, że Safari nie obsługuje WebMIDI, więc musisz użyć innej przeglądarki, jeśli jesteś na Macu."
    }
};
