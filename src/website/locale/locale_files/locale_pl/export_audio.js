export const exportAudio = {
    button: {
        title: "Zapisz utwór",
        description: "Zapisz utwór jako plik WAV, MIDI, SF2 lub RMI"
    },

    formats: {
        title: "Wybierz format",
        formats: {
            wav: {
                button: {
                    title: "Audio WAV",
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
                    }
                },
                exportMessage: {
                    message: "Eksportowanie audio...",
                    estimated: "Pozostało:"
                }
            },

            midi: {
                button: {
                    title: "Zmodyfikowane MIDI",
                    description: "Eksportuj plik MIDI wraz ze zmianami instrumentów i kontrolerów"
                }
            },

            soundfont: {
                button: {
                    title: "Zmniejszony soundfont",
                    description: "Eksportuj soundfont zawierający tylko klawisze użyte w MIDI"
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
                }
            }
        }
    }
}