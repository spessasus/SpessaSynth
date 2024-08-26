export const exportAudio = {
    button: {
        title: "Zapisz",
        description: "Zapisz w różnych formatach"
    },

    formats: {
        title: "Wybierz format",
        formats: {
            wav: {
                button: {
                    title: "Audio WAV (.wav)",
                    description: "Eksportuj utwór ze zmianami jako plik audio .wav"
                },
                options: {
                    title: "Opcje eksportu audio",
                    confirm: "Eksportuj",
                    normalizeVolume: {
                        title: "Normalizuj głośność",
                        description: "Eksportuj audio z taką samą głośnością, niezależnie od głośności MIDI.",
                    },
                    additionalTime: {
                        title: "Dodatkowy czas (s)",
                        description: "Dodatkowy czas na końcu utworu aby pozwolić na wyciszenie się dźwięku. (sekundy)",
                    },
                    separateChannels: {
                        title: "Rozdziel kanały",
                        description: "Zapisz każdy kanał w osobnym pliuku. Przydatne dla rzeczy jak widok oscyloskopowy. Należy pamiętać że to wyłącza ekfet pogłosu i chóru",
                        saving: {
                            title: "Pliki audio kanałów",
                            save: "Zapisz kanał {0}"
                        }
                    }
                },
                exportMessage: {
                    message: "Eksportowanie audio...",
                    estimated: "Pozostało:",
                    convertWav: "Konwertowanie do wav..."
                }
            },

            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description: "Eksportuj plik MIDI wraz ze zmianami instrumentów i kontrolerów"
                }
            },

            soundfont: {
                button: {
                    title: "SoundFont (.sf2)",
                    description: "Eksportuj SoundFont"
                },

                options: {
                    title: "Opcje eksportu soundfonta",
                    confirm: "Eksportuj",
                    trim: {
                        title: "Zmniejsz",
                        description: "Zmniejsz SoundFont aby zawierał tylko klawisze użyte w MIDI"
                    },
                    compress: {
                        title: "Kompresuj",
                        description: "Zkompresuj próbki które nie są zkompresowane przy użyciu stratnego kodeka Ogg Vorbis. Znacznie zmniejsza rozmiar pliku." +
                            "Jeśli soundfont był już skompresowany, nie zostanie zdekompresowany nawet gdy ta opcja jest wyłączona"
                    },
                    quality: {
                        title: "Jakość kompresji",
                        description: "Jakość skompresowanych próbek. Im wyższa tym lepsza"
                    }
                }
            },

            rmidi: {
                button: {
                    title: "Osadzone MIDI (.rmi)",
                    description: "Eksportuj zmodyfikowane MIDI wraz ze zmniejszonym soundfontem jako jeden plik. " +
                        "Uwaga: ten format nie jest szeroko wspierany"
                },

                progress: {
                    title: "Exportowanie osadzonego MIDI...",
                    loading: "Wczytywanie soundfonta i MIDI...",
                    modifyingMIDI: "Modyfikowanie MIDI...",
                    modifyingSoundfont: "Zmniejszanie Soundfonta...",
                    saving: "Zapisywanie RMIDI...",
                    done: "Gotowe!"
                },

                options: {
                    title: "Opcje eksportu RMIDI",
                    confirm: "Eksportuj",
                    compress: {
                        title: "Kompresuj",
                        description: "Skompresuj osadzonego soundfonta za pomocą stratnego kodeka Ogg Vorbis. Znacznie zmniejsza rozmiar pliku. Zalecane."
                    },
                    quality: {
                        title: "Jakość kompresji",
                        description: "Jakość skompresowanych próbek. Im wyższa tym lepsza"
                    },
                    bankOffset: {
                        title: "Przesunięcie banku",
                        description: "Przesunięcie banku w pliku. Zalecane 0. Zmień tylko jeśli wiesz co robisz.",
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
                title: "Tytuł:",
                description: "Tytuł utworu",
            },
            album: {
                title: "Album:",
                description: "Album utworu"
            },
            artist: {
                title: "Twórca:",
                description: "Twórca utworu"
            },
            albumCover: {
                title: "Okładka albumu:",
                description: "Okładka albumu utworu",
            },
            creationDate: {
                title: "Stworzono:",
                description: "Data stworzenia utworu"
            },
            genre: {
                title: "Gatunek:",
                description: "Gatunek utworu"
            },
            comment: {
                title: "Komentarz:",
                description: "Komentarz do utworu"
            },
            duration: {
                title: "Czas trwania:",
                description: "Czas trwania utworu"
            }
        }
    }
}