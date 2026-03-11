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

    showOnlyUsed: {
        title: "Show Only Used",
        description:
            "Show Only Used: Show only the used MIDI channels in the synthesizer controller"
    },

    helpButton: {
        title: "Help",
        description: "Help: Opens an external website with the usage guide"
    },

    tabs: {
        description: "Tabs: Select what to configure",
        channels: "MIDI Channels",
        reverb: "Reverb",
        chorus: "Chorus",
        delay: "Delay",
        insertion: "Insertion",
        configuration: "Configuration"
    },

    holdPedalDown: "Hold pedal is down (Shift)",
    port: "Port {0} (click to toggle visibility)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
