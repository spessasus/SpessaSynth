export const keyModifiers = {
    button: {
        title: "按键修改器",
        description: "修改单个按键参数"
    },

    mainTitle: "按键修改编辑器",

    detailedDescription:
        "此菜单允许您修改给定通道上的 MIDI 音符。\n" +
        "目前您可以修改其力度并分配它使用的音色（乐器）。\n" +
        " 这对鼓组特别有用。",

    prompt: "您想要做什么？",

    selectKey: {
        prompt: "按下键盘上您想要修改的按键。",
        title: "选择按键",
        change: "更改按键"
    },

    selectedChannel: {
        title: "选定通道",
        description: "您想要修改的按键所属的通道"
    },

    selectedKey: {
        title: "选定按键: {0}",
        description: "您已选择 MIDI 音符编号 {0}"
    },

    modifyKey: {
        title: "修改按键",
        description: "修改给定通道上的单个按键",
        velocity: {
            title: "力度覆盖",
            description:
                "此按键使用的力度，忽略 MIDI 力度。保持为 -1 表示不变"
        },
        gain: {
            title: "增益",
            description: "此发声的线性增益。设置为 1 表示不变。"
        },
        preset: {
            title: "音色覆盖",
            description: "此按键使用的音色。",
            unchanged: "不变"
        },
        apply: {
            title: "应用",
            description: "应用所选修改器"
        }
    },

    removeModification: {
        title: "移除修改",
        description: "从给定通道上的单个按键移除修改",

        remove: {
            title: "移除",
            description: "移除此按键修改器"
        }
    },

    resetModifications: {
        title: "重置更改",
        description: "清除并重置所有通道的所有按键修改",

        confirmation: {
            title: "确认您的操作",
            description: "您确定要移除所有修改吗？"
        }
    }
};
