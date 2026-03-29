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

    helpButton: {
        title: "Pomoc",
        description: "Pokaż instrukcję obsługi"
    },

    showOnlyUsed: {
        title: "Pokaż tylko użyte",
        description: "Pokazuj tylko użyte kontrolery MIDI w tym menu"
    },

    tabs: {
        description: "Karty: Wybierz, co chcesz skonfigurować",
        channels: "Kanały MIDI",
        reverb: "Pogłos",
        chorus: "Chór",
        delay: "Delay",
        insertion: "Insertion",
        configuration: "Konfiguracja"
    },

    holdPedalDown: "Pedał podtrzymania naciśnięty (Shift)",
    keyboardMode: "Granie na klawiaturze jest włączone",
    port: "Port {0} (kliknij aby zmienić widoczność)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
