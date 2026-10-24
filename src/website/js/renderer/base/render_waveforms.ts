import { BaseRenderer } from "./renderer.js";
import { rendererModes } from "./renderer_modes.ts";

export const STABILIZE_WAVEFORMS_FFT_MULTIPLIER = 4;

const WAVE_GAIN = 0.7;

/**
 * @param channelNumber
 * @param waveHeight
 * @param waveWidth
 * @param forceStraightLine
 * @param filled filled waveform mode
 */
export function renderSingleWaveform(
    this: BaseRenderer,
    channelNumber: number,
    forceStraightLine: boolean,
    waveWidth: number,
    waveHeight: number,
    filled = false
) {
    const x = channelNumber % 4;
    const y = Math.floor(channelNumber / 4);
    const straightLine = () => {
        if (filled) {
            // No straight line for the filled mode
            return;
        }
        const waveWidth = this.width / 4;
        const waveHeight = this.height / 4;
        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y + waveHeight / 2;
        this.ctx.lineWidth = this.lineThickness;
        this.ctx.strokeStyle = this.colors[channelNumber].plain;
        this.ctx.beginPath();
        this.ctx.moveTo(relativeX, relativeY);
        this.ctx.lineTo(relativeX + waveWidth, relativeY);
        this.ctx.stroke();
    };
    if (forceStraightLine) {
        straightLine();
        return;
    }
    const { waveformLength, waveform } = this.parts[channelNumber];
    const sampleCount = waveformLength;
    let voicesPlaying = false;
    for (let i = 0; i < sampleCount; i++) {
        if (waveform[i] !== 0) {
            voicesPlaying = true;
            break;
        }
    }
    this.voicesPlaying[channelNumber] = voicesPlaying;
    if (!voicesPlaying) {
        // Draw a straight line
        straightLine();
        return;
    }

    const relativeX = waveWidth * x;
    const relativeY = waveHeight * y + waveHeight / 2;
    const multiplier = this.waveMultiplier * WAVE_GAIN * waveHeight;

    // Draw
    this.ctx.lineWidth = this.lineThickness;
    const color = this.colors[channelNumber].plain;
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;

    let triggerPoint;
    let length = sampleCount;
    let renderStart = 0;
    let renderEnd = sampleCount;
    if (this._stabilizeWaveforms) {
        // Fraction length
        length = sampleCount / STABILIZE_WAVEFORMS_FFT_MULTIPLIER;
        if (this.parts[channelNumber].isDrum) {
            length *= 2;
        }
        const halfLength = Math.floor(length / 2);
        triggerPoint = sampleCount - halfLength;
        let max = -Infinity;
        // Multi-pass trigger point detection
        // Pass 1: find the maximum in the last part of the waveform
        // TODO: optimize by using max function on a subarray when available
        const searchStart = Math.max(0, triggerPoint - halfLength);
        for (let i = triggerPoint; i >= searchStart; i--) {
            const value = waveform[i];
            if (value > max) {
                max = value;
            }
        }
        // Pass 2: find the maximum within a tolerance range around the first trigger point
        let bestIndex = triggerPoint;
        triggerPoint = sampleCount - halfLength;
        const maximumTolerance = 0.04; // 4% tolerance for the second pass
        for (let i = triggerPoint; i >= searchStart; i--) {
            const value = waveform[i];
            if (value > max * (1 - maximumTolerance)) {
                bestIndex = i;
                break;
            }
        }
        triggerPoint = bestIndex;
        // Pass 3: find the zero crossing after the trigger point
        const zeroCrossEnd = Math.max(triggerPoint - Math.floor(halfLength), 0);
        let sum = 0;
        for (let i = 0; i < sampleCount; i++) {
            sum += waveform[i];
        }
        const waveformAverage = sum / sampleCount;
        // Look for the average to remove DC offset
        for (let i = triggerPoint; i >= zeroCrossEnd; i--) {
            // Reverse search for zero crossing
            if (waveform[i] <= waveformAverage) {
                // Zero crossing detected
                triggerPoint = i;
                break;
            }
        }
        renderStart = Math.max(0, triggerPoint - halfLength);
        renderEnd = Math.min(triggerPoint + halfLength, sampleCount);
    }

    const dataLength = renderEnd - renderStart;
    const samplesPerPixel = dataLength / waveWidth;

    if (filled) {
        const step = waveWidth / length;
        let xPos = relativeX;
        this.ctx.beginPath();
        this.ctx.moveTo(relativeX, relativeY);
        for (let i = renderStart; i < renderEnd; i++) {
            this.ctx.lineTo(xPos, relativeY + waveform[i] * multiplier);
            xPos += step;
        }
        this.ctx.lineTo(xPos, relativeY);
        this.ctx.fill();
    } else {
        this.ctx.beginPath();
        if (samplesPerPixel >= 2) {
            for (let x = 0; x < waveWidth; x++) {
                const start = Math.floor(x * samplesPerPixel + renderStart);
                const end = Math.min(
                    Math.floor(start + samplesPerPixel),
                    renderEnd
                );

                let min = 1;
                let max = -1;

                for (let i = start; i < end; i++) {
                    const value = waveform[i];
                    if (value < min) {
                        min = value;
                    }
                    if (value > max) {
                        max = value;
                    }
                }

                const yMin = min * multiplier + relativeY;
                const yMax = max * multiplier + relativeY;
                const xFinal = x + relativeX;
                this.ctx.lineTo(xFinal, yMin);
                this.ctx.lineTo(xFinal, yMax);
            }
        } else {
            const step = waveWidth / length;
            let xPos = relativeX;
            for (let i = renderStart; i < renderEnd; i++) {
                this.ctx.lineTo(xPos, relativeY + waveform[i] * multiplier);
                xPos += step;
            }
        }
        this.ctx.stroke();
    }
}

export function renderWaveforms(this: BaseRenderer, forceStraightLine = false) {
    switch (this.rendererMode) {
        default:
        case rendererModes.none: {
            return;
        }

        case rendererModes.filledWaveformsMode:
        case rendererModes.waveformsMode: {
            const waveWidth = this.width / 4;
            const waveHeight = this.height / 4;
            for (let i = 0; i < this.parts.length; i++) {
                if (this.parts[i].efxAssign) {
                    this.drawEFX(i);
                }
                this.renderSingleWaveform(
                    i,
                    forceStraightLine,
                    waveWidth,
                    waveHeight,
                    this.rendererMode === rendererModes.filledWaveformsMode
                );
            }
            return;
        }

        case rendererModes.spectrumSplitMode: {
            this.renderSplitSpectrum();
            return;
        }

        case rendererModes.spectrumSingleMode: {
            this.renderBigSpectrum();
            return;
        }
    }
}
