import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";
import { keyModifiers } from "./key_modifiers.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "シンセサイザーコントローラー (S)",
        description: "シンセサイザーコントローラーの表示を切り替えます。"
    },

    // Meters
    mainVoiceMeter: {
        title: "ボイス: ",
        description: //"The total amount of voices currently playing"
            "現在再生中の音の総数"
    },

    mainVolumeMeter: {
        title: "音量: ",
        description: //"The current master volume of the synthesizer"
            "シンセサイザーの現在のマスターボリューム"
    },

    mainPanMeter: {
        title: "パン: ",
        description: //"The current master stereo panning of the synthesizer"
            "シンセサイザーの現在のマスターステレオパン"
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

    systemReset: {
        title: "コントローラをリセット",
        description:
            //"Reset Controllers: Resets all MIDI controllers to their default values"
            "コントローラーをリセット: すべてのMIDIコントローラーをデフォルト値にリセットします"
    },

    showOnlyUsed: {
        title: "使用中のチャンネルのみを表示",
        description:
            "使用中のチャンネルのみを表示: シンセサイザー コントローラーで使用中のMIDIチャンネルのみを表示します"
    },

    helpButton: {
        title: "ヘルプ",
        description: //"Help: Opens an external website with the usage guide"
            "ヘルプ: 使い方ガイドが記載された外部ウェブサイトを開きます"
    },

    tabs: {
        description: "タブ: 設定する項目を選択します",
        channels: "MIDIチャンネル",
        reverb: "リバーブ設定",
        chorus: "コーラス設定",
        delay: "ディレイ設定",
        insertion: "インサーションFX設定",
        configuration: "全般設定",
    },

    holdPedalDown: "ホールドペダルが押されています (Shift)",
    port: "ポート{0} (クリックして表示を切り替え)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
