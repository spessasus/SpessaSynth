export const exportAudio = {
    button: {
        title: "音声を保存",
        description: "音声をWAV、MIDI、SF2、またはRMIファイルとして保存"
    },

    formats: {
        title: "フォーマットを選択",
        formats: {
            wav: {
                button: {
                    title: "WAV音声 (.wav)",
                    description: "変更を加えた曲を.wavオーディオファイルとしてエクスポートします"
                },
                options: {
                    title: "WAVエクスポートオプション",
                    confirm: "エクスポート",
                    normalizeVolume: {
                        title: "音量の正規化",
                        description: "MIDIの音量にかかわらず、音量を一定に保ちます。推奨設定です。",
                    },
                    additionalTime: {
                        title: "追加時間（秒）",
                        description: "音がフェードアウトするために曲の最後に追加する時間です。（秒）",
                    },

                    separateChannels: {
                        title: "チャンネルを分割",
                        description: "各チャンネルを別々のファイルとして保存します。オシロスコープビューアなどに便利です。このオプションを使用するとリバーブやコーラスが無効になります。",
                        saving: {
                            title: "チャンネルファイル",
                            save: "チャンネル{0}を保存"
                        }
                    }
                },
                exportMessage: {
                    message: "WAV音声をエクスポートしています...",
                    estimated: "残り時間:",
                    convertWav: "WAVに変換中...",
                }
            },

            midi: {
                button: {
                    title: "MIDI (.mid)",
                    description: "コントローラーと楽器の変更が適用されたMIDIファイルをエクスポートします"
                }
            },

            soundfont: {
                button: {
                    title: "サウンドフォント (.sf2)",
                    description: "SoundFont2ファイルをエクスポートします"
                },

                options: {
                    title: "SFエクスポートオプション",
                    confirm: "エクスポート",
                    trim: {
                        title: "トリミング",
                        description: "MIDIファイルで使用されている楽器とサンプルだけにトリミングされたサウンドフォントをエクスポートします"
                    },
                    compress: {
                        title: "圧縮",
                        description: "未圧縮の場合は、Ogg Vorbisのロス圧縮でサンプルを圧縮します。ファイルサイズが大幅に削減されます。" +
                            "サウンドフォントがすでに圧縮されている場合、このオプションを無効にしても再圧縮されることはありません"
                    },
                    quality: {
                        title: "圧縮品質",
                        description: "圧縮の品質です。高いほど良いです"
                    }
                }
            },

            rmidi: {
                button: {
                    title: "埋め込みMIDI (.rmi)",
                    description: "変更されたMIDIとトリミングされたサウンドフォントを1つのファイルに埋め込んでエクスポートします。" +
                        "この形式は広くサポートされていないことに注意してください"
                },

                progress: {
                    title: "埋め込まれたMIDIをエクスポート中...",
                    loading: "サウンドフォントとMIDIを読み込み中...",
                    modifyingMIDI: "MIDIを修正中...",
                    modifyingSoundfont: "サウンドフォントをトリミング中...",
                    saving: "RMIDIを保存中...",
                    done: "完了しました！"
                },

                options: {
                    title: "RMIDIエクスポートオプション",
                    confirm: "エクスポート",
                    compress: {
                        title: "圧縮",
                        description: "サウンドフォントをOgg Vorbisのロス圧縮で圧縮します。ファイルサイズが大幅に削減されます。推奨設定です。"
                    },
                    quality: {
                        title: "圧縮品質",
                        description: "圧縮の品質です。高いほど良いです。"
                    },
                    bankOffset: {
                        title: "バンクオフセット",
                        description: "ファイルのバンクオフセットです。0の値が推奨されます。変更は慎重に行ってください。",
                    },
                    adjust: {
                        title: "MIDIを調整",
                        description: "MIDIファイルをサウンドフォントに合わせて調整します。特別な理由がない限り、このオプションはオンのままにしてください。"
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
                description: "曲のアルバム"
            },
            artist: {
                title: "アーティスト:",
                description: "曲のアーティスト"
            },
            albumCover: {
                title: "アルバムカバー:",
                description: "曲のアルバムカバー"
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
                title: "長さ:",
                description: "曲の長さ"
            }
        }

    }
}
