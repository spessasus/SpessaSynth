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
        description:
            "Trasposizione: Traspone il sintetizzatore (in semitoni)"
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

    blackMidiMode: {
        title: "Modalità Black MIDI",
        description:
            "Modalità Black MIDI: Attiva/disattiva la modalità ad alte prestazioni, semplificando l'aspetto visivo e terminando le note più rapidamente"
    },

    msgsCutoff: {
        title: "Taglio note MSGS",
        description:
            "Taglio note MSGS: Interrompe immediatamente la nota precedente sullo stesso tasto, emulando il Microsoft GS Wavetable Synthesizer"
    },

    showOnlyUsed: {
        title: "Mostra solo usati",
        description:
            "Mostra solo i canali MIDI utilizzati nel controller del sintetizzatore"
    },

    disableCustomVibrato: {
        title: "Disabilita vibrato personalizzato",
        description:
            "Disabilita permanentemente il vibrato personalizzato (NRPN). Ricarica il sito per riattivarlo"
    },

    helpButton: {
        title: "Aiuto",
        description: "Aiuto: Apre un sito web esterno con la guida all'utilizzo"
    },

    interpolation: {
        description: "Seleziona il metodo di interpolazione del sintetizzatore",
        linear: "Interpolazione lineare",
        nearestNeighbor: "Vicino più prossimo",
        cubic: "Interpolazione cubica"
    },

    advancedConfiguration: {
        title: "Config",
        description: "Configura le impostazioni avanzate del sintetizzatore"
    },

    sampleRate: {
        title: "Frequenza di campionamento",
        description: "Cambia la frequenza di campionamento del sintetizzatore",
        warning:
            "Cambiare la frequenza di campionamento richiede il ricaricamento della pagina. Sei sicuro di voler continuare?"
    },

    voiceCap: {
        title: "Limite voci",
        description: "Il numero massimo di voci consentite contemporaneamente"
    },

    holdPedalDown: "Pedale sustain premuto (Shift)",
    port: "Porta {0} (clicca per mostrare/nascondere)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};