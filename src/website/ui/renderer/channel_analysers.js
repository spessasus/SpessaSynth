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
        this.channelAnalysers[i].fftSize = this.synth.channelProperties[i].isDrum ? this._drumAnalyserFft : this._normalAnalyserFft;
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
    synth.eventHandler.addEvent("drumchange", "renderer-drum-change", e => {
        // if this channel is now a drum channel, adjust the fft
        const analyser = this.channelAnalysers[e.channel % this.channelAnalysers.length];
        if (e.isDrumChannel)
        {
            analyser.fftSize = this._drumAnalyserFft;
        }
        else
        {
            analyser.fftSize = this._normalAnalyserFft;
        }
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