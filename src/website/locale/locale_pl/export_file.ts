export const exportFile = {
    button: {
        title: "Export File",
        description: "Eksportuj utwór w różnych formatach"
    },

    formats: {
        title: "Wybierz format",
        formats: {
            wav: {
                button: {
                    title: "Audio (.wav, .ogg, .mp3)",
                    description:
                        "Eksportuj utwór ze zmianami jako plik audio .wav, .ogg lub .mp3"
                },
                options: {
                    title: "Opcje eksportu audio",
                    description:
                        "Eksportuj MIDI jako audio, uwzględniając wszystkie modyfikacje wykonane w kontrolerze.",
                    confirm: "Eksportuj",
                    format: {
                        title: "Format",
                        description:
                            "Format pliku audio. WAV jest bezstratny, Ogg Vorbis i MP3 są skompresowane i znacznie mniejsze. Pętle są zapisywane tylko w WAV i Ogg Vorbis."
                    },
                    bitrate: {
                        title: "Bitrate",
                        description:
                            "Przepływność kompresji. Wyższa jest lepsza, ale daje większe pliki."
                    },
                    normalizeVolume: {
                        title: "Normalizuj głośność",
                        description:
                            "Eksportuj audio z taką samą głośnością, niezależnie od głośności MIDI."
                    },
                    additionalTime: {
                        title: "Dodatkowy czas (s)",
                        description:
                            "Dodatkowy czas na końcu utworu aby pozwolić na wyciszenie się dźwięku. (sekundy)"
                    },
                    sampleRate: {
                        title: "Częstotliwość",
                        description:
                            "Częstotliwość próbkowania dźwięku. Pozostaw bez zmian, chyba że wiesz, co robisz."
                    },
                    separateChannels: {
                        title: "Rozdziel kanały",
                        description:
                            "Zapisz każdy kanał w osobnym pliuku. Przydatne dla rzeczy jak widok oscyloskopowy. Należy pamiętać że to wyłącza ekfet pogłosu i chóru",
                        saving: {
                            title: "Pliki audio kanałów",
                            save: "Zapisz kanał {0}",
                            saveAll: "Zapisz wszystkie",
                            saveFullMix: "Zapisz pełny miks"
                        }
                    },
                    loopCount: {
                        title: "Ilość pętli",
                        description: "Ilość razy zapętlenia utworu"
                    }
                },
                exportMessage: {
                    message: "Eksportowanie audio...",
                    addingEffects: "Dodawanie efektów...",
                    estimated: "Pozostało:",
                    convertWav: "Kodowanie audio..."
                }
            },

            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description:
                        "Eksportuj plik MIDI wraz ze zmianami instrumentów i kontrolerów"
                }
            },

            video: {
                button: {
                    title: "Wideo (.webm, .mp4)",
                    description:
                        "Eksportuj plik wideo z wizualizacją nut, fal oraz klawiatury"
                },
                options: {
                    title: "Opcje eksportu wideo",
                    description:
                        "Eksportuj aktualny plik MIDI jako wideo, używając aktualnych ustawień.",
                    confirm: "Eksportuj",
                    format: {
                        title: "Format",
                        description:
                            "Format kontenera wideo. MP4 jest bardziej kompatybilne ale mniej wydajne."
                    },
                    resolution: {
                        title: "Rozdzielczość",
                        description:
                            "Rozdzielczość wideo. Auto używa aktualnego rozmiaru."
                    },
                    frameRate: {
                        title: "FPS",
                        description:
                            "Liczba klatek na sekundę, od 15 do 240. Jeśli nie wiesz co to znaczy, pozostaw na 60."
                    }
                },
                exportMessage: {
                    message: "Eksportowanie wideo...",
                    renderingAudio: "Renderowanie audio...",
                    renderingVideo: "Renderowanie video...",
                    invalidResolution: "Niepoprawna rozdzielczość.",
                    webCodecsMissing:
                        "Ta przeglądarka nie może eksportować filmów. Użyj najnowszej wersji Chrome lub Firefox.",
                    failed: "Eksport wideo nieudany! (sprawdź konsolę)."
                }
            },

            soundfont: {
                button: {
                    title: "SoundFont (.sf2, .sf3)",
                    description: "Eksportuj SoundFont"
                },
                exportMessage: {
                    message: "Eksportowanie SoundFonta..."
                },

                options: {
                    title: "Opcje eksportu SoundFont",
                    confirm: "Eksportuj",
                    trim: {
                        title: "Zmniejsz",
                        description:
                            "Zmniejsz SoundFont aby zawierał tylko klawisze użyte w MIDI"
                    },
                    compress: {
                        title: "Kompresuj",
                        description:
                            "Skompresuj próbki które nie są skompresowane przy użyciu stratnego kodeka Ogg Vorbis. Znacznie zmniejsza rozmiar pliku." +
                            "Jeśli SoundFont był już skompresowany, nie zostanie zdekompresowany nawet gdy ta opcja jest wyłączona"
                    },
                    quality: {
                        title: "Jakość kompresji",
                        description:
                            "Jakość skompresowanych próbek. Im wyższa tym lepsza"
                    }
                }
            },

            dls: {
                button: {
                    title: "DLS (.dls)",
                    description: "Eksportuj SoundFont jako DLS"
                },
                warning: {
                    title: "Ostrzeżenie DLS",
                    message:
                        "Eksport do formatu DLS jest ograniczony i może utworzyć uszkodzone pliki.",
                    details: "Więcej informacji",
                    confirm: "Eksportuj i tak"
                },
                exportMessage: {
                    message: "Eksportowanie DLS..."
                }
            },

            rmidi: {
                button: {
                    title: "Osadzone MIDI (.rmi)",
                    description:
                        "Eksportuj zmodyfikowane MIDI wraz ze zmniejszonym SoundFont jako jeden plik. " +
                        "Uwaga: ten format nie jest szeroko wspierany"
                },

                progress: {
                    title: "Eksportowanie osadzonego MIDI...",
                    loading: "Wczytywanie SoundFont i MIDI...",
                    modifyingMIDI: "Modyfikowanie MIDI...",
                    modifyingSoundfont:
                        "Zmniejszanie SoundFont... (trochę to zajmie!)",
                    saving: "Zapisywanie RMIDI...",
                    done: "Gotowe!"
                },

                options: {
                    title: "Opcje eksportu RMIDI",
                    description:
                        "Osadź SoundFonta + MIDI jako RMIDI i dodaj wszystkie modyfikacje wykonane z kontrolera.",
                    confirm: "Eksportuj",
                    compress: {
                        title: "Kompresuj",
                        description:
                            "Skompresuj osadzonego SoundFont za pomocą stratnego kodeka Ogg Vorbis. Znacznie zmniejsza rozmiar pliku. Zalecane."
                    },
                    quality: {
                        title: "Jakość kompresji",
                        description:
                            "Jakość skompresowanych próbek. Im wyższa tym lepsza"
                    },
                    bankOffset: {
                        title: "Przesunięcie banku",
                        description:
                            "Przesunięcie banku w pliku. Zalecane 0. Zmień tylko jeśli wiesz co robisz."
                    },
                    adjust: {
                        title: "Dostosuj MIDI",
                        description:
                            "Dostosuj MIDI do SoundFonta. Pozostaw włączone, chyba że wiesz co robisz."
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "Tytuł",
                description: "Tytuł utworu"
            },
            album: {
                title: "Album",
                description: "Album utworu"
            },
            artist: {
                title: "Twórca",
                description: "Twórca utworu"
            },
            albumCover: {
                title: "Okładka albumu",
                description: "Okładka albumu utworu"
            },
            creationDate: {
                title: "Stworzono",
                description: "Data stworzenia utworu"
            },
            genre: {
                title: "Gatunek",
                description: "Gatunek utworu"
            },
            comment: {
                title: "Komentarz",
                description: "Komentarz do utworu"
            },
            duration: {
                title: "Czas trwania",
                description: "Czas trwania utworu"
            },
            subject: {
                title: "Temat",
                description: "Temat utworu"
            },
            software: {
                title: "Oprogramowanie",
                description: "Oprogramowanie, które służyło do nagrania utworu"
            }
        }
    }
};
