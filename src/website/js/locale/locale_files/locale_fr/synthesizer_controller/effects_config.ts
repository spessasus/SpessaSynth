export const effectsConfig = {
    button: {
        title: "Configuration des effets",
        description:
            "Configure les effets de chorus et de réverbération ainsi que le vibrato personnalisé"
    },
    reverbConfig: {
        title: "Configuration de la réverbération",
        description: "Configure l'effet de réverbération",
        impulseResponse: {
            title: "Response impulsionnelle",
            description:
                "Sélectionnez la réponse impulsionnelle pour la réverbération à convolution"
        }
    },

    chorusConfig: {
        title: "Configuration du chorus",
        description: "Configure l'effet de chorus",
        nodesAmount: {
            title: "Nombre de lignes de retard",
            description:
                "Nombre de lignes de retard (pour chaque canal stéréo) à utiliser"
        },
        defaultDelay: {
            title: "Délai (s)",
            description: "Durée en secondes de la première ligne de retard"
        },
        delayVariation: {
            title: "Augmentation du délai (s)",
            description:
                "Durée à ajouter en secondes pour chaque ligne de retard après la première"
        },
        stereoDifference: {
            title: "Différence stéréo (s)",
            description:
                "Différence du délai entre 2 canaux (ajouté au canal de gauche et soustrait au canal de droite)"
        },
        oscillatorFrequency: {
            title: "Fréquence LFO (Hz)",
            description:
                "Fréquence de l'oscillateur (LFO) de la première ligne de retard, en Hz. Le LFO contrôle la durée du retard."
        },
        frequencyVariation: {
            title: "Augmentation LFO (Hz)",
            description:
                "Quantité à ajouter à la fréquence d'oscillation de chaque ligne de retard après la première, en Hz"
        },
        oscillatorGain: {
            title: "Gain LFO (s)",
            description:
                "Combien l'oscillateur modifie-t-il le délai des lignes de retard, en secondes "
        },
        apply: {
            title: "Valider",
            description: "Sauvegarde les paramètres des effets"
        }
    }
};
