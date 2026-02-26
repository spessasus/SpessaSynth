export const keyModifiers = {
    button: {
        title: "Modificatori tasto",
        description: "Modifica i parametri individuali dei tasti"
    },

    mainTitle: "Editor modifiche tasti",

    detailedDescription:
        "Questo menu ti permette di modificare una nota MIDI su un determinato canale.\n" +
        "Attualmente puoi modificarne la velocità (velocity) e assegnarle un patch (strumento).\n" +
        "Questo è particolarmente utile per le percussioni.",

    prompt: "Cosa desideri fare?",

    selectKey: {
        prompt: "Premi il tasto che vuoi modificare sulla tastiera.",
        title: "Seleziona tasto",
        change: "Cambia tasto"
    },

    selectedChannel: {
        title: "Canale selezionato",
        description: "Il canale a cui appartiene il tasto che vuoi modificare"
    },

    selectedKey: {
        title: "Tasto selezionato: {0}",
        description: "Hai selezionato la nota MIDI numero {0}"
    },

    modifyKey: {
        title: "Modifica un tasto",
        description: "Modifica un singolo tasto su un determinato canale",
        velocity: {
            title: "Override velocità",
            description:
                "La velocità da utilizzare su questo tasto, ignorando la velocità MIDI. Lascia a -1 per non modificare"
        },
        gain: {
            title: "Guadagno",
            description: "Guadagno lineare per questa voce. Imposta a 1 per non modificare."
        },
        preset: {
            title: "Override preset",
            description: "Il preset da utilizzare su questo tasto.",
            unchanged: "Non modificato"
        },
        apply: {
            title: "Applica",
            description: "Applica il modificatore selezionato"
        }
    },

    removeModification: {
        title: "Rimuovi modifica",
        description: "Rimuovi la modifica da un singolo tasto su un determinato canale",

        remove: {
            title: "Rimuovi",
            description: "Rimuovi questo modificatore di tasto"
        }
    },

    resetModifications: {
        title: "Reimposta modifiche",
        description: "Cancella e reimposta tutte le modifiche ai tasti da tutti i canali",

        confirmation: {
            title: "Conferma le tue azioni",
            description: "Sei sicuro di voler rimuovere TUTTE le modifiche?"
        }
    }
};