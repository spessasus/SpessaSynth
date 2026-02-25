import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

export const localeChinese = {
    localeName: "中文",
    // Title message
    titleMessage: "SpessaSynth: SF2/DLS JavaScript 合成器",
    demoTitleMessage: "SpessaSynth: SF2/DLS JavaScript 合成器在线演示",

    synthInit: {
        genericLoading: "加载中...",
        loadingSoundfont: "加载音色库...",
        loadingBundledSoundfont: "加载内置音色库...",
        startingSynthesizer: "启动合成器...",
        savingSoundfont: "保存音色库以供重用...",
        noWebAudio: "您的浏览器不支持 Web Audio。",
        done: "就绪！"
    },

    // Top bar buttons
    midiUploadButton: "上传您的 MIDI 文件",

    extraBank: {
        title: "额外音色库选择",
        offset: {
            title: "音色库偏移",
            description: "额外音色库的偏移值"
        },
        file: {
            title: "音色库",
            description: "选择音色库（DLS/SF2/SF3）"
        },
        confirm: {
            title: "确认",
            description: "确认并应用额外音色库"
        },
        clear: {
            title: "清除",
            description: "清除额外音色库"
        },
        button: "添加额外音色库"
    },

    exportAudio: exportAudio,

    error: "错误",
    yes: "是",
    no: "否",
    none: "无",

    demoSoundfontUploadButton: "上传音色库",
    demoGithubPage: "项目页面",
    soundfontEditor: "SF2/DLS 编辑器",
    demoDownload: {
        main: "下载",
        downloadLocal: {
            title: "下载本地版",
            description:
                "下载 SpessaSynth: 本地版以便在您的电脑上离线使用"
        }
    },
    demoSongButton: "演示歌曲",
    credits: " credits",
    dropPrompt: "将文件拖放到此处...",

    warnings: {
        outOfMemory:
            "您的浏览器内存不足。考虑使用 Firefox 或 SF3 音色库。（请查看控制台了解错误）",
        noMidiSupport:
            "未检测到 MIDI 端口，此功能将被禁用。",
        warning: "警告"
    },
    hideTopBar: {
        title: "隐藏顶部栏",
        description:
            "隐藏顶部（标题）栏以提供更无缝的体验"
    },

    convertDls: {
        title: "DLS 转换",
        message:
            "您是否要将 DLS 转换为 SF2 以用于仅支持 SF2 的程序？"
    },

    // All translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
} as const;
