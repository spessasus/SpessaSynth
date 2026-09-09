export const midiSettingsLocale = {
    title: "MIDI settings",

    midiInput: {
        title: "MIDI input",
        description: "The port to listen on for MIDI messages",
        disabled: "Disabled"
    },

    midiOutput: {
        title: "MIDI output",
        description: "The port to play the MIDI file to",
        disabled: "Use SpessaSynth",
        doNotUse: "Do not use",
        port1: {
            title: "MIDI Port 1",
            description:
                "The port 1 for a multi-port MIDI file (channels 16-31)"
        },
        port2: {
            title: "MIDI Port 2",
            description:
                "The port 2 for a multi-port MIDI file (channels 32-47)"
        },
        port3: {
            title: "MIDI Port 3",
            description:
                "The port 3 for a multi-port MIDI file (channels 48-64)"
        }
    },

    reminder: {
        title: "Note that you need to RESTART YOUR BROWSER after connecting a new MIDI device for it to show up here.",
        description:
            "Also note that Safari does not support WebMIDI, so you will need to use a different browser if you are on Mac."
    }
};
