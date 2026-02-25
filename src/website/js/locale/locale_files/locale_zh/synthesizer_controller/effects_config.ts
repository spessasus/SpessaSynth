export const effectsConfig = {
    button: {
        title: "效果器配置",
        description:
            "配置合唱和混响效果以及自定义颤音"
    },
    reverbConfig: {
        title: "混响配置",
        description: "配置混响处理器",
        impulseResponse: {
            title: "脉冲响应",
            description: "为卷积混响选择脉冲响应"
        }
    },

    chorusConfig: {
        title: "合唱配置",
        description: "配置合唱处理器",
        nodesAmount: {
            title: "节点数量",
            description:
                "要使用的延迟节点数量（每个立体声通道）"
        },
        defaultDelay: {
            title: "延迟 (秒)",
            description: "第一个节点的延迟时间（秒）"
        },
        delayVariation: {
            title: "延迟增量 (秒)",
            description:
                "第一个节点之后每个延迟节点的增量（秒）"
        },
        stereoDifference: {
            title: "立体声差异 (秒)",
            description:
                "两个通道之间的延迟差异（添加到左声道并从右声道减去）"
        },
        oscillatorFrequency: {
            title: "LFO 频率 (Hz)",
            description:
                "第一个延迟节点的 LFO 频率，单位为 Hz。LFO 控制延迟时间。"
        },
        frequencyVariation: {
            title: "LFO 增量 (Hz)",
            description:
                "第一个 LFO 之后每个 LFO 频率的增量，单位为 Hz"
        },
        oscillatorGain: {
            title: "LFO 增益 (秒)",
            description:
                "LFO 将在延迟节点中改变延迟的量，单位为秒"
        },
        apply: {
            title: "应用",
            description: "应用所选设置"
        }
    }
};
