import { rendererSettingsLocale } from "./renderer_settings.js";
import { keyboardSettingsLocale } from "./keyboard_settings.js";
import { midiSettingsLocale } from "./midi_settings.js";

export const settingsLocale = {
    toggleButton: "設定",
    mainTitle: "プログラム設定",

    rendererSettings: rendererSettingsLocale,
    keyboardSettings: keyboardSettingsLocale,
    midiSettings: midiSettingsLocale,

    interfaceSettings: {
        title: "インターフェース設定",

        toggleTheme: {
            title: "テーマを切り替え",
            description: "プログラムのテーマを切り替えます"
        },

        selectLanguage: {
            title: "言語",
            description: "プログラムの言語を変更します"
        },

        layoutDirection: {
            title: "レイアウトの方向",
            description: "レンダラーとキーボードのレイアウト方向",
            values: {
                downwards: "下向き",
                upwards: "上向き",
                leftToRight: "左から右",
                rightToLeft: "右から左"
            }
        },

        reminder: {
            title: "設定にカーソルを合わせると、詳細情報を表示できることを知っていましたか？",
            description: "このように！"
        }
    }
};
