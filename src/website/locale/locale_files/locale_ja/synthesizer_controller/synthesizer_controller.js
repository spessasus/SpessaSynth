import { channelControllerLocale } from './channel_controller.js'

/**
 *
 * @type {{systemReset: {description: string, title: string}, disableCustomVibrato: {description: string, title: string}, mainTransposeMeter: {description: string, title: string}, mainVoiceMeter: {description: string, title: string}, midiPanic: {description: string, title: string}, mainPanMeter: {description: string, title: string}, mainVolumeMeter: {description: string, title: string}, toggleButton: {description: string, title: string}, channelController: {transposeMeter: {description: string, title: string}, voiceMeter: {description: string, title: string}, modulationWheelMeter: {description: string, title: string}, expressionMeter: {description: string, title: string}, panMeter: {description: string, title: string}, presetSelector: {description: string}, presetReset: {description: string}, pitchBendMeter: {description: string, title: string}, reverbMeter: {description: string, title: string}, volumeMeter: {description: string, title: string}, drumToggleButton: {description: string}, muteButton: {description: string}, chorusMeter: {description: string, title: string}}, blackMidiMode: {description: string, title: string}}}
 */
export const synthesizerControllerLocale = {
    toggleButton: {
        title: "シンセサイザーコントローラー",
        description: "シンセサイザーコントローラーを表示"
    },

    // meters
    mainVoiceMeter: {
        title: "ボイス: ",
        description: "現在再生中のボイスの総数",
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

    // buttons
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
        description: "高性能モードを切り替え、見た目を簡素化し、ノートを速く消去"
    },

    disableCustomVibrato: {
        title: "カスタムビブラートを無効化",
        description: "カスタム（NRPN）ビブラートを永久に無効化。再度有効化するにはウェブサイトをリロード"
    },

    helpButton: {
        title: "ヘルプ",
        description: "使用ガイドを表示します"
    },


    channelController: channelControllerLocale
}
