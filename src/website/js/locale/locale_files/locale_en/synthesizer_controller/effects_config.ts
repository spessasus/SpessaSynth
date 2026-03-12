export const effectsConfig = {
    toggleLock: {
        title: "Toggle Lock",
        description:
            "Toggle Lock: Prevent MIDI data from changing the effect's parameters."
    },

    misc: {
        title: "Synthesizer configuration",
        description: "Configure miscellaneous settings of the synthesizer.",

        interpolation: {
            description:
                "Interpolation: Select the synthesizer's interpolation method",
            linear: "Linear Interpolation",
            nearestNeighbor: "Nearest neighbor",
            cubic: "Cubic Interpolation"
        },

        sampleRate: {
            title: "Sample Rate",
            description:
                "Sample Rate: Change the sample rate of the synthesizer",
            warning:
                "Changing the sample rate requires a reload of the page. Are you sure you want to continue?"
        },

        voiceCap: {
            title: "Voice Cap",
            description:
                "Voice Cap: The maximum amount of voices allowed to play at once"
        },

        msgsCutoff: {
            title: "MSGS Note Cutoff",
            description:
                "MSGS Note Cutoff: Immediately cuts off the previous note on the same key, emulating the Microsoft GS Wavetable Synthesizer"
        },

        blackMidiMode: {
            title: "Black MIDI Mode",
            description:
                "Black MIDI Mode: Toggles the High Performance Mode, simplifying the look and killing the notes faster"
        },

        drumEditing: {
            title: "Drum Editing",
            description:
                "Drum Editing: Allow editing drum instruments via MIDI system exclusive messages"
        },

        customVibrato: {
            title: "Custom Vibrato",
            description: "Custom Vibrato: Enable the custom NRPN vibrato"
        }
    },

    reverb: {
        title: "Reverb configuration",
        description: "Configure how the reverb effect sounds.",

        level: {
            title: "Level: ",
            description: "Level: This parameter sets the amount of the effect."
        },

        preLowpass: {
            title: "Pre-LPF: ",
            description:
                "Pre-LPF: A low-pass filter can be applied to the sound coming into the effect to cut the high frequency range. " +
                "Higher values will cut more of the high frequencies," +
                " resulting in a more mellow effect sound."
        },

        character: {
            title: "Character: ",
            description:
                "Character: This parameter selects the type of reverb. 0–5 are reverb effects," +
                " and 6 and 7 are delay effects."
        },

        time: {
            title: "Time: ",
            description:
                "Time: This parameter sets the time over which the reverberation will continue. " +
                "Higher values result in longer reverberation."
        },

        delayFeedback: {
            title: "Feedback: ",
            description:
                "Feedback: This parameter is used when the Reverb Character is set to 6 or 7. " +
                "It sets the way in which delays repeat. " +
                "Higher values result in more delay repeats."
        },

        preDelayTime: {
            title: "Pre-delay: ",
            description:
                "Pre-delay: This parameter sets the delay time until the reverberant sound is heard. " +
                "Higher values result in a longer pre-delay time, simulating a larger reverberant space."
        }
    },

    chorus: {
        title: "Chorus configuration",
        description: "Configure how the chorus effects sounds.",

        level: {
            title: "Level: ",
            description: "Level: This parameter sets the amount of the effect."
        },

        preLowpass: {
            title: "Pre-LPF: ",
            description:
                "Pre-LPF: A low-pass filter can be applied to the sound coming into the effect to cut the high frequency range. " +
                "Higher values will cut more of the high frequencies," +
                " resulting in a more mellow effect sound."
        },

        feedback: {
            title: "Feedback: ",
            description:
                "Feedback: This parameter sets the speed (frequency) at which the chorus sound is modulated. " +
                "Higher values result in faster modulation."
        },

        delay: {
            title: "Delay: ",
            description:
                "Delay: This parameter sets the delay time of the chorus effect."
        },

        rate: {
            title: "Rate: ",
            description:
                "Rate: This parameter sets the speed (frequency) at which the chorus sound is modulated. " +
                "Higher values result in faster modulation."
        },

        depth: {
            title: "Depth: ",
            description:
                "Depth: This parameter sets the depth at which the chorus sound is modulated. " +
                "Higher values result in deeper modulation."
        },

        sendLevelToReverb: {
            title: "Send Level To Reverb: ",
            description:
                "Send Level To Reverb: This parameter sets the amount of chorus sound that will be sent to the reverb. " +
                "Higher values result in more sound being sent."
        },

        sendLevelToDelay: {
            title: "Send Level To Delay: ",
            description:
                "Send Level To Delay: This parameter sets the amount of chorus sound that will be sent to the delay. " +
                "Higher values result in more sound being sent."
        }
    },

    delay: {
        title: "Delay configuration",
        description: "Configure how the delay effect sounds.",

        level: {
            title: "Level: ",
            description: "Level: This parameter sets the amount of the effect."
        },

        preLowpass: {
            title: "Pre-LPF: ",
            description:
                "Pre-LPF: A low-pass filter can be applied to the sound coming into the effect to cut the high frequency range. " +
                "Higher values will cut more of the high frequencies," +
                " resulting in a more mellow effect sound."
        },

        timeCenter: {
            title: "Time Center: ",
            description:
                "Time Center: The delay effect has three delay times; center, " +
                "left and right (when listening in stereo). " +
                "Delay Time Center sets the delay time of the delay located at the center."
        },

        timeRatioLeft: {
            title: "Time Ratio Left: ",
            description:
                "Time Ratio Left: This parameter sets the delay time of " +
                "the delay located at the left as a percentage of the Delay Time Center (up to a max. of 1.0 s)."
        },

        timeRatioRight: {
            title: "Time Ratio Right: ",
            description:
                "Time Ratio Right: This parameter sets the delay time of " +
                "the delay located at the right as a percentage of the Delay Time Center (up to a max. of 1.0 s)."
        },

        levelCenter: {
            title: "Level Center: ",
            description:
                "Level Center: This parameter sets the volume of the central delay. " +
                "Higher values result in a louder center delay."
        },
        levelLeft: {
            title: "Level Left: ",
            description:
                "Level Left: This parameter sets the volume of the left delay. " +
                "Higher values result in a louder left delay."
        },
        levelRight: {
            title: "Level Right: ",
            description:
                "Level Right: This parameter sets the volume of the right delay. " +
                "Higher values result in a louder right delay."
        },

        feedback: {
            title: "Feedback: ",
            description:
                "Feedback: This parameter affects the number of times the delay will repeat. " +
                "With a value of 0, the delay will not repeat. " +
                "With higher values there will be more repeats." +
                " With negative (-) values, the center delay will be fed back with inverted phase." +
                " Negative values are effective with short delay times."
        },

        sendLevelToReverb: {
            title: "Send Level To Reverb: ",
            description:
                "Send Level To Reverb: This parameter sets the amount of delay sound that will be sent to the reverb. " +
                "Higher values result in more sound being sent."
        }
    },

    insertion: {
        title: "Insertion Effect configuration",
        description:
            "Select the Insertion Effect and configure how it should sound.",

        sendLevelToReverb: {
            title: "Send Level To Reverb: ",
            description:
                "Send Level To Reverb: Adjust the send level of the sound that comes after the insertion effect to Reverb. " +
                "Higher values result in more sound being sent."
        },

        sendLevelToChorus: {
            title: "Send Level To Chorus: ",
            description:
                "Send Level To Chorus: Adjust the send level of the sound that comes after the insertion effect to Chorus. " +
                "Higher values result in more sound being sent."
        },

        sendLevelToDelay: {
            title: "Send Level To Delay: ",
            description:
                "Send Level To Delay: Adjust the send level of the sound that comes after the insertion effect to Delay. " +
                "Higher values result in more sound being sent."
        }
    }
};
