export const channelControllerLocale = {
    voiceMeter: {
        title: "ボイス: ",
        description:
            "ボイス: 現在チャンネル{0}で再生中の音の数"
    },

    pitchBendMeter: {
        title: "ピッチベンド: ",
        description:
            "ピッチベンド: チャンネル{0}に適用された現在のピッチベンド"
    },

    panMeter: {
        title: "パン: ",
        description:
            "パン: チャンネル{0}に適用された現在のステレオパンニング (右クリックでロック)"
    },

    expressionMeter: {
        title: "エクスプレッション: ",
        description:
            "エクスプレッション: チャンネル{0}の現在のエクスプレッション (音量) (右クリックでロック)"
    },

    volumeMeter: {
        title: "ボリューム: ",
        description:
            "ボリューム: チャンネル{0}の現在の音量 (右クリックでロック)"
    },

    modulationWheelMeter: {
        title: "モジュレーション: ",
        description:
            "モジュレーションホイール: チャンネル{0}の現在のモジュレーション (通常はバイブラート) の深さ (右クリックでロック)"
    },

    chorusMeter: {
        title: "コーラス: ",
        description:
            "コーラスレベル: チャンネル{0}に適用された現在のコーラス効果のレベル (右クリックでロック)"
    },

    reverbMeter: {
        title: "リバーブ: ",
        description:
            "リバーブレベル: チャンネル{0}に適用された現在のリバーブ効果のレベル (右クリックでロック)"
    },

    delayMeter: {
        title: "ディレイ: ",
        description:
            "ディレイレベル: チャンネル{0}に適用された現在のディレイ効果のレベル (右クリックでロック)"
    },

    filterMeter: {
        title: "カットオフ: ",
        description:
            "フィルタカットオフ: チャンネル{0}に適用された現在のローパスフィルタのカットオフレベル (右クリックでロック)"
    },

    resonanceMeter: {
        title: "レゾナンス: ",
        description:
            "フィルタレゾナンス: チャンネル{0}に適用された現在のローパスフィルタのレゾナンス (Q) レベル (右クリックでロック)"
    },

    transposeMeter: {
        title: "トランスポーズ: ",
        description:
            "チャンネルのトランスポーズ: チャンネル{0}の現在のトランスポーズ (キー移動) "
    },

    attackMeter: {
        title: "アタック: ",
        description:
            "アタックタイム: チャンネル{0}の現在のアタックタイム (スピード) (右クリックでロック)"
    },

    releaseMeter: {
        title: "リリース: ",
        description:
            "リリースタイム: チャンネル{0}の現在のリリースタイム (スピード) (右クリックでロック)"
    },

    decayMeter: {
        title: "ディケイ: ",
        description:
            "ディケイタイム: チャンネル{0}の現在のディケイタイム (スピード) (右クリックでロック)"
    },

    portamentoTimeMeter: {
        title: "ﾎﾟﾙﾀﾒﾝﾄﾀｲﾑ: ",
        description:
            //"Portamento Time: The current portamento time of channel {0} (right-click to lock). Set to 0 to disable portamento."
            "ポルタメントタイム: チャンネル{0}の現在のポルタメントタイム (右クリックでロック)。0に設定するとポルタメントが無効になります。"
    },

    portamentoControlMeter: {
        title: "ﾎﾟﾙﾀﾒﾝﾄｺﾝﾄﾛｰﾙ: ",
        description:
            "ポルタメントコントロール: チャンネル{0}でグライドを開始するキー番号 (ロックするのはお勧めしません)"
    },

    groupSelector: {
        description: //"Select the group of MIDI Controllers to manipulate",
            "操作するMIDIコントローラーのグループを選択",
        effects: "エフェクト",
        volumeEnvelope: "ボリュームエンベロープ",
        filter: "フィルタ",
        portamento: "ポルタメント(グライド)"
    },

    presetSelector: {
        description: "チャンネル{0}が使用しているプリセット(パッチ)を選択",
        selectionPrompt: "チャンネル{0}のプリセットを変更",
        searchPrompt: "検索..."
    },

    presetReset: {
        description: "チャンネル{0}をアンロックしてプリセットの変更を可能にする",
    },

    soloButton: {
        description: "チャンネル{0}のソロを切り替える"
    },

    muteButton: {
        description: "チャンネル{0}のミュートを切り替える"
    },

    drumToggleButton: {
        description: "チャンネル{0}のドラムモードを切り替える"
    },

    polyMonoButton: {
        description: `チャンネル{0}でPOLY/MONOモードを切り替える`
    },

    insertionEffectButton: {
        description: `チャンネル{0}のインサーションエフェクトを切り替える` // SC-88の説明では、「インサーションエフェクト」となっている
    }
};
