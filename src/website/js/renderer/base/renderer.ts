import { calculateRGB, RGBAOpacity } from "../../utils/calculate_rgb.js";
import { renderFullFrame } from "./render.js";
import { computeNotePositions } from "./compute_note_positions.js";
import { renderSingleWaveform, renderWaveforms } from "./render_waveforms.js";
import {
    BasicMIDI,
    MIDI_DRUM_CHANNEL,
    type MIDIMessage,
    MIDIMessageTypes,
    type MIDISystem,
    type NoteTime,
    SpessaSynthCoreUtils
} from "spessasynth_core";
import { type RendererMode, rendererModes } from "./renderer_modes.ts";
import { DotMatrixDisplay } from "./dot_matrix_display.ts";
import { BaseKeyboard } from "../../canvas_keyboard/base/base_keyboard.ts";
import { OCTAVE } from "../../canvas_keyboard/base/key_style.ts";
import { ProgramTracker } from "./program_tracker.ts";

/**
 * BaseRenderer.js
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

export interface RendererSnapshot {
    rendererMode: RendererMode;
    noteFallingTime: number;
    noteAfterTriggerTime: number;
    lineThickness: number;
    waveMultiplier: number;
    renderNotes: boolean;
    showPresetNames: boolean;
    drawActiveNotes: boolean;
    showVisualPitch: boolean;
    renderDotDisplay: boolean;
    stabilizeWaveforms: boolean;
    dynamicGain: boolean;
    exponentialGain: boolean;
    logarithmicFrequency: boolean;
    keyRange: { min: number; max: number };
    notesFall: boolean;
    sideways: boolean;
    timeOffset: number;
    parts: Omit<RendererPart, "waveform">[];
    texts: RendererTexts;
    highPerformanceMode: boolean;
    workerMode: boolean;
}

const EFX_SCALE_FACTOR = 0.3;

// Analysers
export const ANALYSER_SMOOTHING = 0.4;
const WAVE_MULTIPLIER = 2;
const ANALYSER_STROKE = 2;

// Note rendering
const DARKER_MULTIPLIER = 0.6;
const GRADIENT_DARKEN = 0.5;
export const STROKE_THICKNESS = 1;
export const NOTE_MARGIN = 1;
export const FONT_SIZE = 13;
export const PRESET_NAMES_FONT_SIZE = 16;
export const PRESSED_EFFECT_TIME = 0.6;

// Limits
export const MIN_NOTE_HEIGHT_PX = 2;
export const MAX_NOTES = 81_572;

interface RendererNoteTimes {
    notes: NoteTime[];
    renderStartIndex: number;
}

interface RendererColor {
    plain: string;
    primary: CanvasGradient;
    darker: CanvasGradient;
    gradient: CanvasGradient;
    sideways: CanvasGradient;
    sidewaysDarker: CanvasGradient;
}

interface RendererTexts {
    timeSignature: string;
    holdPedal: string;
    keyboardMode: string;
    efxName: string;
}

interface RendererPart {
    visualPitchTranspose: number;
    transpose: number;
    isDrum: boolean;
    efxAssign: boolean;
    waveform: Float32Array;
    waveformLength: number;
    render: boolean;
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export interface RenderBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Abstracted for CLI usage
 */
export interface RendererLocaleBinder {
    bindObjectProperty<K>(
        object: K,
        propertyName: keyof K,
        localePath: string,
        formattingArguments?: (string | number)[]
    ): void;
}

/**
 * Abstracted for CLI usage
 */
export type RendererCanvasFactory = (
    width: number,
    height: number
) => HTMLCanvasElement | OffscreenCanvas;

export const browserCanvasFactory: RendererCanvasFactory = (width, height) =>
    new OffscreenCanvas(width, height);

/**
 * The base renderer, contains the shared rendering pipeline.
 */
export abstract class BaseRenderer<K extends BaseKeyboard = BaseKeyboard> {
    // Params
    /**
     * Milliseconds
     */
    public noteFallingTime = 1000;
    /**
     * Milliseconds
     */
    public noteAfterTriggerTime = 0;
    public lineThickness = ANALYSER_STROKE;
    public waveMultiplier = WAVE_MULTIPLIER;
    public rendererMode: RendererMode = rendererModes.waveformsMode;
    // Toggles
    public showHoldPedal = false;
    public showKeyboardMode = false;
    public renderNotes = true;
    public drawActiveNotes = true;
    public showVisualPitch = true;
    public renderDotDisplay = true;
    public showFps = true;
    public showEngineMode = true;
    public vertical = false;
    // Fft config
    public exponentialGain = true;
    public logarithmicFrequency = true;
    public dynamicGain = false;
    // Offsets
    public timeOffset = 0;
    public notesOnScreen = 0;
    public readonly renderChannels = new Array<boolean>(16).fill(true);
    public readonly texts: RendererTexts = {
        timeSignature: "4/4",
        holdPedal: "",
        keyboardMode: "",
        efxName: "EFX"
    };
    /**
     * The renderer's attached keyboard.
     */
    public readonly keyboard: K;
    public readonly canvas: HTMLCanvasElement | OffscreenCanvas;
    /**
     * Forces a single frame to be rendered
     */
    protected forceRenderOneFrame = false;
    protected version: string;
    /**
     * True = notes go down
     * False = notes go up
     */
    protected notesFall = true;
    protected readonly ctx:
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D;
    protected bounds: Readonly<RenderBounds> = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };
    protected keyboardBounds = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    };
    /**
     * X offset relative to the note positions (so in vertical mode it's actually y offset)
     */
    protected xOffset = 0;
    /**
     * Extra width of the note's layout (in vertical mode it's the height),
     * letting animations stretch the axis along which the keys are spread
     */
    protected widthOffset = 0;
    /**
     * The maximum points in a single waveform stroke.
     * Splitting the stroke is faster for software canvases,
     * but slower for hardware accelerated ones.
     */
    protected waveformStrokeChunk = Infinity;

    protected readonly voicesPlaying = new Array<boolean>(16).fill(false);
    protected readonly colors = new Array<RendererColor>();
    protected readonly renderFullFrame = renderFullFrame.bind(this);
    protected readonly computeNotePositions = computeNotePositions.bind(this);
    protected readonly renderWaveforms = renderWaveforms.bind(this);
    protected readonly renderSingleWaveform = renderSingleWaveform.bind(this);
    protected readonly programTracker = new ProgramTracker();
    protected readonly dotMatrix;

    protected colorRenderWidth = -1;
    protected colorRenderHeight = -1;
    protected frameTimeStart = performance.now();
    protected noteTimes?: RendererNoteTimes[];
    protected workerMode;
    protected system: MIDISystem = "gs";
    protected convolverMode = false;
    protected currentTempo = 120;
    protected playbackRate = 1;
    protected transpose = 0;
    // Theme-controlled canvas colors, refreshed by updateCanvasColors
    protected hudColor = "#fff";
    protected canvasBackgroundStart = "#000";
    protected canvasBackgroundEnd = "#000";
    protected canvasOverlayColor = "rgba(0, 0, 0, 0.8)";
    protected readonly parts = Array.from(
        { length: 16 },
        // eslint-disable-next-line unicorn/consistent-function-scoping
        (_, i): RendererPart => ({
            visualPitchTranspose: 0,
            transpose: 0,
            isDrum: i % 16 === MIDI_DRUM_CHANNEL,
            efxAssign: false,
            waveform: new Float32Array(32_768),
            waveformLength: 1024,
            render: true
        })
    );
    private canvasColorTheme = "";
    private canvasColorTransitioning = false;

    /**
     * Creates a new midi renderer for rendering notes visually.
     */
    protected constructor(
        channelColors: string[],
        canvas: HTMLCanvasElement | OffscreenCanvas,
        ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
        locale: RendererLocaleBinder,
        workletMode: boolean,
        version = "",
        keyboard: K,
        canvasFactory: RendererCanvasFactory = browserCanvasFactory
    ) {
        this.version = "v" + version;
        this.canvas = canvas;
        this.workerMode = workletMode;

        // Will be updated by locale manager
        locale.bindObjectProperty(
            this.texts,
            "holdPedal",
            "locale.synthesizerController.holdPedalDown"
        );
        locale.bindObjectProperty(
            this.texts,
            "keyboardMode",
            "locale.synthesizerController.keyboardMode"
        );

        this.ctx = ctx;
        this.keyboard = keyboard;

        this.dotMatrix = new DotMatrixDisplay(ctx, canvasFactory);

        // Note colors
        this.computeColors(channelColors);
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
        value = this.normalizeRange(value);
        this._keyRange = value;
        this.keyboard.setKeyRange(value);
    }

    protected get width() {
        return this.bounds.width;
    }

    protected get height() {
        return this.bounds.height;
    }

    // To be set by inheriting renderers
    protected abstract get highPerformanceMode(): boolean;

    // Only the first 16 channels
    protected _showPresetNames = true;

    protected get showPresetNames() {
        return this._showPresetNames;
    }

    protected set showPresetNames(value: boolean) {
        this._showPresetNames = value;
    }

    protected _stabilizeWaveforms = true;

    protected get stabilizeWaveforms() {
        return this._stabilizeWaveforms;
    }

    protected set stabilizeWaveforms(v: boolean) {
        this._stabilizeWaveforms = v;
    }

    public clearRendererMatrix() {
        this.dotMatrix.clear();
    }

    public setRendererMode(mode: RendererMode) {
        this.rendererMode = mode;
    }

    public calculateNoteTimes(mid: BasicMIDI) {
        const MIN_NOTE_TIME = 0.02;
        const times = mid.getNoteTimes(MIN_NOTE_TIME);
        // Special and cool case (triangle.mid)
        for (const t of times) {
            if (t.length === 1) {
                const n = t[0];
                if (n.length === -1) {
                    n.length = mid.duration;
                }
            }
        }
        this.noteTimes = times.map((t) => {
            return {
                notes: t,
                renderStartIndex: 0
            };
        });
        console.info(
            `%cFinished loading note times and ready to render the sequence!`,
            SpessaSynthCoreUtils.ConsoleColors.info
        );
    }

    public setRenderPart(part: number, render: boolean) {
        this.parts[part].render = render;
        this.renderChannels[part] = render;
    }

    public getSnapshot(): RendererSnapshot {
        return {
            rendererMode: this.rendererMode,
            noteFallingTime: this.noteFallingTime,
            noteAfterTriggerTime: this.noteAfterTriggerTime,
            lineThickness: this.lineThickness,
            waveMultiplier: this.waveMultiplier,
            renderNotes: this.renderNotes,
            showPresetNames: this.showPresetNames,
            drawActiveNotes: this.drawActiveNotes,
            showVisualPitch: this.showVisualPitch,
            renderDotDisplay: this.renderDotDisplay,
            stabilizeWaveforms: this.stabilizeWaveforms,
            dynamicGain: this.dynamicGain,
            exponentialGain: this.exponentialGain,
            logarithmicFrequency: this.logarithmicFrequency,
            keyRange: { ...this.keyRange },
            notesFall: this.notesFall,
            sideways: this.vertical,
            timeOffset: this.timeOffset,
            parts: this.parts.map((p) => {
                const { waveform, ...rest } = p;
                void waveform;
                return { ...rest };
            }),
            texts: { ...this.texts },
            highPerformanceMode: this.highPerformanceMode,
            workerMode: this.workerMode
        };
    }

    public applySnapshot(snapshot: RendererSnapshot) {
        this.rendererMode = snapshot.rendererMode;
        this.noteFallingTime = snapshot.noteFallingTime;
        this.noteAfterTriggerTime = snapshot.noteAfterTriggerTime;
        this.lineThickness = snapshot.lineThickness;
        this.waveMultiplier = snapshot.waveMultiplier;
        this.renderNotes = snapshot.renderNotes;
        this.showPresetNames = snapshot.showPresetNames;
        this.drawActiveNotes = snapshot.drawActiveNotes;
        this.showVisualPitch = snapshot.showVisualPitch;
        this.renderDotDisplay = snapshot.renderDotDisplay;
        this.stabilizeWaveforms = snapshot.stabilizeWaveforms;
        this.dynamicGain = snapshot.dynamicGain;
        this.exponentialGain = snapshot.exponentialGain;
        this.logarithmicFrequency = snapshot.logarithmicFrequency;
        this.keyRange = { ...snapshot.keyRange };
        this.notesFall = snapshot.notesFall;
        this.vertical = snapshot.sideways;
        this.timeOffset = snapshot.timeOffset;
        for (let i = 0; i < this.parts.length; i++) {
            const src = snapshot.parts[i];
            const dst = this.parts[i];
            dst.visualPitchTranspose = src.visualPitchTranspose;
            dst.transpose = src.transpose;
            dst.isDrum = src.isDrum;
            dst.efxAssign = src.efxAssign;
            dst.waveformLength = src.waveformLength;
            dst.render = src.render;
            this.renderChannels[i] = src.render;
        }
        Object.assign(this.texts, snapshot.texts);
        this.workerMode = snapshot.workerMode;
    }

    protected normalizeRange(range: { min: number; max: number }) {
        let min = clamp(Math.floor(Math.min(range.min, range.max)), 0, 127);
        let max = clamp(Math.floor(Math.max(range.min, range.max)), 0, 127);
        if (max - min + 1 < OCTAVE) {
            const center = (min + max) / 2;
            const rangeRadius = (OCTAVE - 1) / 2;
            const maximumRangeStart = 127 - OCTAVE + 1;
            min = clamp(Math.floor(center - rangeRadius), 0, maximumRangeStart);
            max = min + OCTAVE - 1;
        }
        return { min, max };
    }

    /**
     * Handles a sequencer meta event.
     * @param e The meta event.
     */
    protected handleMetaEvent(e: MIDIMessage) {
        if (
            e.statusByte === MIDIMessageTypes.timeSignature &&
            e.data.length >= 2
        ) {
            this.texts.timeSignature = `${e.data[0]}/${2 ** e.data[1]}`;
        }
        if (e.statusByte === MIDIMessageTypes.setTempo && e.data.length >= 3) {
            // Big endian
            const ticksPerBeat =
                (e.data[0] << 16) | (e.data[1] << 8) | e.data[2];
            if (ticksPerBeat > 0) {
                this.currentTempo =
                    (60_000_000 / ticksPerBeat) * this.playbackRate;
            }
        }
    }

    /**
     * Clears the frame before drawing.
     * Abstracted for offline to paint a background.
     */
    protected clearFrame() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Reads theme-controlled canvas and note colors from the CSS variables.
     * Re-reads only when the theme changes or during a theme color transition.
     */
    protected updateCanvasColors() {
        if (typeof document === "undefined") {
            return;
        }
        const root = document.documentElement;
        const isTransitioning = root.style.length > 0;
        const theme = root.dataset.theme ?? "";
        if (
            theme === this.canvasColorTheme &&
            isTransitioning === this.canvasColorTransitioning
        ) {
            return;
        }
        this.canvasColorTheme = theme;
        this.canvasColorTransitioning = isTransitioning;
        const style = getComputedStyle(root);
        const readValue = (name: string, fallback: string) =>
            style.getPropertyValue(name).trim() || fallback;
        this.hudColor = readValue("--canvas-hud-text-color", "#fff");
        this.canvasBackgroundStart = readValue(
            "--canvas-background-start",
            "#000"
        );
        this.canvasBackgroundEnd = readValue("--canvas-background-end", "#000");
        this.canvasOverlayColor = readValue(
            "--background-image-overlay",
            "rgba(0, 0, 0, 0.8)"
        );
        // Note colors are excluded from the theme transition, so they switch instantly
        const noteColors = this.colors.map((color, i) =>
            readValue(`--note-color-${i}`, color.plain)
        );
        this.keyboard.setChannelColors(noteColors);
        this.computeColors(noteColors);
    }

    protected calculateRenderArea() {
        this.keyboard.vertical = this.vertical;
        if (!this.keyboard.shown) {
            // Keyboard is not there
            this.keyboardBounds = { x: 0, y: 0, width: 0, height: 0 };
            this.bounds = {
                x: 0,
                y: 0,
                width: this.canvas.width,
                height: this.canvas.height
            };
            return;
        }

        if (this.vertical) {
            const width = Math.min(
                this.canvas.width,
                this.keyboard.getCurrentHeight(this.canvas.height)
            );
            const keyboardOnLeft = !this.notesFall;
            this.keyboardBounds = {
                x: keyboardOnLeft ? 0 : this.canvas.width - width,
                y: 0,
                width,
                height: this.canvas.height
            };
            this.bounds = {
                x: keyboardOnLeft ? width : 0,
                y: 0,
                width: this.canvas.width - width,
                height: this.canvas.height
            };
            return;
        }

        const height = Math.min(
            this.canvas.height,
            this.keyboard.getCurrentHeight(this.canvas.width)
        );
        const keyboardOnTop = !this.notesFall;
        this.keyboardBounds = {
            x: 0,
            y: keyboardOnTop ? 0 : this.canvas.height - height,
            width: this.canvas.width,
            height
        };
        this.bounds = {
            x: 0,
            y: keyboardOnTop ? height : 0,
            width: this.canvas.width,
            height: this.canvas.height - height
        };
    }

    protected computeColors(colors: string[]) {
        this.colors.length = 0;
        this.colorRenderWidth = this.width;
        this.colorRenderHeight = this.height;
        for (
            let channelNumber = 0;
            channelNumber < colors.length;
            channelNumber++
        ) {
            const color = colors[channelNumber];
            const primary = this.ctx.createLinearGradient(
                0,
                0,
                this.width / 128,
                0
            );

            primary.addColorStop(
                0,
                calculateRGB(color, (v) => v * GRADIENT_DARKEN)
            ); // Darker color
            primary.addColorStop(1, color); // Brighter color

            const darker = this.ctx.createLinearGradient(
                0,
                0,
                this.width / 128,
                0
            );

            darker.addColorStop(
                0,
                calculateRGB(
                    color,
                    (v) => v * GRADIENT_DARKEN * DARKER_MULTIPLIER
                )
            ); // Darker color
            darker.addColorStop(
                1,
                calculateRGB(color, (v) => v * DARKER_MULTIPLIER)
            ); // Brighter color

            const x = channelNumber % 4;
            const y = Math.floor(channelNumber / 4);
            const waveWidth = this.width / 4;
            const waveHeight = this.height / 4;
            const relativeX = waveWidth * x;
            const relativeY = waveHeight * y + waveHeight;
            const gradient = this.ctx.createLinearGradient(
                relativeX,
                relativeY - waveHeight,
                relativeX,
                relativeY + waveHeight * 0.5
            );
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, RGBAOpacity(color, 0));

            const sideways = this.ctx.createLinearGradient(
                0,
                0,
                0,
                this.width / 128
            );
            sideways.addColorStop(
                0,
                calculateRGB(color, (v) => v * GRADIENT_DARKEN)
            ); // Darker color
            sideways.addColorStop(1, color); // Brighter color

            const sidewaysDarker = this.ctx.createLinearGradient(
                0,
                0,
                0,
                this.width / 128
            );

            sidewaysDarker.addColorStop(
                0,
                calculateRGB(
                    color,
                    (v) => v * GRADIENT_DARKEN * DARKER_MULTIPLIER
                )
            ); // Darker color
            sidewaysDarker.addColorStop(
                1,
                calculateRGB(color, (v) => v * DARKER_MULTIPLIER)
            ); // Brighter color

            this.colors.push({
                plain: color,
                primary,
                darker,
                gradient,
                sideways,
                sidewaysDarker
            });
        }
    }

    protected abstract renderSplitSpectrum(): void;
    protected abstract renderBigSpectrum(): void;

    protected drawEFX(channel: number) {
        const ctx = this.ctx;
        ctx.fillStyle = this.colors[channel].darker;
        const x = channel % 4;
        const y = Math.floor(channel / 4);
        const waveWidth = this.width / 4;
        const waveHeight = this.height / 4;
        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y + waveHeight;
        let fontSize = waveHeight;
        ctx.font = `${fontSize}px monospace`;
        const text = this.texts.efxName;

        const metrics = ctx.measureText(text);

        const actualWidth = waveWidth * EFX_SCALE_FACTOR;
        const actualHeight = waveHeight * EFX_SCALE_FACTOR;
        const widthRatio = actualWidth / metrics.width;
        const heightRatio = actualHeight / fontSize;

        const scale = Math.min(widthRatio, heightRatio);
        fontSize = Math.floor(fontSize * scale);

        ctx.font = `${fontSize}px monospace`;
        ctx.textBaseline = "top";
        ctx.textAlign = "end";
        ctx.fillText(text, relativeX + waveWidth, relativeY - waveHeight);
    }
}
