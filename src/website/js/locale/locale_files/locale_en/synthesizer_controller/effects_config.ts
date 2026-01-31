export const effectsConfig = {
    button: {
        title: "Effects config",
        description:
            "Configure the chorus and reverb effects and the custom vibrato"
    },
    reverbConfig: {
        title: "Reverb configuration",
        description: "Configure the reverb processor",
        impulseResponse: {
            title: "Impulse response",
            description: "Select impulse response for the convolver reverb"
        }
    },

    chorusConfig: {
        title: "Chorus configuration",
        description: "Configure the chorus processor",
        nodesAmount: {
            title: "Nodes amount",
            description:
                "The amount of delay nodes (for each stereo channel) to use"
        },
        defaultDelay: {
            title: "Delay (s)",
            description: "The delay time for the first node in seconds"
        },
        delayVariation: {
            title: "Delay increment (s)",
            description:
                "The amount to increment each delay node after the first one in seconds"
        },
        stereoDifference: {
            title: "Stereo difference (s)",
            description:
                "The difference of delays between two channels (added to the left channel and subtracted from the right)"
        },
        oscillatorFrequency: {
            title: "LFO frequency (Hz)",
            description:
                "The first delay node's LFO frequency, in Hz. The LFO controls delay time."
        },
        frequencyVariation: {
            title: "LFO increment (Hz)",
            description:
                "The amount to increment each LFO's frequency after the first one, in Hz"
        },
        oscillatorGain: {
            title: "LFO gain (s)",
            description:
                "How much will LFO alter the delay in delay nodes, in seconds"
        },
        apply: {
            title: "Apply",
            description: "Apply the selected settings"
        }
    }
};
