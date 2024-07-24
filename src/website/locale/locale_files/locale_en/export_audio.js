export const exportAudio = {
    button: {
        title: "Save audio",
        description: "Save audio as WAV, MIDI, SF2 or RMI file"
    },

    formats: {
        title: "Choose format",
        formats: {
            wav: {
                button: {
                    title: "WAV audio",
                    description: "Export the song with modifications as a .wav audio file"
                },
                options: {
                    title: "Audio export options",
                    confirm: "Export",
                    normalizeVolume: {
                        title: "Normalize volume",
                        description: "Keep the volume at the same level, no matter how loud or quiet the MIDI is. Recommended.",
                    },
                    additionalTime: {
                        title: "Additional time (s)",
                        description: "Additional time at the end of the song to allow for the sound to fade. (seconds)",
                    }
                },
                exportMessage: {
                    message: "Exporting audio...",
                    estimated: "Remaining:"
                }
            },

            midi: {
                button: {
                    title: "Modified MIDI",
                    description: "Export the MIDI file with the controller and instrument changes applied"
                }
            },

            soundfont: {
                button: {
                    title: "Trimmed soundfont",
                    description: "Export the soundfont trimmed to only use instruments and samples that the MIDI file uses"
                }
            },

            rmidi: {
                button: {
                    title: "Embedded MIDI (.rmi)",
                    description: "Export the modified MIDI with the embedded trimmed soundfont as a single file. " +
                        "Note that this format isn't widely supported"
                },

                progress: {
                    title: "Exporting embeded MIDI...",
                    loading: "Loading Soundfont and MIDI...",
                    modifyingMIDI: "Modifying MIDI...",
                    modifyingSoundfont: "Trimming Soundfont...",
                    saving: "Saving RMIDI...",
                    done: "Done!"
                }
            }
        }
    }
}