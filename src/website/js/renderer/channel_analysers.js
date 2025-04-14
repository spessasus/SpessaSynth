import { consoleColors } from "../utils/console_colors.js";
import { Synthetizer } from "spessasynth_lib";
import { STABILIZE_WAVEFORMS_FFT_MULTIPLIER } from "./render_waveforms.js";
import { ANALYSER_SMOOTHING } from "./renderer.js";

/**
 * @param synth {Synthetizer}
 * @this {Renderer}
 */
export function createChannelAnalysers(synth)
{
    this.bigAnalyser.disconnect();
    // disconnect the analyzers from earlier
    for (const analyser of this.channelAnalysers)
    {
        analyser.disconnect();
        this.channelAnalysers.splice(0, 1);
    }
    this.channelAnalysers = [];
    for (let i = 0; i < synth.channelsAmount; i++)
    {
        // create the analyzer
        const analyser = new AnalyserNode(synth.context, {
            fftSize: this._normalAnalyserFft,
            smoothingTimeConstant: ANALYSER_SMOOTHING
        });
        this.channelAnalysers.push(analyser);
    }
    
    synth.eventHandler.addEvent("mutechannel", "renderer-mute-channel", eventData =>
    {
        this.renderChannels[eventData.channel] = !eventData.isMuted;
    });
    this.updateFftSize();
}

/**
 * @this {Renderer}
 */
export function updateFftSize()
{
    for (let i = 0; i < this.channelAnalysers.length; i++)
    {
        const drum = this.synth.channelProperties[i].isDrum;
        const fft = drum ? this._drumAnalyserFft : this._normalAnalyserFft;
        const mul = drum ? STABILIZE_WAVEFORMS_FFT_MULTIPLIER / 2 : STABILIZE_WAVEFORMS_FFT_MULTIPLIER;
        this.channelAnalysers[i].fftSize = Math.min(32768, this._stabilizeWaveforms ? fft * mul : fft);
    }
    this.bigAnalyser.fftSize = Math.min(32768, this._normalAnalyserFft * STABILIZE_WAVEFORMS_FFT_MULTIPLIER * 2);
}

/**
 * Connect the 16 channels to their respective analyzers
 * @param synth {Synthetizer}
 * @this {Renderer}
 */
export function connectChannelAnalysers(synth)
{
    synth.connectIndividualOutputs(this.channelAnalysers);
    synth.targetNode.connect(this.bigAnalyser);
    // connect for drum change
    synth.eventHandler.addEvent("drumchange", "renderer-drum-change", () =>
    {
        setTimeout(this.updateFftSize.bind(this), 100);
    });
}

/**
 * @this {Renderer}
 */
export function disconnectChannelAnalysers()
{
    this.synth.disconnectIndividualOutputs(this.channelAnalysers);
    this.bigAnalyser.disconnect();
    console.info("%cAnalysers disconnected!", consoleColors.recognized);
}