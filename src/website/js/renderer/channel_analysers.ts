import { consoleColors } from "../utils/console_colors.js";
import { STABILIZE_WAVEFORMS_FFT_MULTIPLIER } from "./render_waveforms.js";
import { Renderer } from "./renderer.js";

export function updateFftSize(this: Renderer) {
    for (const channelAnalyser of this.channelAnalysers) {
        const fft = this._analyserFftSize;
        const targetFFT = this._stabilizeWaveforms
            ? fft * STABILIZE_WAVEFORMS_FFT_MULTIPLIER
            : fft;

        channelAnalyser.fftSize = Math.min(
            32_768,
            // Nearest factor of 2
            1 << (31 - Math.clz32(targetFFT * this.sampleRateFactor))
        );
    }
    this.bigAnalyser.fftSize = Math.min(
        32_768,
        // Nearest factor of 2
        1 <<
            (31 -
                Math.clz32(
                    this._analyserFftSize *
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
}

export function disconnectChannelAnalysers(this: Renderer) {
    this.synth.disconnectIndividualOutputs(this.channelAnalysers);
    this.inputNode.disconnect(this.bigAnalyser);
    console.info("%cAnalysers disconnected!", consoleColors.recognized);
}
