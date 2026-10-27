export const exportFile = {
    button: {
        title: "Exporter un Fichier",
        description: "Exporter la composition dans différents formats"
    },

    formats: {
        title: "Choix du format",
        formats: {
            wav: {
                button: {
                    title: "Audio WAV (.wav)",
                    description:
                        "Exporter le morceau avec les modifications dans un fichier audio .wav"
                },
                options: {
                    title: "Options de l'exportation WAV",
                    description:
                        "Exporter le MIDI actuel en WAV en appliquant toutes les modifications faites avec les contrôleurs du synthétiseur.",
                    confirm: "Exporter",
                    normalizeVolume: {
                        title: "Normaliser le volume",
                        description:
                            "Pour garder le volume à un niveau constant, peu importe comment est joué le morceau MIDI (option recommandée)"
                    },
                    additionalTime: {
                        title: "Durée additionnelle (s)",
                        description:
                            "Durée additionnelle à la fin du morceau pour donner le temps au son de disparaitre, en secondes"
                    },
                    sampleRate: {
                        title: "Fréquence d'échantillonnage",
                        description:
                            "Fréquence d'échantillonnage du fichier de sortie en Hz (ne changez ce paramètre que si vous savez ce que vous faites)"
                    },

                    separateChannels: {
                        title: "Séparation des canaux",
                        description:
                            "Pour sauvegarder chaque canal dans un fichier séparé, utile par exemple pour des affichage de type oscilloscope (cette option désactive la réverbération et l'effet de chorus)",
                        saving: {
                            title: "Fichiers des canaux",
                            save: "Sauvegarder le canal {0}",
                            saveAll: "Tout enregistrer"
                        }
                    },
                    loopCount: {
                        title: "Nombre de répétitions",
                        description:
                            "Nombre de fois que le morceau est répété après la première lecture"
                    }
                },
                exportMessage: {
                    message: "Exportation de l'audio en cours...",
                    addingEffects: "Ajout des effets...",
                    estimated: "Temps restant :",
                    convertWav: "Conversion dans le format WAV..."
                }
            },

            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description:
                        "Exporter le fichier MIDI en incluant les modifications des contrôleurs et des instruments"
                }
            },

            video: {
                button: {
                    title: "Vidéo (.webm, .mp4)",
                    description:
                        "Exporter une vidéo du morceau avec le rendu live et le clavier"
                },
                options: {
                    title: "Options d'export vidéo",
                    description:
                        "Exporter une vidéo d'un rendu du fichier MIDI comme il est actuellement affiché sur la page.",
                    confirm: "Exporter",
                    format: {
                        title: "Format",
                        description:
                            "Le format de la vidéo. MP4 est le plus répendu, mais aussi moins efficace."
                    },
                    resolution: {
                        title: "Résolution",
                        description:
                            "La résolution de la vidéo. Sa valeur par défaut est la taille du canvas."
                    },
                    frameRate: {
                        title: "Fréquence d'images",
                        description:
                            "Images par seconde, 15 à 240. Si vous ne savez pas ce que ça veut dire, choisissez 60."
                    }
                },
                exportMessage: {
                    message: "Exportation de la vidéo...",
                    renderingAudio: "Rendu de l'audio en cours...",
                    renderingVideo: "Rendu de la vidéo en cours...",
                    invalidResolution: "Résolution invalide.",
                    webCodecsMissing:
                        "Ce navigateur ne peut pas exporter de vidéo. Utilisez la dernière version de Chrome ou de Firefox.",
                    failed: "L'export vidéo à échoué! (consultez la console pour avoir plus de détails)."
                }
            },

            soundfont: {
                button: {
                    title: "SoundFont (.sf2, .sf3)",
                    description:
                        "Exporter une banque de sons au format SoundFont2"
                },

                options: {
                    title: "Options de l'exportation SoundFont2",
                    confirm: "Exporter",
                    trim: {
                        title: "Alléger",
                        description:
                            "Exporter la banque de sons avec seulement les instruments et échantillons utilisés par le fichier MIDI"
                    },
                    compress: {
                        title: "Compresser",
                        description:
                            "Compacter les échantillons grâce à l'algorithme de compression avec pertes Ogg Vorbis\n" +
                            "Ceci réduit de manière significative le poids du fichier\nNote : si la banque de sons était déjà compressée, cette option ne décompressera pas même en étant désactivée"
                    },
                    quality: {
                        title: "Qualité de compression",
                        description:
                            "La qualité de la compression, une valeur haute augmentant la qualité du son mais aussi le poids du fichier"
                    }
                },

                exportMessage: {
                    message: "Exportation de la banque de sons..."
                }
            },

            dls: {
                button: {
                    title: "DLS (.dls)",
                    description: "Exporte la soundfont au format DLS"
                },
                warning: {
                    title: "Avertissement concernant l'exportation DLS",
                    message:
                        "L'exportation DLS est limitée et peut produire des fichiers corrompus avec des soundfonts lourdes et complexes.",
                    details: "Plus d'info",
                    confirm: "Continuer l'exportation"
                },

                exportMessage: {
                    message: "Exportation de la banque de sons au format DLS..."
                }
            },

            rmidi: {
                button: {
                    title: "MIDI embarqué (.rmi)",
                    description:
                        "Exporter le fichier MIDI modifié avec la banque de sons allégée dans un seul fichier\n" +
                        "Note : ce format n'est pas supporté par tous les lecteurs MIDI"
                },

                progress: {
                    title: "Exportation du fichier MIDI embarqué...",
                    loading:
                        "Chargement de la banque de sons et du fichier MIDI...",
                    modifyingMIDI: "Modification MIDI...",
                    modifyingSoundfont: "Allègement de la banque de sons...",
                    saving: "Création du fichier RMIDI...",
                    done: "Terminé !"
                },

                options: {
                    title: "Options de l'exportation RMIDI",
                    description:
                        "Intégrer la banque de sons et le MIDI dans un fichier RMIDI et y appliquer toutes les modifications faites avec les contrôleurs du synthétiseur.",
                    confirm: "Exporter",
                    compress: {
                        title: "Compression",
                        description:
                            "Compacter les échantillons grâce à l'algorithme de compression avec pertes Ogg Vorbis\nCeci réduit de manière significative le poids du fichier (option recommandée)"
                    },
                    quality: {
                        title: "Qualité de compression",
                        description:
                            "La qualité de la compression, une valeur haute augmentant la qualité du son mais aussi le poids du fichier"
                    },
                    bankOffset: {
                        title: "Décalage de banque",
                        description:
                            "Décalage des numéros de banque dans le fichier\n(une valeur de 0 est recommandée sauf cas particulier)"
                    },
                    adjust: {
                        title: "Ajustement MIDI",
                        description:
                            "Ajuste le fichier MIDI à la banque de sons\n(il est conseillé de laisser cette option activée sauf cas particulier)"
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "Titre",
                description: "Le titre du morceau"
            },
            album: {
                title: "Album",
                description:
                    "Le nom de l'album dans lequel se trouve le morceau"
            },
            artist: {
                title: "Artiste",
                description: "Le ou les artiste(s) du morceau"
            },
            albumCover: {
                title: "Pochette d'album",
                description:
                    "La pochette de l'album dans lequel se trouve le morceau"
            },
            creationDate: {
                title: "Date de création",
                description: "La date de création du morceau"
            },
            genre: {
                title: "Genre",
                description: "Le genre du morceau"
            },
            comment: {
                title: "Commentaire",
                description: "Le commentaire lié au morceau"
            },
            duration: {
                title: "Durée",
                description: "La durée du morceau"
            },
            subject: {
                title: "Sujet",
                description: "Le sujet du morceau"
            },
            software: {
                title: "Logiciel",
                description: "Le logiciel utilisé pour créer le morceau"
            }
        }
    }
};
