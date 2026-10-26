import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "シンセサイザーコントローラー (S)",
        description: "シンセサイザーコントローラーの表示を切り替えます。"
    },

    // Meters
    mainVoiceMeter: {
        title: "ボイス: ",
        //"The total amount of voices currently playing"
        description: "現在再生中の音の総数"
    },

    mainVolumeMeter: {
        title: "音量: ",
        //"The current master volume of the synthesizer"
        description: "シンセサイザーの現在のマスターボリューム"
    },

    mainPanMeter: {
        title: "パン: ",
        //"The current master stereo panning of the synthesizer"
        description: "シンセサイザーの現在のマスターステレオパン"
    },

    mainTransposeMeter: {
        title: "トランスポーズ: ",
        description:
            //"Transpose: Transposes the synthesizer (in semitones or keys)"
            "トランスポーズ: シンセサイザーを移調します（セミトーンまたはキー単位）"
    },

    // Buttons
    midiPanic: {
        title: "MIDIパニック",
        description: "MIDIパニック: すべての音を即座に停止します"
    },

    gsReset: {
        title: "GSリセット",
        description:
            "GSリセット: シンセサイザー全体をRoland GSモードにリセットし、すべてのコントローラーのロックを解除します"
    },

    xgReset: {
        title: "XGリセット",
        description:
            "XGリセット: シンセサイザー全体をYamaha XGモードにリセットし、すべてのコントローラーのロックを解除します"
    },

    showOnlyUsed: {
        title: "使用中のチャンネルのみを表示",
        description:
            "使用中のチャンネルのみを表示: シンセサイザー コントローラーで使用中のMIDIチャンネルのみを表示します"
    },

    helpButton: {
        title: "ヘルプ",
        //"Help: Opens an external website with the usage guide"
        description:
            "ヘルプ: 使い方ガイドが記載された外部ウェブサイトを開きます"
    },

    tabs: {
        description: "タブ: 設定する項目を選択します",
        channels: "MIDIチャンネル",
        gsReverb: "GS リバーブ設定",
        gsChorus: "GS コーラス設定",
        gsDelay: "GS ディレイ設定",
        gsInsertion: "GS インサーションFX設定",
        xgReverb: "XG リバーブ設定",
        xgChorus: "XG コーラス設定",
        xgVariation: "XG バリエーション設定",
        xgInsertion: "XG インサーションFX設定",
        configuration: "全般設定"
    },

    holdPedalDown: "ホールドペダルが押されています (Shift)",
    port: "ポート{0} (クリックして表示を切り替え)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
