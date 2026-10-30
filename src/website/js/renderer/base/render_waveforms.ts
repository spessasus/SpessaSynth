import { BaseRenderer } from "./renderer.js";
import { rendererModes } from "./renderer_modes.ts";

export const STABILIZE_WAVEFORMS_FFT_MULTIPLIER = 4;

const WAVE_GAIN = 0.7;

// Tuned like corrscope kinda
export function calculateGridDimensions(count: number): [number, number] {
    if (count <= 0) {
        return [4, 4];
    }

    // Sqrt = NxN
    const sqrt = Math.round(Math.sqrt(count));
    if (sqrt * sqrt === count) {
        return [sqrt, sqrt];
    }

    const maxRows = Math.ceil(Math.sqrt(count)) + 1;
    const cols = Math.ceil(count / maxRows);
    const rows = Math.ceil(count / cols);
    return [cols, rows];
}

/**
 * @param channelNumber
 * @param relativeX
 * @param relativeY
 * @param cellWidth
 * @param cellHeight
 * @param forceStraightLine
 * @param filled filled waveform mode
 */
export function renderSingleWaveform(
    this: BaseRenderer,
    channelNumber: number,
    relativeX: number,
    relativeY: number,
    cellWidth: number,
    cellHeight: number,
    forceStraightLine: boolean,
    filled: boolean
) {
    const straightLine = () => {
        if (filled) {
            // No straight line for the filled mode
            return;
        }
        const centerY = relativeY + cellHeight / 2;
        this.ctx.lineWidth = this.lineThickness;
        this.ctx.strokeStyle = this.colors[channelNumber].plain;
        this.ctx.beginPath();
        this.ctx.moveTo(relativeX, centerY);
        this.ctx.lineTo(relativeX + cellWidth, centerY);
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
        // The next sound does not have to look like the last one
        this.waveformTriggers[channelNumber].reset();
        // Draw a straight line
        straightLine();
        return;
    }

    const centerY = relativeY + cellHeight / 2;
    const multiplier = this.waveMultiplier * WAVE_GAIN * cellHeight;

    // Draw
    this.ctx.lineWidth = this.lineThickness;
    const color = this.colors[channelNumber].plain;
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;

    let length = sampleCount;
    // The fractional sample index drawn at the left edge
    let windowStart = 0;
    let renderStart = 0;
    let renderEnd = sampleCount;
    if (this._stabilizeWaveforms) {
        // Fraction length
        length = sampleCount / STABILIZE_WAVEFORMS_FFT_MULTIPLIER;
        if (this.parts[channelNumber].isDrum) {
            length *= 2;
        }
        const triggerPoint = this.waveformTriggers[channelNumber].findTrigger(
            waveform,
            sampleCount,
            length
        );
        windowStart = triggerPoint - Math.floor(length / 2);
        renderStart = Math.max(0, Math.floor(windowStart));
        renderEnd = Math.min(Math.ceil(windowStart + length), sampleCount);
    }

    const dataLength = renderEnd - renderStart;
    const samplesPerPixel = dataLength / cellWidth;
    const step = cellWidth / length;

    const strokeChunk = filled ? Infinity : this.waveformStrokeChunk;
    let points = 0;
    const lineTo = (x: number, y: number) => {
        this.ctx.lineTo(x, y);
        if (++points >= strokeChunk) {
            // Restart the stroke at this point
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            points = 0;
        }
    };

    this.ctx.beginPath();
    if (filled) {
        this.ctx.moveTo(relativeX, centerY);
    }
    if (samplesPerPixel >= 2) {
        // Draw the lowest and the highest sample of every pixel column,
        // In their original order and position, so the line looks like
        // The full-resolution one at a fraction of the cost.
        // Adding the first and last samples of the column would look even closer,
        // But it makes Firefox drop canvas acceleration.
        let i = renderStart;
        while (i < renderEnd) {
            const column = Math.floor((i - windowStart) * step);
            let minIndex = i;
            let maxIndex = i;
            i++;
            while (
                i < renderEnd &&
                Math.floor((i - windowStart) * step) === column
            ) {
                const value = waveform[i];
                if (value < waveform[minIndex]) {
                    minIndex = i;
                } else if (value > waveform[maxIndex]) {
                    maxIndex = i;
                }
                i++;
            }
            const first = Math.min(minIndex, maxIndex);
            const second = Math.max(minIndex, maxIndex);
            lineTo(
                relativeX + (first - windowStart) * step,
                centerY + waveform[first] * multiplier
            );
            if (second !== first) {
                lineTo(
                    relativeX + (second - windowStart) * step,
                    centerY + waveform[second] * multiplier
                );
            }
        }
    } else {
        let xPos = relativeX + (renderStart - windowStart) * step;
        for (let i = renderStart; i < renderEnd; i++) {
            lineTo(xPos, centerY + waveform[i] * multiplier);
            xPos += step;
        }
    }
    if (filled) {
        this.ctx.lineTo(relativeX + (renderEnd - windowStart) * step, centerY);
        this.ctx.fill();
    } else {
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
            const { channels, columns, rows } = this.getWaveformGrid();
            const cellHeight = this.height / rows;
            const filled =
                this.rendererMode === rendererModes.filledWaveformsMode;

            const channelCount = channels.length;
            for (let gridIdx = 0; gridIdx < channelCount; gridIdx++) {
                const channel = channels[gridIdx];
                const row = Math.floor(gridIdx / columns);
                const globalRowStart = row * columns;
                const globalRowEnd = Math.min(
                    (row + 1) * columns,
                    channelCount
                );
                const itemsInRow = globalRowEnd - globalRowStart;
                // The actual width per cell in this row (stretch to fill)
                const cellWidth = this.width / itemsInRow;
                // Position within the row
                const colInRow = gridIdx - globalRowStart;
                const relativeX = colInRow * cellWidth;
                const relativeY = row * cellHeight;

                if (
                    this.parts[channel].efxAssign ||
                    this.parts[channel].xgInsertion
                ) {
                    this.drawEFX(channel);
                }
                this.renderSingleWaveform(
                    channel,
                    relativeX,
                    relativeY,
                    cellWidth,
                    cellHeight,
                    forceStraightLine,
                    filled
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
