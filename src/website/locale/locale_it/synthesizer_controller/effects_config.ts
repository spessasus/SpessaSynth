export const effectsConfig = {
    misc: {
        title: "Configurazione",

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

        interpolation: {
            description:
                "Seleziona il metodo di interpolazione del sintetizzatore",
            linear: "Interpolazione lineare",
            nearestNeighbor: "Vicino più prossimo",
            cubic: "Interpolazione cubica"
        },

        sampleRate: {
            title: "Frequenza di campionamento",
            description:
                "Cambia la frequenza di campionamento del sintetizzatore",
            warning:
                "Cambiare la frequenza di campionamento richiede il ricaricamento della pagina. Sei sicuro di voler continuare?"
        },

        voiceCap: {
            title: "Limite voci",
            description:
                "Il numero massimo di voci consentite contemporaneamente"
        },

        customVibrato: {
            title: "Disabilita vibrato personalizzato",
            description:
                "Disabilita permanentemente il vibrato personalizzato (NRPN). Ricarica il sito per riattivarlo"
        }
    },

    reverb: {
        title: "Configurazione riverbero",
        description: "Configura il processore di riverbero"
    },

    chorus: {
        title: "Configurazione chorus",
        description: "Configura il processore di chorus"
    }
};
