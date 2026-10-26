import { ANALYSER_SMOOTHING, BaseRenderer } from "../base/renderer.ts";
import type { Synthesizer } from "../../utils/synthesizer.ts";
import type { Sequencer } from "spessasynth_lib";
import type { LocaleManager } from "../../manager/locale_manager.ts";
import { STABILIZE_WAVEFORMS_FFT_MULTIPLIER } from "../base/render_waveforms.ts";
import { consoleColors } from "../../utils/console_colors.ts";
import { type RendererMode, rendererModes } from "../base/renderer_modes.ts";
import { intensityColors } from "../base/colors.ts";
import { LiveKeyboard } from "../../canvas_keyboard/live/live_keyboard.ts";

const CHANNEL_ANALYSER_FFT = 1024;
const EXPONENTIAL_GAIN = Math.E;
const EXPONENTIAL_AGGRESSIVE = 3;

// Duration of key range change transition animation in seconds
const RANGE_TRANSITION_SECONDS = 0.5;

function easeOut(progress: number) {
    return 1 - Math.pow(1 - progress, 4);
}

/**
 * Live version of the renderer, used on a regular canvas
 */
export class LiveRenderer extends BaseRenderer<LiveKeyboard> {
    /**
     * Called after a frame is rendered
     */
    public onRender?: () => unknown;

    /**
     * The current background image, if any. Used by the video export.
     */
    public backgroundImage?: Blob;
    public readonly canvas: HTMLCanvasElement;
    protected synth: Synthesizer;
    protected seq: Sequencer;
    protected readonly channelAnalysers: AnalyserNode[] = [];
    protected bigAnalyser: AnalyserNode;
    protected readonly inputNode: AudioNode;
    private hasRenderedNoVoices = false;
    private backgroundURL?: string;
    private readonly sampleRateFactor;

    private rangeTransition?: {
        startTime: number;
        from: { min: number; max: number };
        to: { min: number; max: number };
    };

    public constructor(
        channelColors: string[],
        synth: Synthesizer,
        seq: Sequencer,
        inputNode: AudioNode,
        canvas: HTMLCanvasElement,
        locale: LocaleManager,
        workletMode: boolean,
        version = ""
    ) {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Failed to acquire drawing context.");
        }

        super(
            channelColors,
            canvas,
            ctx,
            locale,
            workletMode,
            version,
            new LiveKeyboard(canvas, ctx, channelColors, synth)
        );
        this.canvas = canvas;
        this.synth = synth;
        this.seq = seq;
        this.inputNode = inputNode;
        // All data has been adjusted for 44.1kHz, correct it here
        this.sampleRateFactor = synth.context.sampleRate / 44_100;

        // The layout can resize the canvas without a window resize (for example the sequencer UI showing)
        // Ensure that the keyboard size stays constant.
        new ResizeObserver(() => {
            if (
                this.canvas.width !== this.canvas.clientWidth ||
                this.canvas.height !== this.canvas.clientHeight
            ) {
                this.updateSize();
            }
        }).observe(canvas);

        // Seed the program tracker with the current preset list
        this.programTracker.presetListChange(synth.presetList);

        // Analysers
        this.bigAnalyser = new AnalyserNode(synth.context, {
            fftSize: this._analyserFftSize,
            smoothingTimeConstant: ANALYSER_SMOOTHING
        });
        for (const item of synth.midiChannels) {
            void item; // Eslint forces for-of
            // Create the analyzer
            const analyser = new AnalyserNode(synth.context, {
                fftSize: this._analyserFftSize,
                smoothingTimeConstant: ANALYSER_SMOOTHING
            });
            this.channelAnalysers.push(analyser);
        }
        this.updateFftSize();
        this.connectChannelAnalysers();

        // Bind sequencer
        this.seq.eventHandler.addEvent(
            "timeChange",
            "renderer-time-change",
            this.resetIndexes.bind(this)
        );

        this.seq.eventHandler.addEvent(
            "songChange",
            "renderer-song-change",
            async (e) => {
                if (!this.seq) {
                    throw new Error("What?");
                }
                this.calculateNoteTimes(await this.seq.getMIDI());
                // Reset the HUD to the defaults for the new song.
                // Meta events update it further.
                this.texts.timeSignature = "4/4";
                this.currentTempo = 120 * this.playbackRate;
                this.programTracker.updateUsedFromMIDI(e.midiData);
                this.resetIndexes();
                this.setBackground(
                    e.midiData.rmidiInfo?.picture
                        ? new Blob([e.midiData.rmidiInfo.picture])
                        : undefined
                );
            }
        );

        this.seq.eventHandler.addEvent(
            "metaEvent",
            "renderer-meta-event",
            (ev) => this.handleMetaEvent(ev.event)
        );

        this.synth.eventHandler.addEvent(
            "channelParamChange",
            "renderer-channel-param-change",
            (e) => {
                if (e.channel >= this.parts.length) {
                    return;
                }
                switch (e.parameter) {
                    case "pitchWheel":
                    case "pitchWheelRange": {
                        const ch = this.synth.midiChannels[e.channel];
                        const bend = ch.midiParameters.pitchWheel - 8192; // -8192 to 8192
                        this.parts[e.channel].visualPitchTranspose =
                            ch.midiParameters.pitchWheelRange * (bend / 8192);
                        break;
                    }

                    case "efxAssign": {
                        this.parts[e.channel].efxAssign = e.value;
                    }
                }
            }
        );

        this.synth.eventHandler.addEvent(
            "globalParamChange",
            "renderer-global-param-change",
            (e) => {
                if (e.parameter === "system") {
                    this.system = e.value;
                }
            }
        );

        this.synth.eventHandler.addEvent(
            "programChange",
            "renderer-program-change",
            this.programTracker.programChange.bind(this.programTracker)
        );

        this.synth.eventHandler.addEvent(
            "presetListChange",
            "renderer-preset-list-change",
            (e) => this.programTracker.presetListChange(e)
        );

        this.synth.eventHandler.addEvent(
            "channelAdded",
            "renderer-channel-added",
            () => this.programTracker.addChannelTracker()
        );

        // Set up synth display event
        synth.eventHandler.addEvent(
            "displayMessage",
            "renderer-dot-matrix-display",
            this.dotMatrix.displayMessage.bind(this.dotMatrix)
        );
    }

    /**
     * The target range, even while the display range is still transitioning
     */
    public override get keyRange() {
        return this.rangeTransition?.to ?? super.keyRange;
    }

    public override set keyRange(range: { min: number; max: number }) {
        const time = performance.now() / 1000;
        range = this.normalizeRange(range);

        const transition = this.rangeTransition;

        if (transition) {
            // The transition may have ended without a frame finishing it
            const progress = Math.min(
                1,
                (time - transition.startTime) / RANGE_TRANSITION_SECONDS
            );
            const easedProgress = easeOut(progress);
            const from = transition.from.max - transition.from.min + 1;
            const to = transition.to.max - transition.to.min + 1;
            const current = from + (to - from) * easedProgress;
            const newMin =
                transition.from.min +
                (transition.to.min - transition.from.min) * easedProgress;
            const newMax = newMin + current - 1;

            const displayRange = {
                min: Math.min(newMin, range.min),
                max: Math.max(newMax, range.max)
            };

            this.rangeTransition = {
                from: { min: newMin, max: newMax },
                to: range,
                startTime: time
            };
            super.keyRange = displayRange;
        } else {
            const displayRange = {
                min: Math.min(this.keyRange.min, range.min),
                max: Math.max(this.keyRange.max, range.max)
            };

            this.rangeTransition = {
                from: { ...this.keyRange },
                to: range,
                startTime: time
            };
            super.keyRange = displayRange;
        }
        this.renderOneFrame();
    }

    public get notesFalling() {
        return this.notesFall;
    }

    public set notesFalling(value: boolean) {
        this.notesFall = value;
    }

    public get efxText() {
        return this.texts.efxName;
    }

    public set efxText(value: string) {
        this.texts.efxName = value;
    }

    protected _analyserFftSize = CHANNEL_ANALYSER_FFT;

    public get analyserFftSize() {
        return this._analyserFftSize;
    }

    public set analyserFftSize(value) {
        this._analyserFftSize = value;
        this.updateFftSize();
    }

    protected _renderBool = true;

    public get renderBool() {
        return this._renderBool;
    }

    public set renderBool(value: boolean) {
        this._renderBool = value;
        if (value) {
            this.connectChannelAnalysers();
        } else {
            this.disconnectChannelAnalysers();
        }
    }

    public override get stabilizeWaveforms() {
        return this._stabilizeWaveforms;
    }

    public override set stabilizeWaveforms(v: boolean) {
        this._stabilizeWaveforms = v;
        this.updateFftSize();
    }

    public override get showPresetNames() {
        return this._showPresetNames;
    }

    public override set showPresetNames(value: boolean) {
        this._showPresetNames = value;
        this.renderOneFrame();
    }

    protected get highPerformanceMode() {
        return this.synth.systemParameters.blackMIDIMode;
    }

    public setXGInsertion(channel: number, text: string) {
        if (channel < this.parts.length) {
            this.parts[channel].xgInsertion = text;
        }
    }

    // Live_renderer.ts
    public updateFftSize() {
        for (const channelAnalyser of this.channelAnalysers) {
            const fft = this._analyserFftSize;
            const targetFFT = this.stabilizeWaveforms
                ? fft * STABILIZE_WAVEFORMS_FFT_MULTIPLIER
                : fft;

            channelAnalyser.fftSize = Math.min(
                32_768,
                // Nearest factor of 2
                1 << (31 - Math.clz32(targetFFT * this.sampleRateFactor))
            );
        }
        this.bigAnalyser.fftSize = Math.min(
            32_768,
            // Nearest factor of 2
            1 <<
                (31 -
                    Math.clz32(
                        this._analyserFftSize *
                            STABILIZE_WAVEFORMS_FFT_MULTIPLIER *
                            2 *
                            this.sampleRateFactor
                    ))
        );
    }

    /**
     * Connect the 16 channels to their respective analyzers
     */
    public connectChannelAnalysers() {
        for (let i = 0; i < 16; i++) {
            this.synth.connectChannel(this.channelAnalysers[i], i);
        }
        this.inputNode.connect(this.bigAnalyser);
    }

    public disconnectChannelAnalysers() {
        for (let i = 0; i < 16; i++) {
            this.synth.disconnectChannel(this.channelAnalysers[i], i);
        }
        this.inputNode.disconnect(this.bigAnalyser);
        console.info("%cAnalysers disconnected!", consoleColors.recognized);
    }

    public setBackground(image: Blob | undefined) {
        this.backgroundImage = image;
        if (this.backgroundURL) {
            URL.revokeObjectURL(this.backgroundURL);
            this.backgroundURL = undefined;
        }
        if (!image) {
            this.canvas.style.backgroundImage = "";
            return;
        }
        const url = URL.createObjectURL(image);
        this.backgroundURL = url;
        this.canvas.style.backgroundImage = `linear-gradient(var(--background-image-overlay), var(--background-image-overlay)), url("${url}")`;
    }

    public setRendererMode(mode: RendererMode) {
        super.setRendererMode(mode);
        this.updateFftSize();
    }

    public updateSize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.computeColors(this.colors.map((c) => c.plain));
        this.updateFftSize();
        this.renderOneFrame();
    }

    /**
     * Renders a single frame and queues the next one
     */
    public render() {
        // Detect the system parameter changes here
        // And force re-render if needed.
        const global =
            this.synth.systemParameters.keyShift +
            this.synth.systemParameters.fineTune / 100 +
            this.synth.midiParameters.keyShift +
            this.synth.midiParameters.fineTune / 100;
        if (global !== this.transpose) {
            this.transpose = global;
            this.forceRenderOneFrame = true;
        }
        if (!this.forceRenderOneFrame) {
            for (let ch = 0; ch < this.parts.length; ch++) {
                const channel = this.synth.midiChannels[ch];
                if (!channel) {
                    continue;
                }
                const transpose =
                    channel.midiParameters.fineTune / 100 +
                    channel.midiParameters.keyShift +
                    channel.systemParameters.fineTune / 100 +
                    channel.systemParameters.keyShift;
                if (this.parts[ch].transpose !== transpose) {
                    this.parts[ch].transpose = transpose;
                    this.forceRenderOneFrame = true;
                } else if (this.parts[ch].isDrum !== channel.patch.isDrum) {
                    this.parts[ch].isDrum = channel.patch.isDrum;
                    this.forceRenderOneFrame = true;
                }
            }
        }

        const nothingToDo =
            (this.seq === undefined || this?.seq?.paused) &&
            this.synth.voiceCount === 0 &&
            !this.forceRenderOneFrame &&
            !this.rangeTransition &&
            !this.keyboard.forceRenderOneFrame;
        let forceStraight = false;
        if (!this.renderBool || nothingToDo) {
            if (this.hasRenderedNoVoices) {
                // No frames shall be drawn. Redo!
                requestAnimationFrame(() => this.render());

                return;
            } else {
                this.hasRenderedNoVoices = true;
                forceStraight = true;
            }
        } else {
            this.hasRenderedNoVoices = false;
        }
        this.forceRenderOneFrame = false;
        this.keyboard.forceRenderOneFrame = false;

        requestAnimationFrame(() => this.render());

        this.updateRangeTransition(performance.now() / 1000);

        if (
            this.rendererMode === rendererModes.waveformsMode ||
            this.rendererMode === rendererModes.filledWaveformsMode
        ) {
            for (let i = 0; i < this.parts.length; i++) {
                const analyzer = this.channelAnalysers[i];
                const part = this.parts[i];
                analyzer.getFloatTimeDomainData(
                    part.waveform as Float32Array<ArrayBuffer>
                );
                part.waveformLength = analyzer.fftSize;
            }
        }
        this.renderFullFrame(
            performance.now() / 1000,
            this.seq.currentHighResolutionTime,
            forceStraight
        );

        this.onRender?.();
    }

    public startRendering() {
        this.render();
    }

    public renderOneFrame() {
        this.forceRenderOneFrame = true;
    }

    protected resetIndexes() {
        if (this.noteTimes) {
            for (const noteTime of this.noteTimes) {
                noteTime.renderStartIndex = 0;
            }
        }
        this.renderOneFrame();
    }

    protected renderBigSpectrum() {
        const analyser = this.bigAnalyser;
        const fftSize = analyser.frequencyBinCount;
        const waveform = new Uint8Array(fftSize);
        const waveHeight = this.height;
        const waveWidth = this.width;
        const relativeY = waveHeight;
        analyser.getByteFrequencyData(waveform);
        if (!waveform.some((v) => v !== 0)) {
            return;
        }
        const multiplier = (0.8 + this.waveMultiplier / 10) * -waveHeight;
        const max = this.dynamicGain
            ? Math.max.apply(undefined, waveform as unknown as number[])
            : 255;

        const minNote = this._keyRange.min - 1;
        const noteRange = this._keyRange.max - minNote + 0.5;

        let xPos = 0;
        if (this.logarithmicFrequency) {
            const maxFrequencyInTable = this.synth.context.sampleRate / 2;
            // Pixels that map to the same FFT bin are drawn as one bar
            const drawRun = (start: number, end: number, sample: number) => {
                if (sample <= 0) {
                    return;
                }
                const value = sample / max;
                const height = this.exponentialGain
                    ? Math.pow(value, EXPONENTIAL_AGGRESSIVE)
                    : value;
                this.ctx.fillStyle = intensityColors[sample];
                this.ctx.fillRect(
                    start,
                    relativeY,
                    end - start,
                    multiplier * height
                );
            };
            let runStart = 0;
            let runSample = 0;
            for (let i = 0; i < waveWidth; i++) {
                // Calculate the MIDI note (from the lowest piano note to the entire MIDI range)
                const midiNote = minNote + (i / waveWidth) * noteRange;
                const targetFrequency = 440 * Math.pow(2, (midiNote - 69) / 12);
                const fftIndex = Math.floor(
                    (targetFrequency / maxFrequencyInTable) * fftSize
                );
                const sample = waveform[fftIndex] ?? 0;
                if (sample !== runSample) {
                    drawRun(runStart, i, runSample);
                    runStart = i;
                    runSample = sample;
                }
            }
            drawRun(runStart, waveWidth, runSample);
        } else {
            const waveLength = waveform.length / 2;
            const step = waveWidth / waveLength;
            for (let i = 0; i < waveLength; i++) {
                const value = waveform[i] / max;
                const height = this.exponentialGain
                    ? Math.pow(value, EXPONENTIAL_AGGRESSIVE)
                    : value;
                const valueRemapped = value * max;
                this.ctx.fillStyle = intensityColors[valueRemapped];
                this.ctx.fillRect(xPos, relativeY, step, multiplier * height);
                xPos += step;
            }
        }
    }

    /**
     * @param channelNumber
     * @param waveHeight
     * @param waveWidth
     */
    protected renderSingleFft(
        channelNumber: number,
        waveWidth: number,
        waveHeight: number
    ) {
        const analyser = this.channelAnalysers[channelNumber];
        const fftSize = analyser.frequencyBinCount;
        const waveform = new Uint8Array(fftSize);
        analyser.getByteFrequencyData(waveform);
        if (!waveform.some((v) => v !== 0)) {
            return;
        }

        const x = channelNumber % 4;
        const y = Math.floor(channelNumber / 4);
        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y + waveHeight;
        const multiplier = (0.8 + this.waveMultiplier / 10) * -waveHeight;
        const max = this.dynamicGain
            ? Math.max.apply(undefined, waveform as unknown as number[])
            : 255;

        // Draw
        this.ctx.fillStyle = this.colors[channelNumber].gradient;
        let xPos = relativeX;
        this.ctx.beginPath();
        this.ctx.moveTo(xPos, relativeY);

        if (this.logarithmicFrequency) {
            const minNote = 21;
            const noteRange = 88;
            let lastHeight = -Infinity;
            const maxFrequencyInTable = this.synth.context.sampleRate / 2;
            for (let i = 0; i < waveWidth; i++) {
                // Calculate the MIDI note (from the lowest piano note to the entire MIDI range)
                const midiNote = minNote + (i / waveWidth) * noteRange;
                const targetFrequency = 440 * Math.pow(2, (midiNote - 69) / 12);
                const fftIndex = Math.floor(
                    (targetFrequency / maxFrequencyInTable) * fftSize
                );

                if (waveform[fftIndex] === lastHeight && lastHeight > 0) {
                    xPos += 1;
                    continue;
                }
                lastHeight = waveform[fftIndex];
                const value = lastHeight / max;

                // Normalize and apply the exponential curve
                if (this.exponentialGain) {
                    this.ctx.lineTo(
                        xPos,
                        relativeY +
                            Math.pow(value, EXPONENTIAL_GAIN) * multiplier
                    );
                } else {
                    this.ctx.lineTo(xPos, relativeY + value * multiplier);
                }

                xPos += 1;
            }
        } else {
            const step = waveWidth / waveform.length;
            for (const sample of waveform) {
                const value = sample / max;
                if (this.exponentialGain) {
                    this.ctx.lineTo(
                        xPos,
                        relativeY +
                            Math.pow(value, EXPONENTIAL_GAIN) * multiplier
                    );
                } else {
                    this.ctx.lineTo(xPos, relativeY + value * multiplier);
                }
                xPos += step;
            }
        }
        this.ctx.lineTo(relativeX + waveWidth, relativeY);
        this.ctx.fill();
    }

    protected renderSplitSpectrum() {
        const waveWidth = this.width / 4;
        const waveHeight = this.height / 4;
        for (let i = 0; i < this.channelAnalysers.length; i++) {
            if (this.parts[i].efxAssign || this.parts[i].xgInsertion) {
                this.drawEFX(i);
            }
            this.renderSingleFft(i, waveWidth, waveHeight);
        }
    }

    private updateRangeTransition(time: number) {
        const transition = this.rangeTransition;
        if (!transition) {
            return;
        }
        const progress =
            (time - transition.startTime) / RANGE_TRANSITION_SECONDS;

        if (progress >= 1) {
            super.keyRange = transition.to;
            this.rangeTransition = undefined;
            this.xOffset = 0;
            this.keyboard.xOffset = 0;
            this.widthOffset = 0;
            this.keyboard.widthOffset = 0;
            return;
        }
        const easedProgress = easeOut(progress);
        const displayRange = this.keyboard.keyRange;
        const real = displayRange.max - displayRange.min + 1;
        const from = transition.from.max - transition.from.min + 1;
        const to = transition.to.max - transition.to.min + 1;
        const fromMin = transition.from.min;
        const toMin = transition.to.min;
        const layoutWidth = this.vertical ? this.height : this.width;

        const current = from + (to - from) * easedProgress;
        const slot = real / current;
        this.widthOffset = layoutWidth * slot - layoutWidth;
        this.keyboard.widthOffset = this.widthOffset;

        const currentMin = fromMin + (toMin - fromMin) * easedProgress;
        this.xOffset =
            (displayRange.min - currentMin) * (layoutWidth / current);
        this.keyboard.xOffset = this.xOffset;
    }
}
