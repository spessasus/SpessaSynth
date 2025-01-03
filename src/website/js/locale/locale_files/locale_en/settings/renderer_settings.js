export const rendererSettingsLocale = {
    title: "Renderer settings",
    noteFallingTime: {
        title: "Note falling time (miliseconds)",
        description: "How fast the notes fall (visually)"
    },
    
    noteAfterTriggerTime: {
        title: "Note after trigger time (miliseconds)",
        description: "How long the notes fall after they get triggered. Zero means that they trigger at the bottom."
    },
    
    waveformThickness: {
        title: "Waveform line thickness (px)",
        description: "How thick the waveform lines are"
    },
    
    waveformSampleSize: {
        title: "Waveform sample size",
        description: "How detailed the waveforms are (Note: high values might impact performance). Also note that high values will add a delay to the audio to sync the waveforms with the audio."
    },
    
    waveformAmplifier: {
        title: "Waveform amplifier",
        description: "How vibrant the waveforms are"
    },
    
    toggleWaveformsRendering: {
        title: "Enable waveforms rendering",
        description: "Enable rendering the channel waveforms (colorful lines showing audio)"
    },
    
    toggleNotesRendering: {
        title: "Enable notes rendering",
        description: "Enable rendering of the falling notes when playing a MIDI file"
    },
    
    toggleDrawingActiveNotes: {
        title: "Enable drawing active notes",
        description: "Enable notes lighting up and glowing when they get pressed"
    },
    
    toggleDrawingVisualPitch: {
        title: "Enable drawing visual pitch",
        description: "Enable notes sliding left or right when the pitch wheel is applied"
    },
    
    toggleStabilizeWaveforms: {
        title: "Stabilize waveforms",
        description: "Enable oscilloscope triggering"
    }
};