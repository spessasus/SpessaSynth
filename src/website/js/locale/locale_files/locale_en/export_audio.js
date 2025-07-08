export const exportAudio = {
    button: {
        title: "Save Audio",
        description: "Save the composition to various formats"
    },
    
    formats: {
        title: "Choose format",
        formats: {
            wav: {
                button: {
                    title: "WAV audio (.wav)",
                    description: "Export the song with modifications as a .wav audio file"
                },
                options: {
                    title: "WAV export options",
                    description: "Export the current MIDI file as WAV applying all the modifications made via the synthesizer controller.",
                    confirm: "Export",
                    normalizeVolume: {
                        title: "Normalize volume",
                        description: "Keep the volume at the same level, no matter how loud or quiet the MIDI is. Recommended."
                    },
                    additionalTime: {
                        title: "Additional time (s)",
                        description: "Additional time at the end of the song to allow for the sound to fade. (seconds)"
                    },
                    sampleRate: {
                        title: "Sample rate",
                        description: "Output file sample rate in Hz. Leave as is unless you know what you're doing."
                    },
                    
                    separateChannels: {
                        title: "Separate channels",
                        description: "Save each channel as a separate file. Useful for things like oscilloscope viewers. Note that this disables reverb and chorus.",
                        saving: {
                            title: "Channel files",
                            save: "Save channel {0}",
                            saveAll: "Save all"
                        }
                    },
                    loopCount: {
                        title: "Loop count",
                        description: "The amount of times to loop the song"
                    }
                },
                exportMessage: {
                    message: "Exporting WAV audio...",
                    estimated: "Remaining:",
                    convertWav: "Converting to wav..."
                }
            },
            
            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description: "Export the MIDI file with the controller and instrument changes applied"
                }
            },
            
            soundfont: {
                button: {
                    title: "SoundFont (.sf2)",
                    description: "Export a SoundFont2 file"
                },
                
                options: {
                    title: "SF export options",
                    confirm: "Export",
                    trim: {
                        title: "Trim",
                        description: "Export the soundfont trimmed to only use instruments and samples that the MIDI file uses"
                    },
                    compress: {
                        title: "Compress",
                        description: "Compress samples with lossy Ogg Vorbis compression if uncompressed. Significantly reduces the file size." +
                            "If the soundfont was already compressed, it won't be uncompressed even if this option is disabled"
                    },
                    quality: {
                        title: "Compression quality",
                        description: "The quality of compression. Higher is better"
                    }
                }
            },
            
            dls: {
                button: {
                    title: "DLS (.dls)",
                    description: "Export the SoundFont as DLS"
                },
                warning: {
                    title: "DLS Export warning",
                    message: "DLS export is limited and may produce broken files with large and complex SoundFonts.",
                    details: "More info",
                    confirm: "Export anyways"
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
                    modifyingSoundfont: "Trimming Soundfont... (this may take a while!)",
                    saving: "Saving RMIDI...",
                    done: "Done!"
                },
                
                options: {
                    title: "RMIDI export options",
                    description: "Embed the current SoundFont + MIDI as RMIDI and apply all the modifications made via the synthesizer controller.",
                    confirm: "Export",
                    compress: {
                        title: "Compress",
                        description: "Compress the Soundfont with lossy Ogg Vorbis compression. Significantly reduces the file size. Recommended."
                    },
                    quality: {
                        title: "Compression quality",
                        description: "The quality of compression. Higher is better."
                    },
                    bankOffset: {
                        title: "Bank offset",
                        description: "The bank offset of the file. Value of 0 is recommended. Only change if you know what you're doing."
                    },
                    adjust: {
                        title: "Adjust MIDI",
                        description: "Adjusts the MIDI file to the SoundFont. Leave this on unless you know what you're doing."
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "Title:",
                description: "The song's title"
            },
            album: {
                title: "Album:",
                description: "The song's album"
            },
            artist: {
                title: "Artist:",
                description: "The song's artist"
            },
            albumCover: {
                title: "Album cover:",
                description: "The song's album cover"
            },
            creationDate: {
                title: "Created:",
                description: "The song's creation date"
            },
            genre: {
                title: "Genre:",
                description: "The song's genre"
            },
            comment: {
                title: "Comment:",
                description: "The song's comment"
            },
            duration: {
                title: "Duration:",
                description: "The song's duration"
            },
            subject: {
                title: "Subject:",
                description: "The song's subject"
            }
        }
    }
};