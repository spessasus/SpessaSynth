export const effectsConfig = {
    toggleLock: {
        title: "ロックの切り替え",
        description:
            //"Toggle Lock: Prevent MIDI data from changing the effect's parameters."
            "ロックの切り替え: MIDIデータによるエフェクトのパラメーターの変更を防止します。"
    },

    misc: {
        title: "その他の設定",
        description: //"Configure miscellaneous settings of the synthesizer.",
            "シンセサイザーのその他の設定を構成します。",

        interpolation: {
            description:
                "補間モード: 音の品質とCPU使用率に影響する、サンプルの補間方法を選択します。 " +
                "リニアは高品質ですがCPU使用率が高く、ニアレストネイバーは低品質ですがCPU使用率が低いです。 " +
                "キュービックはリニアと同程度の品質で、CPU使用率もリニアより少し低いです。",
            linear: "リニア(線形補間)",
            nearestNeighbor: "ニアレストネイバー(最近傍補間)",
            cubic: "キュービック(三次補間)"
        },

        sampleRate: {
            title: "サンプルレート",
            description:
                //"Sample Rate: Change the sample rate of the synthesizer",
                "サンプルレート: シンセサイザーのサンプルレートを変更します",
            warning:
                "サンプルレートを変更するにはページの再読み込みが必要です。続行してもよろしいですか？"
        },

        voiceCap: {
            title: "最大ボイス数",
            description:
                "最大ボイス数: 一度に再生できるボイスの最大数"
        },

        msgsCutoff: {
            title: "MSGSのようなノートカットオフ",
            description:
                //"MSGS Note Cutoff: Immediately cuts off the previous note on the same key, emulating the Microsoft GS Wavetable Synthesizer"
                "MSGSのようなノートカットオフ: 同じキーの前のノートを即座にカットオフし、Microsoft GS Wavetable Synthesizerの挙動をエミュレートします"
        },

        blackMidiMode: {
            title: "Black MIDIモード",
            description:
                //"Black MIDI Mode: Toggles the High Performance Mode, simplifying the look and killing the notes faster"
                "Black MIDIモード: ハイパフォーマンスモードを切り替え、見た目をシンプルにし、ノートをより速く消します"
        },

        drumEditing: {
            title: "ドラム編集",
            description:
                //"Drum Editing: Allow editing drum instruments via MIDI system exclusive messages"
                "ドラム編集: MIDIシステムエクスクルーシブメッセージを介してドラム楽器の編集を許可します"
        },

        customVibrato: {
            title: "カスタムビブラート",
            description: "カスタムビブラート: NRPNを使ったカスタムビブラートを有効にします"
        }
    },

    reverb: {
        title: "リバーブ設定",
        description: //"Configure how the reverb effect sounds.",
        "リバーブの設定: リバーブエフェクトの音を構成します。",

        level: {
            title: "レベル: ",
            description: //"Level: This parameter sets the amount of the effect."
                "レベル: リバーブエフェクトの量を設定します。"
        },

        preLowpass: {
            title: "プレLPF: ",
            description:
                //"Pre-LPF: A low-pass filter can be applied to the sound coming into the effect to cut the high frequency range. " +
                //"Higher values will cut more of the high frequencies," +
                //" resulting in a more mellow effect sound."
                "プレLPF: エフェクトに入る音にローパスフィルタを適用して高周波数帯域をカットできます。 " +
                "値が高いほど高周波数が多くカットされ、よりまろやかなエフェクトサウンドになります。"
        },

        character: {
            title: "タイプ: ",
            description:
                "タイプ: このパラメーターはリバーブのタイプを選択します。0–5はリバーブエフェクトで、6と7はディレイエフェクトです。"
        },

        time: {
            title: "時間: ",
            description:
                //"Time: This parameter sets the time over which the reverberation will continue. " +
                //"Higher values result in longer reverberation."
                "時間: このパラメーターは、残響が続く時間を設定します。値が高いほど残響が長くなります。"
        },

        delayFeedback: {
            title: "フィードバック: ",
            description:
                //"Feedback: This parameter is used when the Reverb Character is set to 6 or 7. " +
                //"It sets the way in which delays repeat. " +
                //"Higher values result in more delay repeats."
                "フィードバック: このパラメーターは、リバーブキャラクターが6または7に設定されているときに使用されます。 " +
                "ディレイの繰り返し方を設定します。値が高いほどディレイの繰り返しが多くなります。"
        },

        preDelayTime: {
            title: "プレディレイ: ",
            description:
                "プレディレイ: このパラメーターは、残響音が聞こえるまでの遅延時間を設定します。 " +
                "値が高いほどプレディレイ時間が長くなり、より大きな残響空間をシミュレートします。"
        }
    },

    chorus: {
        title: "コーラス設定",
        description: "コーラスの設定: コーラスエフェクトの音を構成します。",

        level: {
            title: "レベル: ",
            description: "レベル: コーラスエフェクトの量を設定します。"
        },

        preLowpass: {
            title: "プレLPF: ",
            description:
                "プレLPF: エフェクトに入る音にローパスフィルタを適用して高周波数帯域をカットできます。 " +
                "値が高いほど高周波数が多くカットされ、よりまろやかなエフェクトサウンドになります。"
        },

        feedback: {
            title: "フィードバック: ",
            description:
                "フィードバック: このパラメーターは、コーラス音が変調される速度（周波数）を設定します。 " +
                "値が高いほど変調が速くなります。"
        },

        delay: {
            title: "ディレイ: ",
            description:
                "ディレイ: このパラメーターはコーラスエフェクトの遅延時間を設定します。"
        },

        rate: {
            title: "レート: ",
            description:
                "レート: このパラメーターは、コーラス音が変調される速度（周波数）を設定します。 " +
                "値が高いほど変調が速くなります。"
        },

        depth: {
            title: "デプス: ",
            description:
                "デプス: このパラメーターは、コーラス音が変調される深さを設定します。 " +
                "値が高いほど変調が深くなります。"
        },

        sendLevelToReverb: {
            title: "リバーブへのセンドレベル: ",
            description:
                //"Send Level To Reverb: This parameter sets the amount of chorus sound that will be sent to the reverb. " +
                //"Higher values result in more sound being sent."
                "リバーブへのセンドレベル: このパラメーターは、リバーブに送られるコーラス音の音量を設定します。値が高いほど音量が大きくなります。"
        },

        sendLevelToDelay: {
            title: "ディレイへのセンドレベル: ",
            description:
                //"Send Level To Delay: This parameter sets the amount of chorus sound that will be sent to the delay. " +
                //"Higher values result in more sound being sent."
                "ディレイへのセンドレベル: このパラメーターは、ディレイに送られるコーラス音の音量を設定します。値が高いほど音量が大きくなります。"
        }
    },

    delay: {
        title: "ディレイ設定",
        description: "ディレイエフェクトの音を構成します。",

        level: {
            title: "レベル: ",
            description: "レベル: ディレイエフェクトの量を設定します。"
        },

        preLowpass: {
            title: "プレLPF: ",
            description:
                "プレLPF: エフェクトに入る音にローパスフィルタを適用して高周波数帯域をカットできます。 " +
                "値が高いほど高周波数が多くカットされ、よりまろやかなエフェクトサウンドになります。"
        },

        timeCenter: {
            title: "タイム(センター): ",
            description:
                "タイムセンター: ディレイエフェクトには3つの遅延時間があります。センター、左、右 (ステレオで聴く場合)。 " +
                "タイムセンターは、センターに配置されたディレイの遅延時間を設定します。"
        },

        timeRatioLeft: {
            title: "タイム比率(左): ",
            description:
                "タイム比率(左): このパラメーターは、左側に配置されたディレイの遅延時間を、遅延時間センターの百分率として設定します (最大1.0秒まで)。"
        },

        timeRatioRight: {
            title: "タイム比率(右): ",
            description:
                "タイム比率(右): このパラメーターは、右側に配置されたディレイの遅延時間を、遅延時間センターの百分率として設定します (最大1.0秒まで)。"
        },

        levelCenter: {
            title: "レベル(センター): ",
            description:
                "レベルセンター: このパラメーターは、センターに配置されたディレイの音量を設定します。 " +
                "値が高いほどセンターのディレイが大きくなります。"
        },
        levelLeft: {
            title: "レベル(左): ",
            description:
                "レベル(左): このパラメーターは、左側に配置されたディレイの音量を設定します。 " +
                "値が高いほど左のディレイが大きくなります。"
        },
        levelRight: {
            title: "レベル(右): ",
            description:
                "レベル(右): このパラメーターは、右側に配置されたディレイの音量を設定します。 " +
                "値が高いほど右のディレイが大きくなります。"
        },

        feedback: {
            title: "フィードバック: ",
            description:
                //"Feedback: This parameter affects the number of times the delay will repeat. " +
                //"With a value of 0, the delay will not repeat. " +
                //"With higher values there will be more repeats." +
                //" With negative (-) values, the center delay will be fed back with inverted phase." +
                //" Negative values are effective with short delay times."
                "フィードバック: このパラメーターは、ディレイが繰り返される回数に影響します。値が0の場合、ディレイは繰り返されません。" +
                "値が高いほど繰り返しが多くなります。負の値の場合、センターディレイは" + 
                "位相が反転してフィードバックされます。負の値は短いディレイ時間で効果的です。"
        },

        sendLevelToReverb: {
            title: "リバーブへのセンドレベル: ",
            description:
                //"Send Level To Reverb: This parameter sets the amount of delay sound that will be sent to the reverb. " +
                //"Higher values result in more sound being sent."
                "リバーブへのセンドレベル: このパラメーターは、ディレイ音をリバーブに送る量を設定します。値が高いほど送られる音量が大きくなります。"
        }
    },

    insertion: {
        title: "インサーションエフェクトの設定",
        description:
            //"Select the Insertion Effect and configure how it should sound.",
            "インサーションエフェクトの選択と、エフェクトの音の構成を行います。",

        sendLevelToReverb: {
            title: "リバーブへのセンドレベル: ",
            description:
                "リバーブへのセンドレベル: このパラメーターは、インサーションエフェクトの後に来る音をリバーブに送る量を調整します。値が高いほど送られる音量が大きくなります。"
        },

        sendLevelToChorus: {
            title: "コーラスへのセンドレベル: ",
            description:
                "コーラスへのセンドレベル: このパラメーターは、インサーションエフェクトの後に来る音をコーラスに送る量を調整します。値が高いほど送られる音量が大きくなります。"
        },

        sendLevelToDelay: {
            title: "ディレイへのセンドレベル: ",
            description:
                "ディレイへのセンドレベル: このパラメーターは、インサーションエフェクトの後に来る音をディレイに送る量を調整します。値が高いほど送られる音量が大きくなります。"
        }
    }
};
