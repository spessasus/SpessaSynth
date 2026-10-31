import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

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
        description: "Aktualna transpozycja syntezatora"
    },

    // Buttons
    midiPanic: {
        title: "MIDI Panic",
        description: "Zatrzymuje wszystkie dźwięki"
    },

    gsReset: {
        title: "Reset GS",
        description:
            "Reset GS: Resetuje cały syntezator do trybu Roland GS i odblokowuje wszystkie kontrolery"
    },

    xgReset: {
        title: "Reset XG",
        description:
            "Reset XG: Resetuje cały syntezator do trybu Yamaha XG i odblokowuje wszystkie kontrolery"
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
        gsReverb: "Pogłos GS",
        gsChorus: "Chór GS",
        gsDelay: "Delay GS",
        gsInsertion: "Insertion GS",
        xgReverb: "Pogłos XG",
        xgChorus: "Chór XG",
        xgVariation: "Wariacja XG",
        xgInsertion: "Insertion XG",
        configuration: "Konfiguracja",
        gsUserDrumSet: "Perkusja GS użytkownika"
    },

    holdPedalDown: "Pedał podtrzymania naciśnięty (Shift)",
    keyboardMode:
        "Granie na klawiaturze jest włączone, naciśnij ` aby wyłączyć",
    port: "Port {0} (kliknij aby zmienić widoczność)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
