export const keyboardSettingsLocale = {
    title: "MIDIキーボード設定",

    selectedChannel: {
        title: "選択されたチャネル",
        description: "キーボードがメッセージを送信するチャネル",
        channelOption: "チャンネル{0}"
    },

    keyboardSize: {
        title: "キーボードサイズ",
        description:
            "キーボードに表示されるキーの範囲。MIDIノートサイズをそれに応じて調整します",

        full: "128キー(full)",
        piano: "88キー(piano)",
        fiveOctaves: "5オクターブ",
        useSongKeyRange: "楽曲のキー範囲を使用",
        twoOctaves: "2オクターブ"
    },

    toggleTheme: {
        title: "ダークテーマを使用",
        description: "ダークテーマのMIDIキーボードを使用する"
    },

    show: {
        title: "表示",
        description: "MIDIキーボードの表示/非表示"
    },

    forceMaxVelocity: { // Rock harder to translate, you know?
        title: "最大ベロシティを強制",
        description:
            //"Force full color intensity, regardless of the MIDI note-on velocity"
            "MIDIノートオンのベロシティに関係なく、完全な色の強度を強制します"
    }
};
