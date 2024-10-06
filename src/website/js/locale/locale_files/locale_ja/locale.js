import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localeJapanese = {
    localeName: "日本語",
    // title messsage
    titleMessage: "SpessaSynth: SoundFont2 Javascript シンセサイザー",
    demoTitleMessage: "SpessaSynth: SoundFont2 Javascript シンセサイザー オンラインデモ",
    
    synthInit: {
        genericLoading: "読み込み中...",
        loadingSoundfont: "サウンドフォントを読み込んでいます...",
        loadingBundledSoundfont: "バンドルされたサウンドフォントを読み込んでいます...",
        startingSynthesizer: "シンセサイザーを起動しています...",
        savingSoundfont: "再利用のためにサウンドフォントを保存しています...",
        noWebAudio: "お使いのブラウザはWeb Audioをサポートしていません。",
        done: "準備完了！"
    },
    
    // top bar buttons
    midiUploadButton: "MIDIファイルをアップロード",
    
    exportAudio: exportAudio,
    
    yes: "はい",
    no: "いいえ",
    
    
    demoSoundfontUploadButton: "サウンドフォントをアップロード",
    demoGithubPage: "プロジェクトのページ",
    demoSongButton: "デモソング",
    credits: "クリエイター",
    dropPrompt: "ここにファイルをドロップ...",
    
    warnings: {
        noMidiSupport: "このブラウザはMIDI入力をサポートしていないため、この機能は利用できません。ChromeまたはFirefoxを使用することを検討してください。",
        outOfMemory: "ブラウザのメモリが不足しました。FirefoxやSF3サウンドフォントの使用を検討してください。\n\n（エラーについてはコンソールを参照してください）。",
        chromeMobile: "SpessaSynthはChrome Mobileでの動作が良くありません。\n\n代わりにFirefox Androidを使用することを検討してください。",
        warning: "注意"
    },
    
    hideTopBar: {
        title: "トップバーを隠す",
        description: "トップ（タイトル）バーを隠して、よりシームレスな体験を提供します"
    },
    
    convertDls: {
        title: "DLS変換",
        message: "DLSファイルがアップロードされたようです。これをSF2に変換しますか？"
    },
    
    
    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};
