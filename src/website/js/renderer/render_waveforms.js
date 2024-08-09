export const STABILIZE_WAVEFORMS_FFT_MULTIPLIER = 4;

/**
 * @this {Renderer}
 */
export function renderWaveforms()
{
    const waveWidth = this.canvas.width / 4;
    const waveHeight = this.canvas.height / 4
    // draw all 16 channel waveforms in a 4x4 pattern
    this.channelAnalysers.forEach((analyser, channelNumber) => {
        const x = channelNumber % 4;
        const y = Math.floor(channelNumber / 4);
        // if no voices, skip
        let voicesPlaying = false;
        for (let i = channelNumber; i < this.synth.channelProperties.length; i += this.channelAnalysers.length)
        {
            // check every channel that is connected, because can be more outputs than just 16!!! (for example channel 17 also outputs to analyser 1)
            if(this.synth.channelProperties[i].voicesAmount > 0)
            {
                voicesPlaying = true;
                break;
            }
        }
        if(!voicesPlaying)
        {
            // draw a straight line
            const waveWidth = this.canvas.width / 4;
            const waveHeight = this.canvas.height / 4
            const relativeX = waveWidth * x;
            const relativeY = waveHeight * y + waveHeight / 2;
            this.drawingContext.lineWidth = this.lineThickness;
            this.drawingContext.strokeStyle = this.channelColors[channelNumber];
            this.drawingContext.beginPath();
            this.drawingContext.moveTo(relativeX, relativeY);
            this.drawingContext.lineTo(relativeX + waveWidth, relativeY);
            this.drawingContext.stroke();
            return;
        }

        const waveform = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatTimeDomainData(waveform);

        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y + waveHeight / 2;
        const multiplier = this.waveMultiplier * waveHeight;

        // draw
        this.drawingContext.lineWidth = this.lineThickness;
        this.drawingContext.strokeStyle = this.channelColors[channelNumber];
        this.drawingContext.beginPath();
        if(this._stabilizeWaveforms)
        {
            let length = waveform.length / STABILIZE_WAVEFORMS_FFT_MULTIPLIER;
            const step = waveWidth / length;

            // Oscilloscope triggering
            const halfLength = Math.floor(length / 2);
            // start searchin from half the length
            let triggerPoint = waveform.length - halfLength;
            for (let i = triggerPoint; i >= 1; i--)
            {
                if (waveform[i - 1] < 0 && waveform[i] >= 0)
                {
                    triggerPoint = i;
                    break;
                }
            }
            console.log(triggerPoint, waveform.length)
            let xPos = relativeX;
            const renderStart = triggerPoint - halfLength;
            const renderEnd = triggerPoint + halfLength;
            for (let i = renderStart; i < renderEnd; i++)
            {
                this.drawingContext.lineTo(
                    xPos,
                    relativeY + waveform[i] * multiplier);
                xPos += step;
            }
        }
        else
        {
            const step = waveWidth / waveform.length;

            let xPos = relativeX;
            for (let i = 0; i < waveform.length; i++)
            {
                this.drawingContext.lineTo(
                    xPos,
                    relativeY + waveform[i] * multiplier);
                xPos += step;
            }
        }

        this.drawingContext.stroke();
        channelNumber++;
    });
}