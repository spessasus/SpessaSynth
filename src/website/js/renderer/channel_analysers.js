import { SpessaSynthInfo } from "../../../spessasynth_lib/utils/loggin.js";
import { consoleColors } from "../../../spessasynth_lib/utils/other.js";
import { STABILIZE_WAVEFORMS_FFT_MULTIPLIER } from "./render_waveforms.js";

/**
 * @param synth {Synthetizer}
 * @this {Renderer}
 */
export function createChannelAnalysers(synth)
{
    // disconnect the analysers from earlier
    for (const analyser of this.channelAnalysers)
    {
        analyser.disconnect();
        this.channelAnalysers.splice(0, 1);
    }
    this.channelAnalysers = [];
    for (let i = 0; i < synth.channelsAmount; i++)
    {
        // create the analyser
        const analyser = new AnalyserNode(synth.context, {
            fftSize: this._normalAnalyserFft,
            smoothingTimeConstant: 0.4
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
}

/**
 * Connect the 16 channels to their respective analysers
 * @param synth {Synthetizer}
 * @this {Renderer}
 */
export function connectChannelAnalysers(synth)
{
    synth.connectIndividualOutputs(this.channelAnalysers);
    
    
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
    for (const channelAnalyser of this.channelAnalysers)
    {
        channelAnalyser.disconnect();
    }
    SpessaSynthInfo("%cAnalysers disconnected!", consoleColors.recognized);
}