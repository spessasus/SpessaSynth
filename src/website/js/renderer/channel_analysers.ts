import { consoleColors } from "../utils/console_colors.js";
import { STABILIZE_WAVEFORMS_FFT_MULTIPLIER } from "./render_waveforms.js";
import { Renderer } from "./renderer.js";

export function updateFftSize(this: Renderer) {
    for (let i = 0; i < this.channelAnalysers.length; i++) {
        const drum = this.synth.channelProperties[i].isDrum;
        const fft = drum ? this._drumAnalyserFft : this._normalAnalyserFft;
        const mul = drum
            ? STABILIZE_WAVEFORMS_FFT_MULTIPLIER / 2
            : STABILIZE_WAVEFORMS_FFT_MULTIPLIER;

        const targetFFT = this._stabilizeWaveforms ? fft * mul : fft;

        this.channelAnalysers[i].fftSize = Math.min(
            32768,
            // Nearest factor of 2
            1 << (31 - Math.clz32(targetFFT * this.sampleRateFactor))
        );
    }
    this.bigAnalyser.fftSize = Math.min(
        32768,
        // Nearest factor of 2
        1 <<
            (31 -
                Math.clz32(
                    this._normalAnalyserFft *
                        STABILIZE_WAVEFORMS_FFT_MULTIPLIER *
                        2 *
                        this.sampleRateFactor
                ))
    );
}

/**
 * Connect the 16 channels to their respective analyzers
 */
export function connectChannelAnalysers(this: Renderer) {
    this.synth.connectIndividualOutputs(this.channelAnalysers);
    this.inputNode.connect(this.bigAnalyser);
    // Connect for drum change
    this.synth.eventHandler.addEvent(
        "drumChange",
        "renderer-drum-change",
        () => {
            setTimeout(this.updateFftSize.bind(this), 100);
        }
    );
}

export function disconnectChannelAnalysers(this: Renderer) {
    this.synth.disconnectIndividualOutputs(this.channelAnalysers);
    this.inputNode.disconnect(this.bigAnalyser);
    console.info("%cAnalysers disconnected!", consoleColors.recognized);
}
