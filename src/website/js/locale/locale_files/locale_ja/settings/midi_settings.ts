export const midiSettingsLocale = {
    title: "MIDI設定",

    midiInput: {
        title: "MIDI入力",
        description: "MIDIメッセージをリッスンするポート",
        disabled: "無効"
    },

    midiOutput: {
        title: "MIDI出力",
        description: "MIDIファイルを再生するポート",
        disabled: "SpessaSynthを使用"
    },

    reminder: {
        title: //"Note that you need to RESTART YOUR BROWSER after connecting a new MIDI device for it to show up here.",
        "注意: 新しく接続したMIDIデバイスをここに表示するためには、ブラウザを再起動する必要があります。",
        description:
            //"Also note that Safari does not support WebMIDI, so you will need to use a different browser if you are on Mac."
            "さらに、SafariはWebMIDIをサポートしていないため、Macを使用している場合は別のブラウザを使用する必要があることに注意してください。"
    }
};
