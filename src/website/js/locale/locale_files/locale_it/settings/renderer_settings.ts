export const rendererSettingsLocale = {
    title: "Impostazioni renderer",

    mode: {
        title: "Modalità visualizzazione",
        description: "Cambia la modalità di visualizzazione dei canali",
        waveforms: "Forme d'onda",
        spectrumSplit: "Spettro diviso",
        spectrum: "Spettro",
        filledWaveforms: "Forme d'onda riempite"
    },

    noteFallingTime: {
        title: "Tempo caduta note (millisecondi)",
        description: "Velocità di caduta delle note (visivamente)"
    },

    noteAfterTriggerTime: {
        title: "Tempo post-attivazione note (millisecondi)",
        description:
            "Per quanto tempo le note continuano a cadere dopo essere state attivate. Zero significa che si attivano in fondo"
    },

    waveformThickness: {
        title: "Spessore linea forma d'onda (px)",
        description: "Spessore delle linee della forma d'onda"
    },

    waveformSampleSize: {
        title: "Dimensione campione",
        description:
            "Dettaglio delle visualizzazioni (Nota: valori alti potrebbero influire sulle prestazioni). Inoltre, valori alti aggiungeranno un ritardo all'audio per sincronizzare le forme d'onda con l'audio"
    },

    waveformAmplifier: {
        title: "Amplificatore",
        description: "Vivacità delle visualizzazioni"
    },

    toggleExponentialGain: {
        title: "Abilita guadagno esponenziale",
        description:
            "Rendi più visibili le differenze di guadagno usando una curva esponenziale invece che lineare per il calcolo dell'altezza"
    },

    toggleDynamicGain: {
        title: "Abilita guadagno dinamico",
        description:
            "Regola automaticamente il guadagno in modo che il punto più alto tocchi sempre il bordo superiore del display"
    },

    toggleLogarithmicFrequency: {
        title: "Abilita frequenza logaritmica",
        description:
            "Distribuisci le bande di frequenza in modo logaritmico, anziché lineare. Consigliato"
    },

    toggleWaveformsRendering: {
        title: "Abilita rendering forme d'onda",
        description:
            "Abilita il rendering delle forme d'onda dei canali (linee colorate che mostrano l'audio)"
    },

    toggleNotesRendering: {
        title: "Abilita rendering note",
        description:
            "Abilita il rendering delle note cadenti durante la riproduzione di un file MIDI"
    },

    toggleDrawingActiveNotes: {
        title: "Abilita disegno note attive",
        description:
            "Abilita l'illuminazione e l'effetto glow delle note quando vengono premute"
    },

    toggleDrawingVisualPitch: {
        title: "Abilita disegno pitch visivo",
        description:
            "Abilita lo scorrimento delle note a sinistra o destra quando viene applicata la rotella del pitch"
    },

    toggleRenderingDotDisplay: {
        title: "Abilita disegno dot display",
        description: "Abilita il disegno dei messaggi Dot Display GS/XG"
    },

    toggleStabilizeWaveforms: {
        title: "Stabilizza forme d'onda",
        description: "Abilita il trigger dell'oscilloscopio"
    }
};