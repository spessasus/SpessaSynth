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
                    description: "Eksportuj MIDI jako WAV, uwzględniając wszystkie modyfikacje wykonane w kontrolerze.",
                    confirm: "Eksportuj",
                    normalizeVolume: {
                        title: "Normalizuj głośność",
                        description: "Eksportuj audio z taką samą głośnością, niezależnie od głośności MIDI."
                    },
                    additionalTime: {
                        title: "Dodatkowy czas (s)",
                        description: "Dodatkowy czas na końcu utworu aby pozwolić na wyciszenie się dźwięku. (sekundy)"
                    },
                    sampleRate: {
                        title: "Częstotliwość",
                        description: "Częstotliwość próbkowania dźwięku. Pozostaw bez zmian, chyba że wiesz, co robisz."
                    },
                    separateChannels: {
                        title: "Rozdziel kanały",
                        description: "Zapisz każdy kanał w osobnym pliuku. Przydatne dla rzeczy jak widok oscyloskopowy. Należy pamiętać że to wyłącza ekfet pogłosu i chóru",
                        saving: {
                            title: "Pliki audio kanałów",
                            save: "Zapisz kanał {0}"
                        }
                    },
                    loopCount: {
                        title: "Ilość pętli",
                        description: "Ilość razy zapętlenia utworu"
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
            
            dls: {
                button: {
                    title: "DLS (.dls)",
                    description: "Eksportuj SoundFonta jako DLS"
                },
                warning: {
                    title: "Ostrzeżenie DLS",
                    message: "Eksport do formatu DLS jest ograniczony i może utworzyć uszkodzone pliki.",
                    details: "Więcej informacji",
                    confirm: "Eksportuj i tak"
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
                    modifyingSoundfont: "Zmniejszanie Soundfonta... (trochę to zajmie!)",
                    saving: "Zapisywanie RMIDI...",
                    done: "Gotowe!"
                },
                
                options: {
                    title: "Opcje eksportu RMIDI",
                    description: "Osadź SoundFonta + MIDI jako RMIDI i dodaj wszystkie modyfikacje wykonane z kontrolera.",
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
                        description: "Przesunięcie banku w pliku. Zalecane 0. Zmień tylko jeśli wiesz co robisz."
                    },
                    adjust: {
                        title: "Dostosuj MIDI",
                        description: "Dostosuj MIDI do SoundFonta. Pozostaw włączone, chyba że wiesz co robisz."
                    }
                    
                }
            }
        },
        metadata: {
            songTitle: {
                title: "Tytuł:",
                description: "Tytuł utworu"
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
                description: "Okładka albumu utworu"
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
};