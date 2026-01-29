import { calculateRGB, RGBAOpacity } from "../utils/calculate_rgb.js";
import { render } from "./render.js";
import { computeNotePositions } from "./compute_note_positions.js";
import { connectChannelAnalysers, disconnectChannelAnalysers, updateFftSize } from "./channel_analysers.js";
import { renderBigFft, renderSingleFft, renderSingleWaveform, renderWaveforms } from "./render_waveforms.js";
import { consoleColors } from "../utils/console_colors.js";
import { BasicMIDI, midiMessageTypes } from "spessasynth_core";
import type { Sequencer } from "spessasynth_lib";
import type { LocaleManager } from "../locale/locale_manager.ts";
import type { Synthesizer } from "../utils/synthesizer.ts";

/**
 * Renderer.js
 * purpose: renders midi file and channel waveforms to a canvas
 */

export interface NoteToRender {
    xPos: number;
    yPos: number;
    height: number;
    width: number;
    stroke: number;
    color: CanvasGradient;
    pressedProgress: number;
    velocity: number;
}

export const rendererModes = {
    waveformsMode: 0,
    spectrumSplitMode: 1,
    spectrumSingleMode: 2,
    filledWaveformsMode: 4,
    none: 5
};

export type RendererMode = (typeof rendererModes)[keyof typeof rendererModes];

// Analysers
const CHANNEL_ANALYSER_FFT = 1024;
const DRUMS_ANALYSER_FFT = 4096;
export const ANALYSER_SMOOTHING = 0.4;
const WAVE_MULTIPLIER = 2;
const ANALYSER_STROKE = 2;

// Note rendering
const DARKER_MULTIPLIER = 0.6;
const GRADIENT_DARKEN = 0.5;
export const STROKE_THICKNESS = 1;
export const NOTE_MARGIN = 1;
export const FONT_SIZE = 12;
export const PRESSED_EFFECT_TIME = 0.6;

// Limits
export const MIN_NOTE_HEIGHT_PX = 2;
export const MAX_NOTES = 81572;

export class Renderer {
    /**
     * Called after a frame is rendered
     */
    public onRender?: () => unknown;

    public noteFallingTimeMs = 1000;
    public noteAfterTriggerTimeMs = 0;
    public lineThickness = ANALYSER_STROKE;
    public waveMultiplier = WAVE_MULTIPLIER;
    public currentTimeSignature = "4/4";
    public holdPedalIsDownText = "";
    public rendererMode: RendererMode = rendererModes.waveformsMode;
    public showHoldPedal = false;
    public renderNotes = true;
    public drawActiveNotes = true;
    public showVisualPitch = true;
    // Fft config
    public exponentialGain = true;
    public logarithmicFrequency = true;
    public dynamicGain = false;
    public renderChannels = Array<boolean>(16).fill(true);
    public timeOffset = 0;
    public notesOnScreen = 0;
    public sideways = false;
    public readonly updateFftSize = updateFftSize.bind(this);
    public readonly render = render.bind(this);
    protected version: string;
    protected _notesFall = true;
    protected canvas: HTMLCanvasElement;
    protected drawingContext: CanvasRenderingContext2D;
    protected plainColors: string[];
    protected synth: Synthesizer;
    protected seq: Sequencer;
    protected channelAnalysers: AnalyserNode[] = [];
    protected bigAnalyser: AnalyserNode;
    protected channelColors: CanvasGradient[] = [];
    protected darkerColors: CanvasGradient[] = [];
    protected gradientColors: CanvasGradient[] = [];
    protected sidewaysChannelColors: CanvasGradient[] = [];
    protected sidewaysDarkerColors: CanvasGradient[] = [];
    protected frameTimeStart = performance.now();
    protected noteTimes?: {
        notes: {
            midiNote: number;
            start: number;
            length: number;
            velocity: number;
        }[];
        renderStartIndex: number;
    }[];
    protected readonly computeNotePositions = computeNotePositions.bind(this);
    protected readonly connectChannelAnalysers =
        connectChannelAnalysers.bind(this);
    protected readonly disconnectChannelAnalysers =
        disconnectChannelAnalysers.bind(this);
    protected readonly renderWaveforms = renderWaveforms.bind(this);
    protected readonly renderSingleWaveform = renderSingleWaveform.bind(this);
    protected readonly renderSingleFft = renderSingleFft.bind(this);
    protected readonly renderBigFft = renderBigFft.bind(this);
    protected readonly inputNode: AudioNode;
    protected readonly workerMode: boolean;
    protected readonly sampleRateFactor: number;

    /**
     * Creates a new midi renderer for rendering notes visually.
     */
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
        this.synth = synth;
        this.seq = seq;
        this.version = "v" + version;
        this.inputNode = inputNode;
        this.canvas = canvas;
        this.plainColors = channelColors;
        this.workerMode = workletMode;
        // All data has been adjusted for 44.1kHz, correct it here
        this.sampleRateFactor = this.synth.context.sampleRate / 44_100;

        // Will be updated by locale manager
        locale.bindObjectProperty(
            this,
            "holdPedalIsDownText",
            "locale.synthesizerController.holdPedalDown"
        );

        const ctx = this.canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Failed to acquire drawing context.");
        }
        this.drawingContext = ctx;

        // Note colors
        this.computeColors();

        // Analysers
        this.bigAnalyser = new AnalyserNode(synth.context, {
            fftSize: this._normalAnalyserFft,
            smoothingTimeConstant: ANALYSER_SMOOTHING
        });
        for (let i = 0; i < synth.channelsAmount; i++) {
            // Create the analyzer
            const analyser = new AnalyserNode(synth.context, {
                fftSize: this._normalAnalyserFft,
                smoothingTimeConstant: ANALYSER_SMOOTHING
            });
            this.channelAnalysers.push(analyser);
        }

        synth.eventHandler.addEvent(
            "muteChannel",
            "renderer-mute-channel",
            (eventData) => {
                this.renderChannels[eventData.channel] = !eventData.isMuted;
            }
        );
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
            async (mid) => {
                if (!this.seq) {
                    throw new Error("What?");
                }
                this.calculateNoteTimes(await this.seq.getMIDI());
                this.resetIndexes();
                if (mid.rmidiInfo?.picture !== undefined) {
                    const blob = new Blob([mid.rmidiInfo.picture.buffer]);
                    const url = URL.createObjectURL(blob);
                    const opacity = this.canvas.classList.contains("light_mode")
                        ? 0
                        : 0.9;
                    this.canvas.style.background = `linear-gradient(rgba(0, 0, 0, ${opacity}), rgba(0, 0, 0, ${opacity})), center center / cover url("${url}")`;
                } else {
                    this.canvas.style.background = "";
                }
            }
        );

        this.seq.eventHandler.addEvent(
            "metaEvent",
            "renderer-meta-event",
            (ev) => {
                const event = ev.event;
                if (event.statusByte === midiMessageTypes.timeSignature) {
                    this.currentTimeSignature = `${event.data[0]}/${Math.pow(2, event.data[1])}`;
                }
            }
        );
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

    protected _stabilizeWaveforms = true;

    // noinspection JSUnusedGlobalSymbols

    public get stabilizeWaveforms() {
        return this._stabilizeWaveforms;
    }

    public set stabilizeWaveforms(val: boolean) {
        this._stabilizeWaveforms = val;
        this.updateFftSize();
    }

    protected _keyRange = {
        min: 0,
        max: 127
    };

    /**
     * The range of displayed MIDI keys
     */
    public get keyRange() {
        return this._keyRange;
    }

    /**
     * The range of displayed MIDI keys
     */
    public set keyRange(value) {
        if (value.max === undefined || value.min === undefined) {
            throw new TypeError("No min or max property!");
        }
        if (value.min > value.max) {
            const temp = value.min;
            value.min = value.max;
            value.max = temp;
        }
        value.min = Math.max(0, value.min);
        value.max = Math.min(127, value.max);
        this._keyRange = value;
        setTimeout(this.updateSize.bind(this), 100);
    }

    protected _normalAnalyserFft = CHANNEL_ANALYSER_FFT;

    public get normalAnalyserFft() {
        return this._normalAnalyserFft;
    }

    public set normalAnalyserFft(value) {
        this._normalAnalyserFft = value;
        this.updateFftSize();
    }

    protected _drumAnalyserFft = DRUMS_ANALYSER_FFT;

    // noinspection JSUnusedGlobalSymbols
    public get drumAnalyserFft() {
        return this._drumAnalyserFft;
    }

    public set drumAnalyserFft(value) {
        this._drumAnalyserFft = value;
        this.updateFftSize();
    }

    public set direction(val: "down" | "up") {
        this._notesFall = val === "down";
    }

    public setRendererMode(mode: RendererMode) {
        this.rendererMode = mode;
        this.updateFftSize();
    }

    public updateSize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.computeColors();
        this.updateFftSize();
        this.render(false, true);
    }

    public toggleDarkMode() {
        this.canvas.classList.toggle("light_mode");
    }

    public calculateNoteTimes(mid: BasicMIDI) {
        const MIN_NOTE_TIME = 0.02;
        const times = mid.getNoteTimes(MIN_NOTE_TIME);
        // Special and cool case (triangle.mid)
        times.forEach((t) => {
            if (t.length === 1) {
                const n = t[0];
                if (n.length === -1) {
                    n.length = mid.duration;
                }
            }
        });
        this.noteTimes = times.map((t) => {
            return {
                notes: t,
                renderStartIndex: 0
            };
        });
        console.info(
            `%cFinished loading note times and ready to render the sequence!`,
            consoleColors.info
        );
    }

    protected resetIndexes() {
        if (!this.noteTimes) {
            return;
        }
        this.noteTimes.forEach((n) => (n.renderStartIndex = 0));
        this.render(false, true);
    }

    protected computeColors() {
        this.channelColors = this.plainColors.map((c) => {
            const gradient = this.drawingContext.createLinearGradient(
                0,
                0,
                this.canvas.width / 128,
                0
            );
            gradient.addColorStop(
                0,
                calculateRGB(c, (v) => v * GRADIENT_DARKEN)
            ); // Darker color
            gradient.addColorStop(1, c); // Brighter color
            return gradient;
        });
        this.darkerColors = this.plainColors.map((c) => {
            const gradient = this.drawingContext.createLinearGradient(
                0,
                0,
                this.canvas.width / 128,
                0
            );

            gradient.addColorStop(
                0,
                calculateRGB(c, (v) => v * GRADIENT_DARKEN * DARKER_MULTIPLIER)
            ); // Darker color
            gradient.addColorStop(
                1,
                calculateRGB(c, (v) => v * DARKER_MULTIPLIER)
            ); // Brighter color
            return gradient;
        });

        this.gradientColors = this.plainColors.map((_c, channelNumber) => {
            const x = channelNumber % 4;
            const y = Math.floor(channelNumber / 4);
            const waveWidth = this.canvas.width / 4;
            const waveHeight = this.canvas.height / 4;
            const relativeX = waveWidth * x;
            const relativeY = waveHeight * y + waveHeight;
            const gradient = this.drawingContext.createLinearGradient(
                relativeX,
                relativeY - waveHeight,
                relativeX,
                relativeY + waveHeight * 0.5
            );
            gradient.addColorStop(0, this.plainColors[channelNumber]);
            gradient.addColorStop(
                1,
                RGBAOpacity(this.plainColors[channelNumber], 0)
            );
            return gradient;
        });

        this.sidewaysChannelColors = this.plainColors.map((c) => {
            const gradient = this.drawingContext.createLinearGradient(
                0,
                0,
                0,
                this.canvas.width / 128
            );
            gradient.addColorStop(
                0,
                calculateRGB(c, (v) => v * GRADIENT_DARKEN)
            ); // Darker color
            gradient.addColorStop(1, c); // Brighter color
            return gradient;
        });
        this.sidewaysDarkerColors = this.plainColors.map((c) => {
            const gradient = this.drawingContext.createLinearGradient(
                0,
                0,
                0,
                this.canvas.width / 128
            );

            gradient.addColorStop(
                0,
                calculateRGB(c, (v) => v * GRADIENT_DARKEN * DARKER_MULTIPLIER)
            ); // Darker color
            gradient.addColorStop(
                1,
                calculateRGB(c, (v) => v * DARKER_MULTIPLIER)
            ); // Brighter color
            return gradient;
        });
    }
}
