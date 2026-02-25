export const exportAudio = {
    button: {
        title: "保存音频",
        description: "将作品保存为各种格式"
    },

    formats: {
        title: "选择格式",
        formats: {
            wav: {
                button: {
                    title: "WAV 音频 (.wav)",
                    description:
                        "将修改后的歌曲导出为 .wav 音频文件"
                },
                options: {
                    title: "WAV 导出选项",
                    description:
                        "将当前 MIDI 文件导出为 WAV，应用通过合成器控制器所做的所有修改。",
                    confirm: "导出",
                    normalizeVolume: {
                        title: "标准化音量",
                        description:
                            "保持音量在同一水平，无论 MIDI 是响亮还是安静。推荐使用。"
                    },
                    additionalTime: {
                        title: "额外时间 (秒)",
                        description:
                            "在歌曲末尾添加额外时间，以允许声音渐弱。（秒）"
                    },
                    sampleRate: {
                        title: "采样率",
                        description:
                            "输出文件的采样率（Hz）。除非您知道自己在做什么，否则请保持默认值。"
                    },

                    separateChannels: {
                        title: "分离通道",
                        description:
                            "将每个通道保存为单独的文件。对示波器查看器等工具很有用。请注意，这会禁用混响和合唱效果。",
                        saving: {
                            title: "通道文件",
                            save: "保存通道 {0}",
                            saveAll: "保存全部"
                        }
                    },
                    loopCount: {
                        title: "循环次数",
                        description: "歌曲循环播放的次数"
                    }
                },
                exportMessage: {
                    message: "正在导出 WAV 音频...",
                    addingEffects: "正在添加效果...",
                    estimated: "剩余时间:",
                    convertWav: "正在转换为 wav..."
                }
            },

            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description:
                        "导出应用了控制器和乐器更改的 MIDI 文件"
                }
            },

            soundfont: {
                button: {
                    title: "SoundFont (.sf2, .sf3)",
                    description: "导出 SoundFont2 文件"
                },

                options: {
                    title: "SF 导出选项",
                    confirm: "导出",
                    trim: {
                        title: "裁剪",
                        description:
                            "导出裁剪后的音色库，仅使用 MIDI 文件使用的乐器和样本"
                    },
                    compress: {
                        title: "压缩",
                        description:
                            "如果未压缩，则使用有损 Ogg Vorbis 压缩对样本进行压缩。显著减小文件大小。" +
                            "如果音色库已经压缩，即使禁用此选项也不会解压缩"
                    },
                    quality: {
                        title: "压缩质量",
                        description:
                            "压缩质量。越高越好"
                    }
                },

                exportMessage: {
                    message: "正在导出 SoundFont..."
                }
            },

            dls: {
                button: {
                    title: "DLS (.dls)",
                    description: "将 SoundFont 导出为 DLS"
                },
                warning: {
                    title: "DLS 导出警告",
                    message:
                        "DLS 导出功能有限，对于大型复杂的 SoundFont 可能会产生损坏的文件。",
                    details: "更多信息",
                    confirm: "仍然导出"
                },

                exportMessage: {
                    message: "正在导出 DLS..."
                }
            },

            rmidi: {
                button: {
                    title: "嵌入 MIDI (.rmi)",
                    description:
                        "将修改后的 MIDI 与嵌入的裁剪音色库导出为单个文件。 " +
                        "请注意，此格式未被广泛支持"
                },

                progress: {
                    title: "正在导出嵌入 MIDI...",
                    loading: "正在加载音色库和 MIDI...",
                    modifyingMIDI: "正在修改 MIDI...",
                    modifyingSoundfont:
                        "正在裁剪音色库...（这可能需要一段时间！）",
                    saving: "正在保存 RMIDI...",
                    done: "完成！"
                },

                options: {
                    title: "RMIDI 导出选项",
                    description:
                        "将当前 SoundFont + MIDI 嵌入为 RMIDI，并应用通过合成器控制器所做的所有修改。",
                    confirm: "导出",
                    compress: {
                        title: "压缩",
                        description:
                            "使用有损 Ogg Vorbis 压缩压缩音色库。显著减小文件大小。推荐使用。"
                    },
                    quality: {
                        title: "压缩质量",
                        description:
                            "压缩质量。越高越好。"
                    },
                    bankOffset: {
                        title: "音色库偏移",
                        description:
                            "文件的音色库偏移。推荐值为 0。除非您知道自己在做什么，否则请勿更改。"
                    },
                    adjust: {
                        title: "调整 MIDI",
                        description:
                            "调整 MIDI 文件以适应 SoundFont。除非您知道自己在做什么，否则请保持开启。"
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "标题:",
                description: "歌曲的标题"
            },
            album: {
                title: "专辑:",
                description: "歌曲的专辑"
            },
            artist: {
                title: "艺术家:",
                description: "歌曲的艺术家"
            },
            albumCover: {
                title: "专辑封面:",
                description: "歌曲的专辑封面"
            },
            creationDate: {
                title: "创建日期:",
                description: "歌曲的创建日期"
            },
            genre: {
                title: "流派:",
                description: "歌曲的流派"
            },
            comment: {
                title: "评论:",
                description: "歌曲的评论"
            },
            duration: {
                title: "时长:",
                description: "歌曲的时长"
            },
            subject: {
                title: "主题:",
                description: "歌曲的主题"
            },
            software: {
                title: "软件:",
                description: "用于创作歌曲的软件"
            }
        }
    }
};
