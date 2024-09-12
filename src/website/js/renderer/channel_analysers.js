import { SpessaSynthInfo } from '../../../spessasynth_lib/utils/loggin.js'
import { consoleColors } from '../../../spessasynth_lib/utils/other.js'
import { STABILIZE_WAVEFORMS_FFT_MULTIPLIER } from './render_waveforms.js'

/**
 * @param synth {Synthetizer}
 * @this {Renderer}
 */
export function createChannelAnalysers(synth)
{
    // disconnect the analysers from earlier
    for(const analyser of this.channelAnalysers)
    {
        analyser.disconnect();
        this.channelAnalysers.splice(0, 1);
    }
    this.channelAnalysers = [];
    for(let i = 0; i < synth.channelsAmount; i++)
    {
        // create the analyser
        const analyser = new AnalyserNode(synth.context, {
            fftSize: this._normalAnalyserFft,
            smoothingTimeConstant: 0.4
        });
        this.channelAnalysers.push(analyser);
    }

    synth.eventHandler.addEvent("mutechannel", "renderer-mute-channel", eventData => {
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
        const fftSize = Math.min(32768, this._stabilizeWaveforms ? fft * mul : fft);
        this.channelAnalysers[i].fftSize = fftSize;
        if(!drum)
        {
            // calculate delay:
            // 16384 fft size = 0.1 s
            if(fftSize > 4096)
            {
                this.delayNode.delayTime.value = fftSize / this.synth.context.sampleRate / 2;
            }
            else
            {
                this.delayNode.delayTime.value = 0;
                console.log('no')
            }
        }
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
    synth.eventHandler.addEvent("drumchange", "renderer-drum-change", () => {
        this.updateFftSize();
    });
}

/**
 * @this {Renderer}
 */
export function disconnectChannelAnalysers()
{
    for (const channelAnalyser of this.channelAnalysers) {
        channelAnalyser.disconnect();
    }
    SpessaSynthInfo("%cAnalysers disconnected!", consoleColors.recognized);
}