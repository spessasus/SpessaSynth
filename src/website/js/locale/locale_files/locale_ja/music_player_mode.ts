/**
 * Locale for music player mode
 * @type {{nothingPlaying: string, currentlyPlaying: string, nothingPlayingCopyright: string, toggleButton: {description: string, title: string}}}
 */
export const musicPlayerModeLocale = {
    toggleButton: {
        title: "ミュージックプレイヤーのモード変更",
        description:
            //"Toggle the simplified UI version, hiding the keyboard and note visualizations"
            "シンプルなUIバージョンの切り替え。キーボードとノートの視覚化を非表示にします。"
    },
    currentlyPlaying: "再生中:",
    nothingPlaying: "何も再生されていません。",
    nothingPlayingCopyright: "MIDIファイルをアップロードしてください。"
};
