import { rendererModes } from "./renderer.js";
import { intensityColors } from "./colors.js";

export const STABILIZE_WAVEFORMS_FFT_MULTIPLIER = 4;
const EXPONENTIAL_GAIN = Math.E;
const EXPONENTIAL_AGGRESSIVE = 3;

/**
 * @this {Renderer}
 * @param channelNumber {number}
 * @param waveHeight {number}
 * @param waveWidth {number}
 * @param forceStraightLine {boolean}
 */
export function renderSingleWaveform(channelNumber, forceStraightLine, waveWidth, waveHeight)
{
    const x = channelNumber % 4;
    const y = Math.floor(channelNumber / 4);
    const analyser = this.channelAnalysers[channelNumber];
    const straightLine = () =>
    {
        const waveWidth = this.canvas.width / 4;
        const waveHeight = this.canvas.height / 4;
        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y + waveHeight / 2;
        this.drawingContext.lineWidth = this.lineThickness;
        this.drawingContext.strokeStyle = this.channelColors[channelNumber];
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(relativeX, relativeY);
        this.drawingContext.lineTo(relativeX + waveWidth, relativeY);
        this.drawingContext.stroke();
    };
    if (forceStraightLine)
    {
        straightLine();
        return;
    }
    const waveform = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(waveform);
    let voicesPlaying = waveform.some(v => v !== 0);
    if (!voicesPlaying)
    {
        // draw a straight line
        straightLine();
        return;
    }
    
    const relativeX = waveWidth * x;
    const relativeY = waveHeight * y + waveHeight / 2;
    const multiplier = this.waveMultiplier * waveHeight;
    
    // draw
    this.drawingContext.lineWidth = this.lineThickness;
    this.drawingContext.strokeStyle = this.plainColors[channelNumber];
    this.drawingContext.beginPath();
    if (this._stabilizeWaveforms)
    {
        let length = waveform.length / STABILIZE_WAVEFORMS_FFT_MULTIPLIER;
        const step = waveWidth / length;
        
        // Oscilloscope triggering
        const halfLength = Math.floor(length / 2);
        // start searching from half the length
        let triggerPoint = waveform.length - halfLength;
        for (let i = triggerPoint; i >= 1; i--)
        {
            if (waveform[i - 1] < 0 && waveform[i] >= 0)
            {
                triggerPoint = i;
                break;
            }
        }
        let xPos = relativeX;
        const renderStart = triggerPoint - halfLength;
        const renderEnd = triggerPoint + halfLength;
        for (let i = renderStart; i < renderEnd; i++)
        {
            this.drawingContext.lineTo(
                xPos,
                relativeY + waveform[i] * multiplier
            );
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
                relativeY + waveform[i] * multiplier
            );
            xPos += step;
        }
    }
    
    this.drawingContext.stroke();
}

/**
 * @this {Renderer}
 */
export function renderBigFft()
{
    const analyser = this.bigAnalyser;
    const fftSize = analyser.frequencyBinCount;
    const waveform = new Uint8Array(fftSize);
    const waveHeight = this.canvas.height;
    const waveWidth = this.canvas.width;
    const relativeY = waveHeight;
    analyser.getByteFrequencyData(waveform);
    if (!waveform.some(v => v !== 0))
    {
        return;
    }
    const multiplier = (0.8 + this.waveMultiplier / 10) * -waveHeight;
    const max = this.dynamicGain ? Math.max.apply(undefined, waveform) : 255;
    
    const minNote = this._keyRange.min - 1;
    const noteRange = this._keyRange.max - minNote + 0.5;
    
    let xPos = 0;
    if (this.logarithmicFrequency)
    {
        const maxFrequencyInTable = this.synth.context.sampleRate / 2;
        let lastHeight = -Infinity;
        let lastXpos = 0;
        let width = 0;
        for (let i = 0; i < waveWidth; i++)
        {
            // calculate the MIDI note (from the lowest piano note to the entire MIDI range)
            const midiNote = minNote + i / waveWidth * noteRange;
            const targetFrequency = 440 * Math.pow(2, (midiNote - 69) / 12);
            const fftIndex = Math.floor(targetFrequency / maxFrequencyInTable * fftSize);
            
            if (waveform[fftIndex] === lastHeight && lastHeight > 0)
            {
                xPos += 1;
                width += 1;
                continue;
            }
            lastHeight = waveform[fftIndex];
            const value = lastHeight / max;
            const height = (this.exponentialGain ? Math.pow(value, EXPONENTIAL_AGGRESSIVE) : value);
            const valueRemapped = value * max;
            this.drawingContext.fillStyle = intensityColors[valueRemapped];
            
            this.drawingContext.fillRect(lastXpos, relativeY, width, multiplier * height);
            lastXpos = xPos;
            width = 0;
            xPos += 1;
        }
    }
    else
    {
        const waveLength = waveform.length / 2;
        const step = waveWidth / waveLength;
        for (let i = 0; i < waveLength; i++)
        {
            const value = waveform[i] / max;
            const height = (this.exponentialGain ? Math.pow(value, EXPONENTIAL_AGGRESSIVE) : value);
            const valueRemapped = value * max;
            this.drawingContext.fillStyle = intensityColors[valueRemapped];
            this.drawingContext.fillRect(xPos, relativeY, step, multiplier * height);
            xPos += step;
        }
    }
}

/**
 * @this {Renderer}
 * @param channelNumber {number} -1 means BIG
 * @param waveHeight {number}
 * @param waveWidth {number}
 */
export function renderSingleFft(channelNumber, waveWidth, waveHeight)
{
    let analyser = this.channelAnalysers[channelNumber];
    const fftSize = analyser.frequencyBinCount;
    const waveform = new Uint8Array(fftSize);
    analyser.getByteFrequencyData(waveform);
    if (!waveform.some(v => v !== 0))
    {
        return;
    }
    
    
    let x = channelNumber % 4;
    let y = Math.floor(channelNumber / 4);
    let relativeX = waveWidth * x;
    let relativeY = waveHeight * y + waveHeight;
    const multiplier = (0.8 + this.waveMultiplier / 10) * -waveHeight;
    const max = this.dynamicGain ? Math.max.apply(undefined, waveform) : 255;
    
    // draw
    this.drawingContext.fillStyle = this.gradientColors[channelNumber];
    let xPos = relativeX;
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(xPos, relativeY);
    
    if (this.logarithmicFrequency)
    {
        const minNote = 21;
        const noteRange = 88;
        let lastHeight = -Infinity;
        const maxFrequencyInTable = this.synth.context.sampleRate / 2;
        for (let i = 0; i < waveWidth; i++)
        {
            // calculate the MIDI note (from the lowest piano note to the entire MIDI range)
            const midiNote = minNote + i / waveWidth * noteRange;
            const targetFrequency = 440 * Math.pow(2, (midiNote - 69) / 12);
            const fftIndex = Math.floor(targetFrequency / maxFrequencyInTable * fftSize);
            
            if (waveform[fftIndex] === lastHeight && lastHeight > 0)
            {
                xPos += 1;
                continue;
            }
            lastHeight = waveform[fftIndex];
            const value = lastHeight / max;
            
            // Normalize and apply the exponential curve
            if (this.exponentialGain)
            {
                this.drawingContext.lineTo(xPos, relativeY + Math.pow(value, EXPONENTIAL_GAIN) * multiplier);
            }
            else
            {
                this.drawingContext.lineTo(xPos, relativeY + value * multiplier);
            }
            
            xPos += 1;
        }
    }
    else
    {
        const step = waveWidth / waveform.length;
        for (let i = 0; i < waveform.length; i++)
        {
            const value = waveform[i] / max;
            if (this.exponentialGain)
            {
                this.drawingContext.lineTo(xPos, relativeY + Math.pow(value, EXPONENTIAL_GAIN) * multiplier);
            }
            else
            {
                this.drawingContext.lineTo(xPos, relativeY + value * multiplier);
            }
            xPos += step;
        }
    }
    this.drawingContext.lineTo(relativeX + waveWidth, relativeY);
    this.drawingContext.fill();
}

/**
 * @this {Renderer}
 */
export function renderWaveforms(forceStraightLine = false)
{
    const waveWidth = this.canvas.width / 4;
    const waveHeight = this.canvas.height / 4;
    switch (this.rendererMode)
    {
        default:
            break;
        
        case rendererModes.waveformsMode:
            for (let i = 0; i < this.channelAnalysers.length; i++)
            {
                this.renderSingleWaveform(i, forceStraightLine, waveWidth, waveHeight);
            }
            break;
        
        case rendererModes.spectrumSplitMode:
            for (let i = 0; i < this.channelAnalysers.length; i++)
            {
                this.renderSingleFft(i, waveWidth, waveHeight);
            }
            break;
        
        case rendererModes.spectrumSingleMode:
            this.renderBigFft();
    }
}