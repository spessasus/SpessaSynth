// SpessaSynth Português do Brasil
// por Lucas Gabriel (lucmsilva)
// https://github.com/lucmsilva651

export const exportAudio = {
    button: {
        title: "Salvar Áudio",
        description: "Salvar a composição em vários formatos"
    },
    
    formats: {
        title: "Escolher formato",
        formats: {
            wav: {
                button: {
                    title: "Áudio WAV (.wav)",
                    description: "Exportar a música com modificações como um arquivo de áudio .wav"
                },
                options: {
                    title: "Opções de exportação WAV",
                    confirm: "Exportar",
                    normalizeVolume: {
                        title: "Normalizar volume",
                        description: "Mantém o volume no mesmo nível, independentemente de quão alto ou baixo está o MIDI. Recomendado."
                    },
                    additionalTime: {
                        title: "Tempo adicional (s)",
                        description: "Tempo extra no final da música para o som se dissipar. (em segundos)"
                    },
                    
                    separateChannels: {
                        title: "Separar canais",
                        description: "Salva cada canal como um arquivo separado. Útil para visualizadores de osciloscópio. Note que isto desativa reverb e chorus.",
                        saving: {
                            title: "Arquivos de canal",
                            save: "Salvar canal {0}"
                        }
                    },
                    loopCount: {
                        title: "Quantidade de repetições",
                        description: "Número de vezes que a música será repetida"
                    }
                },
                exportMessage: {
                    message: "Exportando áudio WAV...",
                    estimated: "Restante:",
                    convertWav: "Convertendo para wav..."
                }
            },
            
            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description: "Exportar o arquivo MIDI com as alterações de controlador e instrumento aplicadas"
                }
            },
            
            soundfont: {
                button: {
                    title: "SoundFont (.sf2, .sf3)",
                    description: "Exportar um arquivo SoundFont2"
                },
                
                options: {
                    title: "Opções de exportação SF",
                    confirm: "Exportar",
                    trim: {
                        title: "Cortar",
                        description: "Exportar o SoundFont apenas com os instrumentos e amostras utilizados pelo arquivo MIDI"
                    },
                    compress: {
                        title: "Comprimir",
                        description: "Comprimir as amostras com compressão Ogg Vorbis com perdas, se não comprimidas. Reduz bastante o tamanho do arquivo. " +
                            "Se o SoundFont já estava comprimido, não será descomprimido, mesmo se esta opção estiver desativada."
                    },
                    quality: {
                        title: "Qualidade da compressão",
                        description: "A qualidade da compressão. Quanto maior, melhor"
                    }
                }
            },
            
            rmidi: {
                button: {
                    title: "MIDI Embutido (.rmi)",
                    description: "Exportar o MIDI modificado com o SoundFont recortado embutido como um único arquivo. " +
                        "Observe que este formato não é amplamente suportado."
                },
                
                progress: {
                    title: "Exportando MIDI embutido...",
                    loading: "Carregando SoundFont e MIDI...",
                    modifyingMIDI: "Modificando MIDI...",
                    modifyingSoundfont: "Cortando SoundFont...",
                    saving: "Salvando RMIDI...",
                    done: "Pronto!"
                },
                
                options: {
                    title: "Opções de exportação RMIDI",
                    confirm: "Exportar",
                    compress: {
                        title: "Comprimir",
                        description: "Comprimir o SoundFont com Ogg Vorbis com perdas. Reduz bastante o tamanho do arquivo. Recomendado."
                    },
                    quality: {
                        title: "Qualidade da compressão",
                        description: "A qualidade da compressão. Quanto maior, melhor."
                    },
                    bankOffset: {
                        title: "Deslocamento do banco",
                        description: "O deslocamento do banco do arquivo. Valor 0 é recomendado. Alterar somente se souber o que está fazendo."
                    },
                    adjust: {
                        title: "Ajustar MIDI",
                        description: "Ajusta o arquivo MIDI ao SoundFont. Mantenha ativado, a menos que tenha certeza do que está fazendo."
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "Título:",
                description: "Título da música"
            },
            album: {
                title: "Álbum:",
                description: "Álbum da música"
            },
            artist: {
                title: "Artista:",
                description: "Artista da música"
            },
            albumCover: {
                title: "Capa do álbum:",
                description: "Capa do álbum da música"
            },
            creationDate: {
                title: "Criado em:",
                description: "Data de criação da música"
            },
            genre: {
                title: "Gênero:",
                description: "Gênero da música"
            },
            comment: {
                title: "Comentário:",
                description: "Comentário da música"
            },
            duration: {
                title: "Duração:",
                description: "Duração da música"
            }
        }
    }
};