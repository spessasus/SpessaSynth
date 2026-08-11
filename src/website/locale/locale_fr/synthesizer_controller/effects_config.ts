export const effectsConfig = {
    toggleLock: {
        title: "Activer/Désactiver le verrou",
        description:
            "Activer/Désactiver le verrou : Empecher les événements MIDI de changer les paramètres des effets."
    },

    misc: {
        title: "Configuration",

        interpolation: {
            description:
                "Sélection de la méthode d'interpolation du synthétiseur",
            linear: "Interpolation linéaire",
            nearestNeighbor: "Aucune (valeur la plus proche)",
            cubic: "Interpolation cubique"
        },

        sampleRate: {
            title: "Taux d'échantillonnage",
            description:
                "Taux d'échantillonnage : Changer le taux d'échantillonnage du synthétiseur",
            warning:
                "Changer le taux d'échantillonnage nécessite le réfraichissement de la page. Êtes-vous sûr(e) de vouloir continuer?"
        },

        voiceCap: {
            title: "Nombre de voix max.",
            description:
                "Nombre de voix maximum : Le nombre maximum de voix pouvant exister en même temps"
        },

        msgsCutoff: {
            title: "Coupure de note MSGS",
            description:
                "Coupure de note MSGS : Couper la note précédent si elle est identique à la nouvelle note, comme le synthétiseur \"Microsoft GS Wavetable Synthesizer\""
        },

        blackMidiMode: {
            title: "Mode Black MIDI",
            description:
                "Active le mode haute performance, en simplifiant l'apparence générale et en arrêtant les notes plus rapidement"
        },

        drumEditing: {
            title: "Édition de la batterie",
            description:
                "Édition de la batterie : Éditer les batteries via des messages MIDI"
        }
    },

    reverb: {
        title: "Configuration de la réverbération",
        description: "Configure l'effet de réverbération",

        gain: {
            title: "Gain: ",
            description:
                "Gain: This parameter sets the gain of the effect. Note that this WILL NOT be saved in the MIDI file if exported."
        },

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
        title: "Configuration du chorus",
        description: "Configure l'effet de chorus",

        gain: {
            title: "Gain: ",
            description:
                "Gain: This parameter sets the gain of the effect. Note that this WILL NOT be saved in the MIDI file if exported."
        },

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

        gain: {
            title: "Gain: ",
            description:
                "Gain: This parameter sets the gain of the effect. Note that this WILL NOT be saved in the MIDI file if exported."
        },

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
        title: "Insertion Effect Configuration",
        description:
            "Select the Insertion Effect and configure how it should sound.",

        activeChannels: {
            title: "Active Channels",
            description:
                "Select which channels have the Insertion Effect enabled."
        },

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
