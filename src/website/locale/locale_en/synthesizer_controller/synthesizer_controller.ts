import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

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

    gsReset: {
        title: "GS Reset",
        description:
            "GS Reset: Resets the entire synthesizer to Roland GS mode and unlocks all controllers"
    },

    xgReset: {
        title: "XG Reset",
        description:
            "XG Reset: Resets the entire synthesizer to Yamaha XG mode and unlocks all controllers"
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
        gsReverb: "GS Reverb",
        gsChorus: "GS Chorus",
        gsDelay: "GS Delay",
        gsInsertion: "GS Insertion",
        xgReverb: "XG Reverb",
        xgChorus: "XG Chorus",
        xgVariation: "XG Variation",
        xgInsertion: "XG Insertion",
        configuration: "Configuration",
        gsUserDrumSet: "GS User Drum Set"
    },

    holdPedalDown: "Hold pedal is down (Shift)",
    keyboardMode: "Keyboard playback is on, press ` to disable",
    port: "Port {0} (click to toggle visibility)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
