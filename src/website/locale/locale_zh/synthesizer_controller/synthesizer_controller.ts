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
        description: "移调: 移调合成器（以半音或全音为单位）"
    },

    // 按钮
    midiPanic: {
        title: "MIDI 紧急停止",
        description: "MIDI 紧急停止: 立即停止所有发声"
    },

    systemReset: {
        title: "重置控制器",
        description: "重置控制器: 将所有 MIDI 控制器重置为默认值"
    },

    showOnlyUsed: {
        title: "仅显示已使用",
        description: "仅在合成器控制器中显示已使用的 MIDI 通道"
    },

    helpButton: {
        title: "帮助",
        description: "帮助: 打开带有使用指南的外部网站"
    },

    holdPedalDown: "延音踏板已踩下 (Shift)",
    port: "端口 {0}（点击切换可见性）",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
