/*!
 * The oscilloscope trigger below is a modified TypeScript port of the
 * CorrelationTrigger from corrscope (https://github.com/corrscope/corrscope),
 * distributed under the following license:
 *
 * BSD 2-Clause License
 *
 * Copyright (c) 2018-2020+, nyanpasu64
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Please note that this is an LLM port. I did not write it but i did read it.
 *
 * A correlation-based oscilloscope trigger, adapted from corrscope.
 *
 * Every frame, the trigger slides a kernel across the waveform and picks the
 * position where the kernel matches best. The kernel is the sum of two parts:
 * - The slope finder, a step function that favors rising edges.
 * - The correlation buffer, a smoothed history of the previously triggered
 *   waveforms, which keeps the displayed shape in the same place across frames.
 *
 * The search is done on a subsampled copy of the waveform to keep the cost low.
 * The result is then refined to a rising zero crossing at full resolution,
 * and the buffer is updated with the waveform around that point.
 */

/**
 * The target length of the subsampled kernel.
 */
const KERNEL_TARGET_LENGTH = 128;
/**
 * The strength of the slope finder. Competes against the buffer strength.
 */
const EDGE_STRENGTH = 1;
/**
 * The strength of the correlation buffer. Competes against the edge strength.
 */
const BUFFER_STRENGTH = 1;
/**
 * How much the buffer is updated after each frame, from 0 to 1.
 */
const RESPONSIVENESS = 0.5;
/**
 * The standard deviation of the slope finder window, in periods.
 */
const SLOPE_WIDTH = 0.25;
/**
 * The standard deviation of the buffer window, in periods.
 */
const BUFFER_FALLOFF = 0.5;
/**
 * How far back the trigger can move from the newest position, in periods.
 */
const SEARCH_PERIODS = 1.5;
/**
 * The minimum pitch change that recalculates the slope finder and rescales the buffer.
 */
const RECALC_SEMITONES = 1;
/**
 * Amplitudes below this are considered silent when normalizing.
 */
const MIN_AMPLITUDE = 0.01;
/**
 * Kernel values below this fraction of the kernel peak are skipped in the correlation.
 */
const KERNEL_CUTOFF = 0.001;
/**
 * The minimum normalized autocorrelation at the last period to keep tracking it
 * Without a full period search.
 */
const PERIOD_TRACKING_THRESHOLD = 0.9;
/**
 * The resolution of the coarse correlation search, in steps per period.
 */
const COARSE_STEPS_PER_PERIOD = 16;
/**
 * Long-period autocorrelation compensation, counteracting the shrinking overlap.
 */
const EDGE_COMPENSATION = 0.9;
const MAX_AMPLIFICATION = 2;

function gaussian(x: number, std: number) {
    return Math.exp(-0.5 * (x / std) ** 2);
}

function normalize(data: Float32Array) {
    let peak = 0;
    for (const value of data) {
        const abs = Math.abs(value);
        if (abs > peak) {
            peak = abs;
        }
    }
    const scale = 1 / Math.max(peak, MIN_AMPLITUDE);
    for (let i = 0; i < data.length; i++) {
        data[i] *= scale;
    }
}

/**
 * Computes the dot product of a slice of a and the start of b.
 * Unrolled with independent sums so the multiplications can run in parallel.
 */
function dot(a: Float32Array, aStart: number, b: Float32Array, length: number) {
    let sum0 = 0;
    let sum1 = 0;
    let sum2 = 0;
    let sum3 = 0;
    let i = 0;
    for (; i + 3 < length; i += 4) {
        const index = aStart + i;
        sum0 += a[index] * b[i];
        sum1 += a[index + 1] * b[i + 1];
        sum2 += a[index + 2] * b[i + 2];
        sum3 += a[index + 3] * b[i + 3];
    }
    for (; i < length; i++) {
        sum0 += a[aStart + i] * b[i];
    }
    return sum0 + sum1 + sum2 + sum3;
}

export class WaveformTrigger {
    /**
     * Half of the kernel length, in subsamples.
     */
    private halfKernel = 0;
    /**
     * Full samples per subsample.
     */
    private stride = 0;
    /**
     * The correlation buffer, a history of the aligned waveforms.
     */
    private buffer = new Float32Array(0);
    /**
     * The step function that favors rising edges.
     */
    private slopeFinder = new Float32Array(0);
    /**
     * The slope finder and the buffer combined, correlated with the data.
     */
    private kernel = new Float32Array(0);
    /**
     * The window that tapers the buffer away from the trigger point.
     */
    private bufferWindow = new Float32Array(0);
    /**
     * The period the buffer window was computed for, in subsamples.
     */
    private bufferWindowPeriod = -1;
    /**
     * The subsampled waveform being searched.
     */
    private data = new Float32Array(0);
    /**
     * Scratch space for autocorrelation, correlation and buffer rescaling.
     */
    private scratch = new Float32Array(0);
    /**
     * The period the slope finder was computed for, in subsamples. Zero if unknown.
     */
    private slopePeriod = 0;
    private hasSlopeFinder = false;
    /**
     * The last estimated period, in subsamples. Zero if unknown.
     */
    private period = 0;

    /**
     * Forgets the waveform history.
     */
    public reset() {
        this.buffer.fill(0);
        this.period = 0;
        this.slopePeriod = 0;
        this.hasSlopeFinder = false;
    }

    /**
     * Finds the trigger point for a waveform.
     * @param waveform The waveform, with the newest sample at the end.
     * @param sampleCount The number of valid samples in the waveform.
     * @param windowLength The number of samples that will be displayed.
     * @returns The fractional sample index that the displayed window should be centered on.
     */
    public findTrigger(
        waveform: Float32Array,
        sampleCount: number,
        windowLength: number
    ) {
        const halfWindow = Math.floor(windowLength / 2);
        // The newest possible trigger, the window then ends at the last sample
        const newest = sampleCount - halfWindow;
        const stride = Math.max(
            1,
            Math.round(windowLength / KERNEL_TARGET_LENGTH)
        );
        const halfKernel = Math.floor(halfWindow / stride);
        if (halfKernel < 2) {
            return newest;
        }
        if (halfKernel !== this.halfKernel || stride !== this.stride) {
            this.allocate(halfKernel, stride);
        }
        const kernelLength = halfKernel * 2;

        // The furthest offset the kernel can slide back without leaving the waveform
        const maxOffset = Math.min(
            kernelLength,
            Math.floor((newest - halfKernel * stride) / stride)
        );
        if (maxOffset < 2) {
            return newest;
        }
        const dataLength = maxOffset + kernelLength;
        const dataStart = newest - (maxOffset + halfKernel) * stride;

        // Subsample the waveform, then remove the DC offset
        const data = this.data;
        const inverseStride = 1 / stride;
        let mean = 0;
        let sampleIndex = dataStart;
        for (let i = 0; i < dataLength; i++) {
            const blockEnd = sampleIndex + stride;
            let sum = 0;
            for (; sampleIndex < blockEnd; sampleIndex++) {
                sum += waveform[sampleIndex];
            }
            data[i] = sum * inverseStride;
            mean += sum;
        }
        mean *= inverseStride / dataLength;
        for (let i = 0; i < dataLength; i++) {
            data[i] -= mean;
        }

        const period = this.estimatePeriod(dataLength - kernelLength);
        this.updateSlopeFinder(period);

        // Slide the kernel over the allowed range, newest position is at maxOffset
        // Without a period there is nothing to align, so a shorter search is enough
        const searchLength =
            period > 0
                ? Math.min(
                      maxOffset,
                      Math.max(2, Math.ceil(period * SEARCH_PERIODS))
                  )
                : Math.max(2, Math.floor(maxOffset / 2));
        const corr = this.scratch;
        const kernel = this.kernel;
        let kernelPeak = 0;
        for (let i = 0; i < kernelLength; i++) {
            kernel[i] = this.slopeFinder[i] + this.buffer[i] * BUFFER_STRENGTH;
            kernelPeak = Math.max(kernelPeak, Math.abs(kernel[i]));
        }
        // Both parts of the kernel are tapered by gaussian windows,
        // So only correlate the part that is not negligible
        const threshold = kernelPeak * KERNEL_CUTOFF;
        let kernelStart = 0;
        while (
            kernelStart < halfKernel &&
            Math.abs(kernel[kernelStart]) <= threshold &&
            Math.abs(kernel[kernelLength - 1 - kernelStart]) <= threshold
        ) {
            kernelStart++;
        }
        const supportLength = kernelLength - kernelStart * 2;
        const support = kernel.subarray(
            kernelStart,
            kernelStart + supportLength
        );
        const correlate = (offset: number) =>
            dot(data, offset + kernelStart, support, supportLength);

        // The correlation of a long period is smooth, so search a coarse grid first
        const step = Math.max(1, Math.floor(period / COARSE_STEPS_PER_PERIOD));
        // Align the grid to the newest position
        const gridStart = maxOffset - Math.floor(searchLength / step) * step;
        for (let offset = gridStart; offset <= maxOffset; offset += step) {
            corr[offset] = correlate(offset);
        }

        // Only local maxima are allowed. The edges of the range score high
        // When the real peak is just outside, but they are not real alignments.
        let bestOffset = maxOffset;
        let bestScore = -Infinity;
        for (
            let offset = gridStart + step;
            offset < maxOffset;
            offset += step
        ) {
            const score = corr[offset];
            if (
                score > bestScore &&
                score >= corr[offset - step] &&
                score >= corr[offset + step]
            ) {
                bestScore = score;
                bestOffset = offset;
            }
        }

        // Then refine between the neighboring grid points
        if (step > 1 && bestScore !== -Infinity) {
            const center = bestOffset;
            for (
                let offset = center - step + 1;
                offset < center + step;
                offset++
            ) {
                if (offset === center) {
                    continue;
                }
                const score = correlate(offset);
                if (score > bestScore) {
                    bestScore = score;
                    bestOffset = offset;
                }
            }
        }

        // Refine to the rising zero crossing at full resolution.
        // The edge score is flat along a ramp, so walk to the crossing of the ramp
        // Instead of picking the nearest one.
        const coarse = dataStart + (bestOffset + halfKernel) * stride;
        const radius = period > 0 ? period * stride : stride * 4;
        const low = Math.max(1, coarse - radius);
        const high = Math.min(sampleCount - 1, coarse + radius);
        let index = coarse;
        if (waveform[index] < mean) {
            while (index < high && waveform[index] < mean) {
                index++;
            }
        } else {
            while (index > low && waveform[index - 1] >= mean) {
                index--;
            }
        }
        let trigger = coarse;
        const previous = waveform[index - 1] - mean;
        const current = waveform[index] - mean;
        if (previous < 0 && current >= 0) {
            trigger = index - 1 + previous / (previous - current);
        }
        trigger = Math.max(halfWindow, Math.min(newest, trigger));

        // The subsampled data around the trigger point updates the buffer
        const triggerOffset = Math.round(
            (trigger - dataStart) / stride - halfKernel
        );
        this.updateBuffer(
            Math.max(0, Math.min(maxOffset, triggerOffset)),
            period
        );
        return trigger;
    }

    private allocate(halfKernel: number, stride: number) {
        this.halfKernel = halfKernel;
        this.stride = stride;
        const kernelLength = halfKernel * 2;
        this.buffer = new Float32Array(kernelLength);
        this.slopeFinder = new Float32Array(kernelLength);
        this.kernel = new Float32Array(kernelLength);
        this.bufferWindow = new Float32Array(kernelLength);
        this.bufferWindowPeriod = -1;
        this.period = 0;
        // The kernel can slide back by up to one kernel length
        this.data = new Float32Array(kernelLength * 2);
        this.scratch = new Float32Array(kernelLength * 2);
        this.slopePeriod = 0;
        this.hasSlopeFinder = false;
    }

    /**
     * Estimates the period of the newest kernel length of data.
     * A steady pitch is tracked cheaply, the full search only runs when it changes.
     * @param start The start of the analyzed data.
     * @returns The period in subsamples, or zero if unknown.
     */
    private estimatePeriod(start: number) {
        const length = this.halfKernel * 2;
        const analyzed = this.data.subarray(start, start + length);
        const previous = this.period;
        if (previous > 1 && previous < length - 1) {
            // Check if the signal still repeats around the last period
            const energy = dot(analyzed, 0, analyzed, length);
            let bestLag = 0;
            let bestSimilarity = PERIOD_TRACKING_THRESHOLD;
            for (let lag = previous - 1; lag <= previous + 1; lag++) {
                const overlap = length - lag;
                // Normalize by the overlap so long periods are not penalized
                const similarity =
                    (dot(analyzed, lag, analyzed, overlap) * length) /
                    (energy * overlap);
                if (similarity >= bestSimilarity) {
                    bestSimilarity = similarity;
                    bestLag = lag;
                }
            }
            if (bestLag !== 0) {
                this.period = bestLag;
                return bestLag;
            }
        }
        this.period = this.autocorrelatePeriod(analyzed);
        return this.period;
    }

    /**
     * Estimates the period with a full autocorrelation.
     * @param analyzed The data to analyze.
     * @returns The period in subsamples, or zero if unknown.
     */
    private autocorrelatePeriod(analyzed: Float32Array) {
        const length = analyzed.length;
        const corr = this.scratch;
        for (let lag = 0; lag < length; lag++) {
            corr[lag] = dot(analyzed, lag, analyzed, length - lag);
        }
        // Skip the central peak, up to the first negative correlation
        let firstNegative = 0;
        while (firstNegative < length && corr[firstNegative] >= 0) {
            firstNegative++;
        }
        if (firstNegative >= length) {
            return 0;
        }
        let peak = firstNegative;
        for (let lag = firstNegative; lag < length; lag++) {
            if (corr[lag] > corr[peak]) {
                peak = lag;
            }
        }
        if (peak <= 0.1 * length) {
            return peak;
        }
        // A long period with strong harmonics has its true peak attenuated
        // Below the harmonic peaks, as the overlap gets smaller
        const compensated = (lag: number) =>
            corr[lag] /
            Math.max(
                1 - (EDGE_COMPENSATION * lag) / length,
                1 / MAX_AMPLIFICATION
            );
        let bestScore = compensated(peak);
        for (let lag = firstNegative; lag < length; lag++) {
            const score = compensated(lag);
            if (score > bestScore) {
                bestScore = score;
                peak = lag;
            }
        }
        return peak;
    }

    /**
     * Recomputes the slope finder and rescales the buffer when the pitch changes.
     * @param period The current period in subsamples, zero if unknown.
     */
    private updateSlopeFinder(period: number) {
        const previous = this.slopePeriod;
        if (this.hasSlopeFinder) {
            if (period === 0) {
                return;
            }
            if (
                previous !== 0 &&
                Math.abs(12 * Math.log2(period / previous)) <= RECALC_SEMITONES
            ) {
                return;
            }
        }
        const halfKernel = this.halfKernel;
        const kernelLength = halfKernel * 2;
        const center = (kernelLength - 1) / 2;
        const width = Math.min(
            Math.max(SLOPE_WIDTH * period, 1),
            halfKernel / 3
        );
        for (let i = 0; i < kernelLength; i++) {
            this.slopeFinder[i] =
                (i < halfKernel ? -EDGE_STRENGTH : EDGE_STRENGTH) *
                gaussian(i - center, width);
        }

        // Stretch the buffer so its pitch matches the new one
        if (previous !== 0 && period !== 0) {
            const ratio = previous / period;
            const scratch = this.scratch;
            const buffer = this.buffer;
            for (let i = 0; i < kernelLength; i++) {
                const position = (i - center) * ratio + center;
                const index = Math.floor(position);
                if (index < 0 || index + 1 >= kernelLength) {
                    scratch[i] = 0;
                    continue;
                }
                const fraction = position - index;
                scratch[i] =
                    buffer[index] * (1 - fraction) +
                    buffer[index + 1] * fraction;
            }
            buffer.set(scratch.subarray(0, kernelLength));
        }
        this.slopePeriod = period;
        this.hasSlopeFinder = true;
    }

    /**
     * Blends the data around the trigger point into the correlation buffer.
     * @param offset The kernel offset in data that is centered on the trigger point.
     * @param period The current period in subsamples, zero if unknown.
     */
    private updateBuffer(offset: number, period: number) {
        const kernelLength = this.halfKernel * 2;
        const aligned = this.scratch.subarray(0, kernelLength);
        aligned.set(this.data.subarray(offset, offset + kernelLength));
        let mean = 0;
        for (const value of aligned) {
            mean += value;
        }
        mean /= kernelLength;
        for (let i = 0; i < kernelLength; i++) {
            aligned[i] -= mean;
        }
        normalize(aligned);
        // Taper away from the trigger point, an unknown period fades the buffer out
        const window = this.bufferWindow;
        if (period !== this.bufferWindowPeriod) {
            const center = (kernelLength - 1) / 2;
            const std = period * BUFFER_FALLOFF;
            for (let i = 0; i < kernelLength; i++) {
                window[i] = std > 0 ? gaussian(i - center, std) : 0;
            }
            this.bufferWindowPeriod = period;
        }
        for (let i = 0; i < kernelLength; i++) {
            aligned[i] *= window[i];
        }

        const buffer = this.buffer;
        normalize(buffer);
        for (let i = 0; i < kernelLength; i++) {
            buffer[i] += (aligned[i] - buffer[i]) * RESPONSIVENESS;
        }
    }
}
