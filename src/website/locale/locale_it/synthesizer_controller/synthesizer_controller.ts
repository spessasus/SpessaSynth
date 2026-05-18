import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";
import { keyModifiers } from "./key_modifiers.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Controller sintetizzatore (S)",
        description: "Mostra il controller del sintetizzatore"
    },

    // Meters
    mainVoiceMeter: {
        title: "Voci: ",
        description: "Il numero totale di voci attualmente in riproduzione"
    },

    mainVolumeMeter: {
        title: "Volume: ",
        description: "Il volume master attuale del sintetizzatore"
    },

    mainPanMeter: {
        title: "Pan: ",
        description: "Il panning stereo master attuale del sintetizzatore"
    },

    mainTransposeMeter: {
        title: "Trasposizione: ",
        description: "Trasposizione: Traspone il sintetizzatore (in semitoni)"
    },

    // Buttons
    midiPanic: {
        title: "MIDI Panic",
        description: "MIDI Panic: Ferma tutte le voci immediatamente"
    },

    systemReset: {
        title: "Reimposta controller",
        description:
            "Reimposta controller: Ripristina tutti i controller MIDI ai loro valori predefiniti"
    },

    showOnlyUsed: {
        title: "Mostra solo usati",
        description:
            "Mostra solo i canali MIDI utilizzati nel controller del sintetizzatore"
    },

    helpButton: {
        title: "Aiuto",
        description: "Aiuto: Apre un sito web esterno con la guida all'utilizzo"
    },

    holdPedalDown: "Pedale sustain premuto (Shift)",
    port: "Porta {0} (clicca per mostrare/nascondere)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
