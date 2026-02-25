import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";
import { keyModifiers } from "./key_modifiers.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "合成器控制器 (S)",
        description: "显示合成器控制器"
    },

    // 仪表
    mainVoiceMeter: {
        title: "发声数: ",
        description: "当前正在播放的总发声数"
    },

    mainVolumeMeter: {
        title: "音量: ",
        description: "合成器的当前主音量"
    },

    mainPanMeter: {
        title: "声像: ",
        description: "合成器的当前主立体声声像"
    },

    mainTransposeMeter: {
        title: "移调: ",
        description:
            "移调: 移调合成器（以半音或全音为单位）"
    },

    // 按钮
    midiPanic: {
        title: "MIDI 紧急停止",
        description: "MIDI 紧急停止: 立即停止所有发声"
    },

    systemReset: {
        title: "重置控制器",
        description:
            "重置控制器: 将所有 MIDI 控制器重置为默认值"
    },

    blackMidiMode: {
        title: "黑 MIDI 模式",
        description:
            "黑 MIDI 模式: 切换高性能模式，简化外观并更快地终止音符"
    },

    msgsCutoff: {
        title: "MSGS 音符截断",
        description:
            "MSGS 音符截断: 立即截断同一键上的前一个音符，模拟 Microsoft GS 波表合成器"
    },

    showOnlyUsed: {
        title: "仅显示已使用",
        description:
            "仅在合成器控制器中显示已使用的 MIDI 通道"
    },

    disableCustomVibrato: {
        title: "禁用自定义颤音",
        description:
            "永久禁用自定义 (NRPN) 颤音。重新加载网站以重新启用它"
    },

    helpButton: {
        title: "帮助",
        description: "帮助: 打开带有使用指南的外部网站"
    },

    interpolation: {
        description: "选择合成器的插值方法",
        linear: "线性插值",
        nearestNeighbor: "最近邻插值",
        cubic: "三次插值"
    },

    advancedConfiguration: {
        title: "配置",
        description: "配置合成器的高级设置"
    },

    sampleRate: {
        title: "采样率",
        description: "更改合成器的采样率",
        warning:
            "更改采样率需要重新加载页面。您确定要继续吗？"
    },

    voiceCap: {
        title: "发声上限",
        description: "允许同时播放的最大发声数"
    },

    holdPedalDown: "延音踏板已踩下 (Shift)",
    port: "端口 {0}（点击切换可见性）",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
