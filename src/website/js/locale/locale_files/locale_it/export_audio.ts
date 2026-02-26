export const exportAudio = {
    button: {
        title: "Salva audio",
        description: "Salva la composizione in vari formati"
    },

    formats: {
        title: "Scegli formato",
        formats: {
            wav: {
                button: {
                    title: "Audio WAV (.wav)",
                    description:
                        "Esporta il brano con le modifiche come file audio .wav"
                },
                options: {
                    title: "Opzioni esportazione WAV",
                    description:
                        "Esporta il file MIDI corrente come WAV applicando tutte le modifiche effettuate tramite il controller del sintetizzatore.",
                    confirm: "Esporta",
                    normalizeVolume: {
                        title: "Normalizza volume",
                        description:
                            "Mantieni il volume allo stesso livello, indipendentemente da quanto sia forte o debole il MIDI. Consigliato."
                    },
                    additionalTime: {
                        title: "Tempo aggiuntivo (s)",
                        description:
                            "Tempo aggiuntivo alla fine del brano per consentire al suono di affievolirsi. (secondi)"
                    },
                    sampleRate: {
                        title: "Frequenza campionamento",
                        description:
                            "Frequenza di campionamento del file di output in Hz. Lascia invariato se non sai cosa stai facendo."
                    },

                    separateChannels: {
                        title: "Canali separati",
                        description:
                            "Salva ogni canale come file separato. Utile per cose come visualizzatori oscilloscopio. Nota che questo disabilita riverbero e chorus.",
                        saving: {
                            title: "File canali",
                            save: "Salva canale {0}",
                            saveAll: "Salva tutti"
                        }
                    },
                    loopCount: {
                        title: "Numero loop",
                        description: "Il numero di volte in cui ripetere il brano"
                    }
                },
                exportMessage: {
                    message: "Esportazione audio WAV in corso...",
                    addingEffects: "Aggiunta effetti...",
                    estimated: "Rimanente:",
                    convertWav: "Conversione in wav..."
                }
            },

            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description:
                        "Esporta il file MIDI con le modifiche ai controller e agli strumenti applicate"
                }
            },

            soundfont: {
                button: {
                    title: "SoundFont (.sf2, .sf3)",
                    description: "Esporta un file SoundFont2"
                },

                options: {
                    title: "Opzioni esportazione SF",
                    confirm: "Esporta",
                    trim: {
                        title: "Riduci",
                        description:
                            "Esporta il soundfont ridotto per utilizzare solo gli strumenti e i campioni che il file MIDI usa"
                    },
                    compress: {
                        title: "Comprimi",
                        description:
                            "Comprimi i campioni con compressione lossy Ogg Vorbis se non compressi. Riduce significativamente la dimensione del file. " +
                            "Se il soundfont era già compresso, non verrà decompresso anche se questa opzione è disabilitata"
                    },
                    quality: {
                        title: "Qualità compressione",
                        description:
                            "La qualità della compressione. Più alto è, meglio è"
                    }
                },

                exportMessage: {
                    message: "Esportazione SoundFont in corso..."
                }
            },

            dls: {
                button: {
                    title: "DLS (.dls)",
                    description: "Esporta il SoundFont come DLS"
                },
                warning: {
                    title: "Avviso esportazione DLS",
                    message:
                        "L'esportazione DLS è limitata e potrebbe produrre file danneggiati con SoundFont grandi e complessi.",
                    details: "Maggiori informazioni",
                    confirm: "Esporta comunque"
                },

                exportMessage: {
                    message: "Esportazione DLS in corso..."
                }
            },

            rmidi: {
                button: {
                    title: "MIDI incorporato (.rmi)",
                    description:
                        "Esporta il MIDI modificato con il soundfont ridotto incorporato come un singolo file. " +
                        "Nota che questo formato non è ampiamente supportato"
                },

                progress: {
                    title: "Esportazione MIDI incorporato in corso...",
                    loading: "Caricamento Soundfont e MIDI...",
                    modifyingMIDI: "Modifica MIDI...",
                    modifyingSoundfont:
                        "Riduzione Soundfont... (potrebbe volerci un po'!)",
                    saving: "Salvataggio RMIDI...",
                    done: "Fatto!"
                },

                options: {
                    title: "Opzioni esportazione RMIDI",
                    description:
                        "Incorpora il SoundFont + MIDI corrente come RMIDI e applica tutte le modifiche effettuate tramite il controller del sintetizzatore.",
                    confirm: "Esporta",
                    compress: {
                        title: "Comprimi",
                        description:
                            "Comprimi il Soundfont con compressione lossy Ogg Vorbis. Riduce significativamente la dimensione del file. Consigliato."
                    },
                    quality: {
                        title: "Qualità compressione",
                        description:
                            "La qualità della compressione. Più alto è, meglio è."
                    },
                    bankOffset: {
                        title: "Offset bank",
                        description:
                            "L'offset bank del file. Il valore 0 è consigliato. Cambia solo se sai cosa stai facendo."
                    },
                    adjust: {
                        title: "Regola MIDI",
                        description:
                            "Regola il file MIDI per il SoundFont. Lascia attivo se non sai cosa stai facendo."
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "Titolo:",
                description: "Il titolo del brano"
            },
            album: {
                title: "Album:",
                description: "L'album del brano"
            },
            artist: {
                title: "Artista:",
                description: "L'artista del brano"
            },
            albumCover: {
                title: "Copertina album:",
                description: "La copertina dell'album del brano"
            },
            creationDate: {
                title: "Creato il:",
                description: "La data di creazione del brano"
            },
            genre: {
                title: "Genere:",
                description: "Il genere del brano"
            },
            comment: {
                title: "Commento:",
                description: "Il commento del brano"
            },
            duration: {
                title: "Durata:",
                description: "La durata del brano"
            },
            subject: {
                title: "Soggetto:",
                description: "Il soggetto del brano"
            },
            software: {
                title: "Software:",
                description: "Il software utilizzato per scrivere il brano"
            }
        }
    }
};