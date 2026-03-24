import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

// Translations for the Japanese locale

export const localeJapanese = {
    localeName: "日本語",
    // Title message
    titleMessage: "SpessaSynth: Javascript SF2/DLSシンセサイザー",
    demoTitleMessage: "SpessaSynth: Javascript SF2/DLSシンセサイザー オンラインデモ",

    synthInit: {
        genericLoading: "読み込み中...",
        loadingSoundfont: "SoundFontを読み込み中...", // SoundFontは固有名詞なので、英語のままにしています
        loadingBundledSoundfont: "同梱されたSoundFontを読み込み中...",
        startingSynthesizer: "シンセサイザーを起動中...",
        savingSoundfont: "次の使用のためにSoundFontを保存中...",
        noWebAudio: "あなたのブラウザはWeb Audioをサポートしていません。",
        done: "準備完了!"
    },

    // Top bar buttons
    midiUploadButton: "MIDIファイルをアップロード",

    extraBank: { 
        title: "追加バンクの選択",
        offset: {
            title: "バンクのオフセット",
            description: "追加バンクのバンクオフセット"
        },
        file: {
            title: "サウンドバンク",
            description: "サウンドバンクを選択 (DLS/SF2/SF3)"
        },
        confirm: {
            title: "確認",
            description: "確認して追加バンクを適用"
        },
        clear: {
            title: "クリア",
            description: "追加バンクをクリア"
        },
        button: "追加バンクを追加"
    },

    exportAudio: exportAudio,

    error: "エラー",
    yes: "はい",
    no: "いいえ",
    none: "なし",

    demoSoundfontUploadButton: "SoundFontをアップロード",
    demoGithubPage: "プロジェクトのページ",
    discord: "Discordサーバーに参加する",
    soundfontEditor: "SF2/DLSエディタ",
    demoDownload: {
        main: "ダウンロード",
        downloadLocal: {
            title: "ローカル版をダウンロードする",
            description:
                "SpessaSynthのローカル版をダウンロードしてオフラインで使用"
        }
    },
    demoSongButton: "デモソング",
    credits: "クレジット",
    dropPrompt: "ここにファイルをドラッグ & ドロップしてください...",

    warnings: {
        outOfMemory:
            "あなたのブラウザのメモリが不足しています。FirefoxまたはSF3 SoundFontの使用を検討してください。(エラーについてはブラウザのコンソールを確認してください)。",
        noMidiSupport:
            "MIDIポートが検出されませんでした。この機能は無効になります。",
        warning: "警告",
        invalidMidiFile: "無効なMIDIファイル:"
    },
    hideTopBar: {
        title: "タイトルバーを隠す",
        description:
            "タイトルバーを隠して、よりスムーズな体験を提供します"
    },

    convertDls: {
        title: "DLSファイルの変換",
        message:
            "DLSをSF2に変換して、SF2専用プログラムで使用しますか？"
    },

    // All translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
} as const;
