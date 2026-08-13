export const exportAudio = {
    button: {
        title: "Сохранить аудио",
        description: "Сохраните композицию в различных форматах"
    },

    formats: {
        title: "Выберите формат",
        formats: {
            wav: {
                button: {
                    title: "Аудиофайл WAV (.wav)",
                    description:
                        "Экспортируйте песню с внесенными изменениями в виде аудиофайла формата .wav"
                },
                options: {
                    title: "Варианты экспорта WAV",
                    description:
                        "Экспортируйте текущий MIDI-файл в формат WAV, применив все изменения, внесенные с помощью контроллера синтезатора.",
                    confirm: "Экспорт",
                    normalizeVolume: {
                        title: "Нормализация громкости",
                        description:
                            "Сохраняйте уровень громкости неизменным, независимо от того, насколько громко или тихо поступает MIDI-сигнал. Рекомендуется."
                    },
                    additionalTime: {
                        title: "Дополнительное время (с)",
                        description:
                            "Дополнительное время в конце песни, чтобы звук постепенно затих. (секунды)"
                    },
                    sampleRate: {
                        title: "Частота дискретизации",
                        description:
                            "Частота дискретизации выходного файла указана в Гц. Оставьте как есть, если вы не знаете, что делаете."
                    },

                    separateChannels: {
                        title: "Отдельные каналы",
                        description:
                            "Сохраняйте каждый канал как отдельный файл. Это полезно, например, для просмотра осциллографов. Обратите внимание, что при этом отключаются реверберация и хорус.",
                        saving: {
                            title: "Файлы канала",
                            save: "Сохранить канал {0}",
                            saveAll: "Сохранить всё"
                        }
                    },
                    loopCount: {
                        title: "Количество циклов",
                        description: "Количество повторений песни"
                    }
                },
                exportMessage: {
                    message: "Экспорт аудиофайлов в формате WAV...",
                    addingEffects: "Добавление эффектов...",
                    estimated: "Осталось:",
                    convertWav: "Преобразование в формат wav..."
                }
            },

            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description:
                        "Экспортируйте MIDI-файл с внесенными изменениями в контроллер и инструмент."
                }
            },

            soundfont: {
                button: {
                    title: "SoundFont (.sf2, .sf3)",
                    description: "Экспорт файла SoundFont2"
                },

                options: {
                    title: "Варианты экспорта SF",
                    confirm: "Экспорт",
                    trim: {
                        title: "Обрезать",
                        description:
                            "Экспортируйте SoundFont, обрезав его таким образом, чтобы использовались только инструменты и сэмплы, которые присутствуют в MIDI-файле."
                    },
                    compress: {
                        title: "Сжать",
                        description:
                            "Если сэмплы не сжаты, используйте сжатие Ogg Vorbis с потерями. Это значительно уменьшит размер файла." +
                            "Если SoundFont уже сжат, он не будет распакован, даже если эта опция отключена."
                    },
                    quality: {
                        title: "Качество сжатия",
                        description: "Качество сжатия. Чем выше, тем лучше."
                    }
                },

                exportMessage: {
                    message: "Экспорт SoundFont..."
                }
            },

            dls: {
                button: {
                    title: "DLS (.dls)",
                    description: "Экспортируйте SoundFont в формате DLS."
                },
                warning: {
                    title: "Предупреждение об экспорте DLS",
                    message:
                        "Экспорт DLS имеет ограничения и может привести к повреждению файлов при использовании больших и сложных SoundFont.",
                    details: "Дополнительная информация",
                    confirm: "Экспорт в любом случае"
                },

                exportMessage: {
                    message: "Экспорт DLS..."
                }
            },

            rmidi: {
                button: {
                    title: "Встроенный MIDI (.rmi)",
                    description:
                        "Экспортировать изменённый MIDI со встроенным обрезанным SoundFont в виде одного файла. " +
                        "Обратите внимание, что этот формат не получил широкого распространения."
                },

                progress: {
                    title: "Экспорт встроенного MIDI...",
                    loading: "Загрузка SoundFont и MIDI...",
                    modifyingMIDI: "Модификация MIDI...",
                    modifyingSoundfont:
                        "Обрезка SoundFont... (это может занять некоторое время!)",
                    saving: "Сохранение RMIDI...",
                    done: "Готово!"
                },

                options: {
                    title: "Параметры экспорта RMIDI",
                    description:
                        "Встройте текущий SoundFont + MIDI как RMIDI и примените все изменения, внесенные через контроллер синтезатора.",
                    confirm: "Экспорт",
                    compress: {
                        title: "Сжать",
                        description:
                            "Сжать SoundFont с потерями с помощью Ogg Vorbis. Значительно уменьшает размер файла. Рекомендуется."
                    },
                    quality: {
                        title: "Качество сжатия",
                        description: "Качество сжатия. Чем выше, тем лучше."
                    },
                    bankOffset: {
                        title: "Смещение банка",
                        description:
                            "Смещение банка файла. Рекомендуемое значение — 0. Изменяйте его только в том случае, если вы знаете, что делаете."
                    },
                    adjust: {
                        title: "Настройка MIDI",
                        description:
                            "Подстраивает MIDI-файл под SoundFont. Оставьте эту опцию включенной, если не уверены в своих действиях."
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "Заголовок:",
                description: "Название песни"
            },
            album: {
                title: "Альбом:",
                description: "Альбом песни"
            },
            artist: {
                title: "Исполнитель:",
                description: "Исполнитель песни"
            },
            albumCover: {
                title: "Обложка альбома:",
                description: "Обложка альбома этой песни"
            },
            creationDate: {
                title: "Создано:",
                description: "Дата создания песни"
            },
            genre: {
                title: "Жанр:",
                description: "Жанр песни"
            },
            comment: {
                title: "Комментарий:",
                description: "Комментарий к песне"
            },
            duration: {
                title: "Продолжительность:",
                description: "Продолжительность песни"
            },
            subject: {
                title: "Тема:",
                description: "Тема песни"
            },
            software: {
                title: "Программное обеспечение:",
                description:
                    "Программное обеспечение, использованное для написания песни."
            }
        }
    }
};
