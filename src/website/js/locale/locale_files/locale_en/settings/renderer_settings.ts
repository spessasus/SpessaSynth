export const rendererSettingsLocale = {
    title: "Renderer settings",

    mode: {
        title: "Visualization mode",
        description: "Change the visualization mode of the channels",
        waveforms: "Waveforms",
        spectrumSplit: "Spectrum Split",
        spectrum: "Spectrum",
        filledWaveforms: "Filled Waveforms"
    },

    noteFallingTime: {
        title: "Note falling time (milliseconds)",
        description: "How fast the notes fall (visually)"
    },

    noteAfterTriggerTime: {
        title: "Note after trigger time (milliseconds)",
        description:
            "How long the notes fall after they get triggered. Zero means that they trigger at the bottom"
    },

    waveformThickness: {
        title: "Waveform line thickness (px)",
        description: "How thick the waveform lines are"
    },

    waveformSampleSize: {
        title: "Sample size",
        description:
            "How detailed the visualizations are (Note: high values might impact performance). Also note that high values will add a delay to the audio to sync the waveforms with the audio"
    },

    waveformAmplifier: {
        title: "Amplifier",
        description: "How vibrant the visualizaions are"
    },

    toggleExponentialGain: {
        title: "Enable exponential gain",
        description:
            "Make the differences in gain more visible by using exponential curve rather than linear for height calculation"
    },

    toggleDynamicGain: {
        title: "Enable dynamic gain",
        description:
            "Adjust the gain automatically so the highest point always touches the ceiling of the display"
    },

    toggleLogarithmicFrequency: {
        title: "Enable logarithmic frequency",
        description:
            "Spread the frequency bins in a logarithmic fashion, rather than linear. Recommended"
    },

    toggleWaveformsRendering: {
        title: "Enable waveforms rendering",
        description:
            "Enable rendering the channel waveforms (colorful lines showing audio)"
    },

    toggleNotesRendering: {
        title: "Enable notes rendering",
        description:
            "Enable rendering of the falling notes when playing a MIDI file"
    },

    toggleDrawingActiveNotes: {
        title: "Enable drawing active notes",
        description:
            "Enable notes lighting up and glowing when they get pressed"
    },

    toggleDrawingVisualPitch: {
        title: "Enable drawing visual pitch",
        description:
            "Enable notes sliding left or right when the pitch wheel is applied"
    },

    toggleRenderingDotDisplay: {
        title: "Enable drawing dot display",
        description: "Enable drawing the GS/XG Dot Display mesages"
    },

    toggleStabilizeWaveforms: {
        title: "Stabilize waveforms",
        description: "Enable oscilloscope triggering"
    }
};
