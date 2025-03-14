import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";
import { keyModifiers } from "./key_modifiers.js";

/**
 * @type {{systemReset: {description: string, title: string}, disableCustomVibrato: {description: string, title: string}, mainTransposeMeter: {description: string, title: string}, mainVoiceMeter: {description: string, title: string}, midiPanic: {description: string, title: string}, mainPanMeter: {description: string, title: string}, mainVolumeMeter: {description: string, title: string}, toggleButton: {description: string, title: string}, channelController: {transposeMeter: {description: string, title: string}, voiceMeter: {description: string, title: string}, modulationWheelMeter: {description: string, title: string}, expressionMeter: {description: string, title: string}, panMeter: {description: string, title: string}, presetSelector: {description: string}, presetReset: {description: string}, pitchBendMeter: {description: string, title: string}, reverbMeter: {description: string, title: string}, volumeMeter: {description: string, title: string}, drumToggleButton: {description: string}, muteButton: {description: string}, chorusMeter: {description: string, title: string}}, blackMidiMode: {description: string, title: string}}}
 */
export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Kontroler syntezatora",
        description: "Pokaż kontroler syntezatora"
    },
    
    // meters
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
    
    // buttons
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
        description: "Przełącza tryb wysokiej wydajności, upraszczając wygląd i pogarszając jakość dźwięku"
    },
    
    disableCustomVibrato: {
        title: "Wyłącz niestandardowe vibrato",
        description: "Wyłącza niestandardowe (NRPN) vibrato. Wymaga przeładowania strony aby je ponownie włączyć"
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
    
    advancedConfiguration: {
        title: "Zaawansowane Ustawienia",
        description: "Skonfiguruj zaawansowane ustawienia syntezatora"
    },
    
    voiceCap: {
        title: "Limit głosów",
        description: "Maksymalna ilość głosów mogąca grać jednocześnie"
    },
    
    holdPedalDown: "Pedał podtrzymania naciśnięty (Shift)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};