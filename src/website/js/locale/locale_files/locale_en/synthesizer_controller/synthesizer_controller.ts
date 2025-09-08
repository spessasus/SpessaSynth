import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";
import { keyModifiers } from "./key_modifiers.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Synthesizer controller (S)",
        description: "Show the synthesizer controller"
    },

    // Meters
    mainVoiceMeter: {
        title: "Voices: ",
        description: "The total amount of voices currently playing"
    },

    mainVolumeMeter: {
        title: "Volume: ",
        description: "The current master volume of the synthesizer"
    },

    mainPanMeter: {
        title: "Pan: ",
        description: "The current master stereo panning of the synthesizer"
    },

    mainTransposeMeter: {
        title: "Transpose: ",
        description:
            "Transpose: Transposes the synthesizer (in semitones or keys)"
    },

    // Buttons
    midiPanic: {
        title: "MIDI Panic",
        description: "MIDI Panic: Stops all voices immediately"
    },

    systemReset: {
        title: "Reset Controllers",
        description:
            "Reset Controllers: Resets all MIDI controllers to their default values"
    },

    blackMidiMode: {
        title: "Black MIDI mode",
        description:
            "Transpose: Toggles the High Performance Mode, simplifying the look and killing the notes faster"
    },

    showOnlyUsed: {
        title: "Show Only Used",
        description:
            "Show only the used MIDI channels in the synthesizer controller"
    },

    disableCustomVibrato: {
        title: "Disable custom vibrato",
        description:
            "Disables the custom (NRPN) Vibrato permamently. Reload the website to reenable it"
    },

    helpButton: {
        title: "Help",
        description: "Help: Opens an external website with the usage guide"
    },

    interpolation: {
        description: "Select the synthesizer's interpolation method",
        linear: "Linear Interpolation",
        nearestNeighbor: "Nearest neighbor",
        cubic: "Cubic Interpolation"
    },

    advancedConfiguration: {
        title: "Config",
        description: "Configure the advanced settings for the synthesizer"
    },

    voiceCap: {
        title: "Voice cap",
        description: "The maximum amount of voices allowed to play at once"
    },

    holdPedalDown: "Hold pedal is down (Shift)",
    port: "Port {0} (click to toggle visibility)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
