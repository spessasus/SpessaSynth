export const effectsConfig = {
    misc: {
        title: "效果器配置",

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

        customVibrato: {
            title: "禁用自定义颤音",
            description: "永久禁用自定义 (NRPN) 颤音。重新加载网站以重新启用它"
        },

        interpolation: {
            description: "选择合成器的插值方法",
            linear: "线性插值",
            nearestNeighbor: "最近邻插值",
            cubic: "三次插值"
        },

        sampleRate: {
            title: "采样率",
            description: "更改合成器的采样率",
            warning: "更改采样率需要重新加载页面。您确定要继续吗？"
        },

        voiceCap: {
            title: "发声上限",
            description: "允许同时播放的最大发声数"
        }
    },
    reverb: {
        title: "混响配置",
        description: "配置混响处理器"
    },

    chorus: {
        title: "合唱配置",
        description: "配置合唱处理器"
    }
};
