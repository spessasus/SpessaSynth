export const keyModifiers = {
    button: {
        title: "キー修飾",
        description: "個別のキーパラメータを修正"
    },

    mainTitle: "キー修飾エディタ",

    detailedDescription:
        "このメニューでは、指定されたチャネル上のMIDIノートを修正できます。\n" +
        "現在、ベロシティを修正し、使用するパッチ（楽器）を割り当てることができます。\n" +
        "これは特にドラムに便利です。",

    prompt: "何をしたいですか？",

    selectKey: {
        prompt: "キーボードで修正したいキーを押してください。",
        title: "キーを選択",
        change: "キーを変更"
    },

    selectedChannel: {
        title: "選択されたチャネル",
        description: "修正したいキーが属するチャネル"
    },

    selectedKey: {
        title: "選択されたキー: {0}",
        description: "MIDIノート番号 {0} を選択しました"
    },

    modifyKey: {
        title: "キーを修正",
        description: "指定されたチャネル上の単一キーを修正",
        velocity: {
            title: "ベロシティオーバーライド",
            description:
                "このキーで使用するベロシティで、MIDIベロシティを無視します。変更がない場合は -1 のままにしてください"
        },
        gain: {
            title: "ゲイン",
            description: "このボイスの直線ゲイン。変更がない場合は 1 に設定します。"
        },
        preset: {
            title: "プリセットオーバーライド",
            description: "このキーで使用するプリセット。",
            unchanged: "変更なし"
        },
        apply: {
            title: "適用",
            description: "選択した修飾子を適用"
        }
    },

    removeModification: {
        title: "修正を削除",
        description: "指定されたチャネル上の単一キーから修正を削除",

        remove: {
            title: "削除",
            description: "このキー修飾を削除"
        }
    },

    resetModifications: {
        title: "変更をリセット",
        description: "すべてのチャネルからすべてのキー修正をクリアおよびリセット",

        confirmation: {
            title: "アクションを確認",
            description: "すべての修正を削除してよろしいですか？"
        }
    }
};
