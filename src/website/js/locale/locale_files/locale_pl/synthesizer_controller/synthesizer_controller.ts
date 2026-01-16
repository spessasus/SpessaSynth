import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";
import { keyModifiers } from "./key_modifiers.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Kontroler syntezatora (S)",
        description: "Pokaż kontroler syntezatora"
    },

    // Meters
    mainVoiceMeter: {
        title: "Dźwięki: ",
        description: "Całkowita ilość aktualnie odtwarzanych dźwięków"
    },

    mainVolumeMeter: {
        title: "Głośność: ",
        description: "Aktualna głośność syntezatora"
    },

    mainPanMeter: {
        title: "Stereo: ",
        description: "Aktualna pozycja stereo syntezatora"
    },

    mainTransposeMeter: {
        title: "Transpozycja: ",
        description: "Transpozycjonuje syntezator (w semitonach)"
    },

    // Buttons
    midiPanic: {
        title: "MIDI Panic",
        description: "Zatrzymuje wszystkie dźwięki"
    },

    systemReset: {
        title: "Reset systemu",
        description: "Resetuje wszystkie kontroleru do ich domyślnych wartości"
    },

    blackMidiMode: {
        title: "Tryb black MIDI",
        description:
            "Przełącza tryb wysokiej wydajności, upraszczając wygląd i pogarszając jakość dźwięku"
    },

    msgsCutoff: {
        title: "Ucinanie nut MSGS",
        description:
            "Emuluje zachowanie Microsoft GS Wavetable Synthesizer'a, które od razu ucina poprzednią nutę na tym samym klawiszu"
    },

    disableCustomVibrato: {
        title: "Wyłącz niestandardowe vibrato",
        description:
            "Wyłącza niestandardowe (NRPN) vibrato. Wymaga przeładowania strony aby je ponownie włączyć"
    },

    helpButton: {
        title: "Pomoc",
        description: "Pokaż instrukcję obsługi"
    },

    interpolation: {
        description: "Wybierz metodę interpolacji",
        linear: "Interpolacja liniowa",
        nearestNeighbor: "Najbliższy sąsiad",
        cubic: "Interpolacja Sześcienna"
    },

    showOnlyUsed: {
        title: "Pokaż tylko użyte",
        description: "Pokazuj tylko użyte kontrolery MIDI w tym menu"
    },

    advancedConfiguration: {
        title: "Ustawienia",
        description: "Skonfiguruj zaawansowane ustawienia syntezatora"
    },

    voiceCap: {
        title: "Limit głosów",
        description: "Maksymalna ilość głosów mogąca grać jednocześnie"
    },

    holdPedalDown: "Pedał podtrzymania naciśnięty (Shift)",
    port: "Port {0} (kliknij aby zmienić widoczność)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
