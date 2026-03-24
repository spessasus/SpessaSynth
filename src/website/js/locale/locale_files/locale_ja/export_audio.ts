export const exportAudio = {
    button: {
        title: "音声を保存",
        description: "コンポジションをさまざまな形式で保存"
    },

    formats: {
        title: "形式を選択",
        formats: {
            wav: {
                button: {
                    title: "WAV音声 (.wav)",
                    description:
                        "現在のMIDIファイルをすべての変更を適用してWAV形式でエクスポート"
                },
                options: {
                    title: "WAVファイルのエクスポートオプション",
                    description:
                        //"Export the current MIDI file as WAV applying all the modifications made via the synthesizer controller.",
                        "現在のMIDIファイルをすべての変更を適用してWAV形式でエクスポート",
                    confirm: "エクスポート",
                    normalizeVolume: {
                        title: "音量をノーマライズ",
                        description:
                            //"Keep the volume at the same level, no matter how loud or quiet the MIDI is. Recommended."
                            "MIDIの音量がどれほど大きくても小さくても、常に同じレベルの音量を保ちます。推奨。"
                    },
                    additionalTime: {
                        title: //"Additional time (s)",
                            "追加時間 (秒)",
                        description:
                            //"Additional time at the end of the song to allow for the sound to fade. (seconds)"
                            "曲の終わりに追加の時間を設定して、音がフェードアウトするのを可能にします。(秒)"
                    },
                    sampleRate: {
                        title: //"Sample rate",
                            "サンプルレート",
                        description:
                            //"Output file sample rate in Hz. Leave as is unless you know what you're doing."
                            "出力ファイルのサンプルレートをHzで指定します。よくわからない場合はそのままにしてください。"
                    },

                    separateChannels: {
                        title: //"Separate channels",
                            "チャンネルを分離",
                        description:
                            //"Save each channel as a separate file. Useful for things like oscilloscope viewers. Note that this disables reverb and chorus.",
                            "各チャンネルを別のファイルとして保存します。オシロスコープのようなツールで便利です。このオプションを有効にするとリバーブとコーラスが無効になります。",
                        saving: {
                            title: "チャンネルを分割して保存",
                            save: "チャンネル{0}を保存",
                            saveAll: "すべてのチャンネルを保存"
                        }
                    },
                    loopCount: {
                        title: "ループ回数",
                        description: //"The amount of times to loop the song"
                            "曲をループする回数"
                    }
                },
                exportMessage: {
                    message: //"Exporting WAV audio...",
                        "WAVオーディオをエクスポート中...",
                    addingEffects: "エフェクトを適用中...",
                    estimated: "残り時間:",
                    convertWav: "WAVファイルに変換中..."
                }
            },

            midi: {
                button: {
                    title: "MIDIファイル (.mid)",
                    description:
                        //"Export the MIDI file with the controller and instrument changes applied"
                        "コントローラーと楽器の変更が適用されたMIDIファイルをエクスポート"
                }
            },

            soundfont: {
                button: {
                    title: "SoundFont (.sf2, .sf3)",
                    description: "SoundFont2形式でSoundFontをエクスポート"
                },

                options: {
                    title: "SoundFontエクスポートオプション",
                    confirm: "エクスポート",
                    trim: {
                        title: "トリム",
                        description:
                            "MIDIファイルで使用される楽器とサンプルのみを使用するようにSoundFontをトリムしてエクスポート"
                    },
                    compress: {
                        title: "圧縮",
                        description:
                            //"Compress samples with lossy Ogg Vorbis compression if uncompressed. Significantly reduces the file size." +
                            //"If the soundfont was already compressed, it won't be uncompressed even if this option is disabled"
                            "非圧縮のサンプルをロッシーなOgg Vorbis圧縮で圧縮してエクスポートします。ファイルサイズが大幅に減少します。" +
                            "SoundFontがすでに圧縮されている場合、このオプションが無効になっていても非圧縮にはなりません。"
                    },
                    quality: {
                        title: "圧縮品質",
                        description:
                            "圧縮の品質。高いほど良いです。"
                    }
                },

                exportMessage: {
                    message: "SoundFontをエクスポート中..."
                }
            },

            dls: {
                button: {
                    title: "DLSファイル (.dls)",
                    description: "SoundFontをDLS形式でエクスポート"
                },
                warning: {
                    title: "DLSエクスポートの警告",
                    message:
                        "DLSエクスポートは制限があり、大きな複雑なSoundFontでは破損したファイルが生成される可能性があります。",
                    details: "詳細情報",
                    confirm: "とにかくエクスポートする"
                },

                exportMessage: {
                    message: "DLSをエクスポート中..."
                }
            },

            rmidi: {
                button: {
                    title: "埋め込みMIDIファイル (.rmi)",
                    description:
                        //"Export the modified MIDI with the embedded trimmed soundfont as a single file. " +
                        //"Note that this format isn't widely supported"
                        "変更されたMIDIを、埋め込まれたトリムされたSoundFontとともに単一のファイルとしてエクスポートします。" +
                        "この形式は広くサポートされていないことに注意してください。"
                },

                progress: {
                    title: "埋め込みMIDIをエクスポート中...",
                    loading: "SoundFontとMIDIを読み込み中...",
                    modifyingMIDI: "MIDIを変更中...",
                    modifyingSoundfont:
                        //"Trimming Soundfont... (this may take a while!)",
                        "SoundFontをトリム中... (これには少し時間がかかる場合があります！)",
                    saving: "RMIDIを保存中...",
                    done: "完了!"
                },

                options: {
                    title: "RMIDIエクスポートオプション",
                    description:
                        //"Embed the current SoundFont + MIDI as RMIDI and apply all the modifications made via the synthesizer controller.",
                        "現在のSoundFont + MIDIをRMIDIとして埋め込み、シンセサイザコントローラーを介して行われたすべての変更を適用します。",
                    confirm: "エクスポート",
                    compress: {
                        title: "圧縮",
                        description:
                            //"Compress the Soundfont with lossy Ogg Vorbis compression. Significantly reduces the file size. Recommended."
                            "SoundFontをロッシーなOgg Vorbis圧縮で圧縮してエクスポートします。ファイルサイズが大幅に減少します。"
                    },
                    quality: {
                        title: "圧縮品質",
                        description:
                            "圧縮の品質。高いほど良いです。"
                    },
                    bankOffset: {
                        title: "バンクオフセット",
                        description:
                            "ファイルのバンクオフセット。0の値が推奨されます。何をしているか分かっている場合にのみ変更してください。"
                    },
                    adjust: {
                        title: "MIDIの調整",
                        description:
                            "MIDIファイルをSoundFontに合わせます。何をしているか分かっている場合を除き、このままにしてください。"
                    }
                }
            }
        },
        metadata: {
            songTitle: {
                title: "タイトル:",
                description: "曲のタイトル"
            },
            album: {
                title: "アルバム:",
                description: "曲のアルバム名"
            },
            artist: {
                title: "アーティスト:",
                description: "曲のアーティスト"
            },
            albumCover: {
                title: "アルバムカバー:",
                description: "曲のアルバムカバー画像"
            },
            creationDate: {
                title: "作成日:",
                description: "曲の作成日"
            },
            genre: {
                title: "ジャンル:",
                description: "曲のジャンル"
            },
            comment: {
                title: "コメント:",
                description: "曲のコメント"
            },
            duration: {
                title: "再生時間:",
                description: "曲の再生時間"
            },
            subject: {
                title: "件名:",
                description: "曲の件名"
            },
            software: {
                title: "ソフトウェア:",
                description: "曲の作成に使用されたソフトウェア"
            }
        }
    }
};
