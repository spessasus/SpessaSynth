export const rendererSettingsLocale = {
    title: "渲染器设置",

    mode: {
        title: "可视化模式",
        description: "更改通道的可视化模式",
        waveforms: "波形",
        spectrumSplit: "频谱分离",
        spectrum: "频谱",
        filledWaveforms: "填充波形"
    },

    noteFallingTime: {
        title: "音符下落时间 (毫秒)",
        description: "音符下落的速度（视觉上）"
    },

    noteAfterTriggerTime: {
        title: "触发后音符时间 (毫秒)",
        description:
            "音符被触发后下落的时间。零表示它们在底部触发"
    },

    waveformThickness: {
        title: "波形线粗细 (px)",
        description: "波形线的粗细"
    },

    waveformSampleSize: {
        title: "样本大小",
        description:
            "可视化的详细程度（注意：高值可能会影响性能）。另请注意，高值会为音频添加延迟，以将波形与音频同步"
    },

    waveformAmplifier: {
        title: "放大器",
        description: "可视化的鲜艳程度"
    },

    toggleExponentialGain: {
        title: "启用指数增益",
        description:
            "通过使用指数曲线而非线性曲线进行高度计算，使增益差异更加明显"
    },

    toggleDynamicGain: {
        title: "启用动态增益",
        description:
            "自动调整增益，使最高点始终接触显示的顶部"
    },

    toggleLogarithmicFrequency: {
        title: "启用对数频率",
        description:
            "以对数方式分布频率柱，而非线性方式。推荐使用"
    },

    toggleWaveformsRendering: {
        title: "启用波形渲染",
        description:
            "启用通道波形的渲染（显示音频的彩色线条）"
    },

    toggleNotesRendering: {
        title: "启用音符渲染",
        description:
            "启用播放 MIDI 文件时下落音符的渲染"
    },

    toggleDrawingActiveNotes: {
        title: "启用绘制活动音符",
        description:
            "启用音符在被按下时发光和闪烁"
    },

    toggleDrawingVisualPitch: {
        title: "启用绘制视觉音高",
        description:
            "启用在应用音高轮时音符向左或向右滑动"
    },

    toggleRenderingDotDisplay: {
        title: "启用绘制点显示",
        description: "启用绘制 GS/XG 点显示消息"
    },

    toggleStabilizeWaveforms: {
        title: "稳定波形",
        description: "启用示波器触发"
    }
};
