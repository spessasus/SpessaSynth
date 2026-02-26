export const effectsConfig = {
    button: {
        title: "Configurazione effetti",
        description:
            "Configura gli effetti chorus e riverbero e il vibrato personalizzato"
    },
    reverbConfig: {
        title: "Configurazione riverbero",
        description: "Configura il processore di riverbero",
        impulseResponse: {
            title: "Risposta all'impulso",
            description: "Seleziona la risposta all'impulso per il riverbero convolutivo"
        }
    },

    chorusConfig: {
        title: "Configurazione chorus",
        description: "Configura il processore di chorus",
        nodesAmount: {
            title: "Numero nodi",
            description:
                "Il numero di nodi di ritardo (per ogni canale stereo) da utilizzare"
        },
        defaultDelay: {
            title: "Ritardo (s)",
            description: "Il tempo di ritardo per il primo nodo in secondi"
        },
        delayVariation: {
            title: "Incremento ritardo (s)",
            description:
                "L'incremento per ogni nodo di ritardo successivo al primo, in secondi"
        },
        stereoDifference: {
            title: "Differenza stereo (s)",
            description:
                "La differenza di ritardi tra i due canali (aggiunta al canale sinistro e sottratta dal destro)"
        },
        oscillatorFrequency: {
            title: "Frequenza LFO (Hz)",
            description:
                "La frequenza LFO del primo nodo di ritardo, in Hz. L'LFO controlla il tempo di ritardo."
        },
        frequencyVariation: {
            title: "Incremento LFO (Hz)",
            description:
                "L'incremento per la frequenza di ogni LFO successivo al primo, in Hz"
        },
        oscillatorGain: {
            title: "Guadagno LFO (s)",
            description:
                "Quanto l'LFO altererà il ritardo nei nodi di ritardo, in secondi"
        },
        apply: {
            title: "Applica",
            description: "Applica le impostazioni selezionate"
        }
    }
};