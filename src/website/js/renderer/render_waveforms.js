const STABILIZE_WAVEFORMS_LENGTH_DIVIDER = 1.5;

/**
 * @this {Renderer}
 */
export function renderWaveforms()
{
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

        const waveWidth = this.canvas.width / 4;
        const waveHeight = this.canvas.height / 4
        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y + waveHeight / 2;
        const multiplier = this.waveMultiplier * waveHeight;

        // draw
        this.drawingContext.lineWidth = this.lineThickness;
        this.drawingContext.strokeStyle = this.channelColors[channelNumber];
        this.drawingContext.beginPath();
        if(this.stabilizeWaveforms)
        {
            let length = waveform.length / STABILIZE_WAVEFORMS_LENGTH_DIVIDER;
            let triggerPoint = 0;
            if(this.synth.channelProperties[channelNumber].isDrum)
            {
                length /= STABILIZE_WAVEFORMS_LENGTH_DIVIDER;
            }
            // Oscilloscope triggering
            const threshold = 0; // Adjust this if necessary
            for (let i = 1; i < waveform.length; i++) {
                if (waveform[i - 1] < threshold && waveform[i] >= threshold) {
                    triggerPoint = i;
                    break;
                }
            }
            const step = waveWidth / length;

            let xPos = relativeX;
            for (let i = triggerPoint; i < triggerPoint + length; i++) {
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
            for (let i = 0; i < waveform.length; i++) {
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