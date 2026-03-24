export const rendererSettingsLocale = {
    title: "レンダラー設定",

    mode: {
        title: "ビジュアライゼーションモード",
        description: "チャンネルのビジュアライゼーションモードを変更",
        waveforms: "波形",
        spectrumSplit: "スペクトル(分割)",
        spectrum: "スペクトル",
        filledWaveforms: "波形(塗りつぶし)"
    },

    noteFallingTime: {
        title: "ノートの落下時間 (ミリ秒)",
        description: //"How fast the notes fall (visually)"
            "ノートの落下速度(視覚的)"
    },

    noteAfterTriggerTime: {
        title: "トリガー後のノート時間 (ミリ秒)",
        description:
            //"How long the notes fall after they get triggered. Zero means that they trigger at the bottom"
            "ノートがトリガーされた後の落下時間。ゼロは、ノートが底でトリガーされることを意味します"
    },

    waveformThickness: {
        title: "波形の線の太さ (px)",
        description: "波形の線の太さ"
    },

    waveformSampleSize: {
        title: "サンプルサイズ",
        description:
            //"How detailed the visualizations are (Note: high values might impact performance). Also note that high values will add a delay to the audio to sync the waveforms with the audio"
            "ビジュアライゼーションの詳細度 (注: 高い値はパフォーマンスに影響を与える可能性があります)。" + 
            "また、高い値は、波形をオーディオと同期させるためにオーディオに遅延を追加することに注意してください"
    },

    waveformAmplifier: {
        title: "波形の振幅",
        description: "ビジュアライゼーションの鮮明さ"
    },

    toggleExponentialGain: {
        title: "指数ゲインを有効にする",
        description:
            "高さの計算に線形ではなく指数曲線を使用して、ゲインの違いをより視覚的にする"
    },

    toggleDynamicGain: {
        title: "ダイナミックゲインを有効にする",
        description:
            //"Adjust the gain automatically so the highest point always touches the ceiling of the display"
            "ゲインを自動的に調整して、最高点が常にディスプレイの天井に触れるようにします"
    },

    toggleLogarithmicFrequency: {
        title: "対数周波数を有効にする",
        description:
            "周波数分布を線形ではなく対数的に広げます。(推奨)"
    },

    toggleWaveformsRendering: {
        title: "波形の描画を有効にする",
        description:
            "チャンネルの波形を描画する (音声を示すカラフルな線)"
    },

    toggleNotesRendering: {
        title: "ノートの描画を有効にする",
        description:
            "MIDIファイルを再生する際の落下ノートの描画を有効にする"
    },

    toggleDrawingActiveNotes: {
        title: "アクティブノートの描画を有効にする",
        description:
            "ノートが押されたときに光り、輝くようにする"
    },

    toggleDrawingVisualPitch: {
        title: "視覚的なピッチの描画を有効にする",
        description:
            "ピッチベンドが適用されたときにノートが左右にスライドするようにする"
    },

    toggleRenderingDotDisplay: {
        title: "ドットディスプレイの描画を有効にする",
        description: "GS/XGのドットディスプレイメッセージの描画を有効にする"
    },

    toggleStabilizeWaveforms: {
        title: "波形の安定化を有効にする",
        description: "オシロスコープのトリガーを有効にする"
    }
};
