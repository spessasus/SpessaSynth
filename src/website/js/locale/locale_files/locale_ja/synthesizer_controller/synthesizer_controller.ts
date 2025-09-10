import { channelControllerLocale } from "./channel_controller.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "シンセサイザーコントローラー (S)",
        description: "シンセサイザーコントローラーを表示"
    },

    // Meters
    mainVoiceMeter: {
        title: "ボイス: ",
        description: "現在再生中のボイスの総数"
    },

    mainVolumeMeter: {
        title: "ボリューム: ",
        description: "シンセサイザーの現在のマスターボリューム"
    },

    mainPanMeter: {
        title: "パン: ",
        description: "シンセサイザーの現在のマスターステレオパンニング"
    },

    mainTransposeMeter: {
        title: "トランスポーズ: ",
        description: "シンセサイザーを移調します（セミトーンまたはキー）"
    },

    // Buttons
    midiPanic: {
        title: "MIDIパニック",
        description: "すべてのボイスを即座に停止"
    },

    systemReset: {
        title: "システムリセット",
        description: "すべてのコントローラーをデフォルト値にリセット"
    },

    blackMidiMode: {
        title: "ブラックMIDIモード",
        description:
            "高性能モードを切り替え、見た目を簡素化し、ノートを速く消去"
    },

    disableCustomVibrato: {
        title: "カスタムビブラートを無効化",
        description:
            "カスタム（NRPN）ビブラートを永久に無効化。再度有効化するにはウェブサイトをリロード"
    },

    helpButton: {
        title: "ヘルプ",
        description: "使用ガイドを表示します"
    },

    interpolation: {
        description: "シンセサイザーの補間方法を選択",
        linear: "リニア",
        nearestNeighbor: "なし"
    },

    channelController: channelControllerLocale
};
