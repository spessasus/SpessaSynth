export const midiSettingsLocale = {
    title: "Configuration MIDI",

    midiInput: {
        title: "Entrée MIDI",
        description: "Le port à écouter pour recevoir les messages MIDI",
        disabled: "Désactivé"
    },

    midiOutput: {
        title: "Sortie MIDI",
        description: "Le port utilisé pour jouer les fichiers MIDI",
        disabled: "Utilisation de SpessaSynth",
        doNotUse: "Ne pas utiliser",
        port1: {
            title: "Port MIDI 1",
            description:
                "Le premier port pour un fichier MIDI multi-port (canaux 16-31)"
        },
        port2: {
            title: "Port MIDI 2",
            description:
                "Le deuxième port pour un fichier MIDI multi-port (canaux 32-47)"
        },
        port3: {
            title: "Port MIDI 3",
            description:
                "Le troisième port pour un fichier MIDI multi-port (canaux 48-64)"
        }
    },

    reminder: {
        title: "Notez que vous devez REDEMARRER VOTRE NAVIGATEUR après avoir connecté un nouveau périphérique MIDI pour qu'il apparaisse ici.",
        description:
            "Notez également que Safari ne prend pas en charge WebMIDI, vous devrez donc utiliser un navigateur différent si vous êtes sur Mac."
    }
};
