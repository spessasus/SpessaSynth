export const effectsConfig = {
    misc: {
        title: "Configuration",

        blackMidiMode: {
            title: "Mode Black MIDI",
            description:
                "Active le mode haute performance, en simplifiant l'apparence générale et en arrêtant les notes plus rapidement"
        },

        customVibrato: {
            title: "Désactiver le vibrato personnalisé",
            description:
                "Désactive le vibrato personnalisé (NRPN) de manière permanente\nUn rechargement de la page web sera nécessaire pour le réactiver"
        },

        interpolation: {
            description:
                "Sélection de la méthode d'interpolation du synthétiseur",
            linear: "Interpolation linéaire",
            nearestNeighbor: "Aucune (valeur la plus proche)",
            cubic: "Interpolation cubique"
        }
    },

    reverb: {
        title: "Configuration de la réverbération",
        description: "Configure l'effet de réverbération"
    },

    chorus: {
        title: "Configuration du chorus",
        description: "Configure l'effet de chorus"
    }
};
