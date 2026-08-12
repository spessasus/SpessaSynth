export const rendererSettingsLocale = {
    title: "Configuration de l'affichage",

    mode: {
        title: "Style de visualisation",
        description: "Changer le style de visualisation des canaux",
        waveforms: "Ondes",
        spectrumSplit: "Spectre séparé",
        spectrum: "Spectre",
        filledWaveforms: "Ondes remplies"
    },

    noteFallingTime: {
        title: "Temps de descente des cascades (millisecondes)",
        description:
            "Définition de la vitesse à laquelle les notes tombent sur le clavier (visuellement)"
    },

    noteAfterTriggerTime: {
        title: "Durée après le déclenchement d'une note (millisecondes)",
        description:
            "Durée de la chute des notes après leur déclenchement. Zéro signifie qu'elles se déclenchent en bas"
    },

    waveformThickness: {
        title: "Épaisseur du trait des formes d'ondes (pixels)",
        description: "Définition de l'épaisseur du trait des formes d'ondes"
    },

    waveformSampleSize: {
        title: "Résolution des formes d'ondes",
        description:
            "Définition du niveau de détail des formes d'ondes (note : une valeur élevée peut diminuer les performances)"
    },

    waveformAmplifier: {
        title: "Amplification des formes d'ondes",
        description:
            "Cette option permet d'obtenir des formes d'ondes évoluant avec plus ou moins d'amplitude"
    },

    toggleExponentialGain: {
        title: "Activer le gain exponentiel",
        description:
            "Rendre les diffécrences de gain plus visibles en utilisant une courbe exponentielle plutôt qu'une courbe linéraire pour la calculation de la hauteur"
    },

    toggleDynamicGain: {
        title: "Activer le gain dynamique",
        description:
            "Ajuster le gain automatiquement pour que le point le plus haut touche toujours le haut de l'affichage"
    },

    toggleLogarithmicFrequency: {
        title: "Afficher la fréquence logarithmique",
        description:
            "Étaler les fréquences de façon logarithmique plutôt que linéaire. Recommandé"
    },

    toggleNotesRendering: {
        title: "Visibilité des cascades",
        description:
            "Active ou non le rendu des chutes de notes sur le clavier lors de la lecture d'un fichier MIDI"
    },

    toggleDrawingActiveNotes: {
        title: "Visibilité des notes actives",
        description:
            "Active ou non les lumières lorsque les touches sont appuyées"
    },

    toggleDrawingVisualPitch: {
        title: "Rendu visuel du pitch bend",
        description:
            "Active ou non le glissement vers la droite ou vers la gauche des notes lorsque le pitch bend est utilisé"
    },

    toggleDrawingPresetNames: {
        title: "Afficher le nom des presets",
        description: "Afficher le nom des presets de chaques ondes"
    },

    toggleRenderingDotDisplay: {
        title: "Afficher les messages d'affichage",
        description: "Afficher les messages d'affichage GS/XG"
    },

    toggleStabilizeWaveforms: {
        title: "Stabilisation des formes d'ondes",
        description:
            "Active ou non la stabilisation des formes d'ondes comme sur un oscilloscope"
    }
};
