import { settingsLocale } from './settings/settings.js'
import { musicPlayerModeLocale } from './music_player_mode.js'
import { synthesizerControllerLocale } from './synthesizer_controller/synthesizer_controller.js'
import { sequencerControllerLocale } from './sequencer_controller.js'

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localeJapanese = {
    localeName: "日本語",
    // title messsage
    titleMessage: "SpessaSynth: SoundFont2 Javascript シンセサイザー",
    demoTitleMessage: "SpessaSynth: SoundFont2 Javascript シンセサイザー オンラインデモ",

    // top bar buttons
    midiUploadButton: "MIDIファイルをアップロード",
    midiRenderButton: {
        title: "音声を保存する",
        description: "オーディオをWAVまたはMIDIファイルに保存する"
    },

    exportAudio: {
        message: "オーディオをエクスポート中...",
        estimated: "予想時間:"
    },

    exportAudioOptions: {
        title: "オーディオエクスポートオプション",
        confirm: "エクスポート",
        normalizeVolume: {
            title: "音量の正規化",
            description: "MIDIの音量に関わらず、常に同じレベルに保つ。推奨。",
        },
        additionalTime: {
            title: "追加時間 (秒)",
            description: "音がフェードするための曲の終わりに追加する時間。（秒）",
        }
    },


    demoSoundfontUploadButton: "サウンドフォントをアップロード",
    demoGithubPage: "プロジェクトのページ",
    demoBundledSoundfont: "バンドルされたSoundFontを使用 (22MB)",

    warnings: {
        noMidiSupport: "このブラウザはMIDI入力をサポートしていないため、この機能は利用できません。ChromeまたはFirefoxを使用することを検討してください。",
        outOfMemory: "ブラウザのメモリが不足しました。FirefoxやSF3サウンドフォントの使用を検討してください。<br><br>（エラーについてはコンソールを参照してください）。",
        chromeMobile: "SpessaSynthはChrome Mobileでの動作が良くありません。<br><br>代わりにFirefox Androidを使用することを検討してください。",
        warning: "注意"
    },

    hideTopBar: {
        title: "トップバーを隠す",
        description: "トップ（タイトル）バーを隠して、よりシームレスな体験を提供します",
    },

    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
}
