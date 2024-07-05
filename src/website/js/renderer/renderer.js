import {Synthetizer} from "../../../spessasynth_lib/synthetizer/synthetizer.js";
import { calculateRGB } from '../utils/calculate_rgb.js'
import { render } from './render.js'
import { computeNotePositions } from './compute_note_positions.js'
import {
    connectChannelAnalysers,
    createChannelAnalysers,
    disconnectChannelAnalysers,
    updateFftSize,
} from './channel_analysers.js'
import { connectSequencer, resetIndexes } from './connect_sequencer.js'
import { renderWaveforms } from './render_waveforms.js'
import { calculateNoteTimes } from './calculate_note_times.js'

/**
 * renderer.js
 * purpose: renders midi file and channel waveforms to a canvas
 */

/**
 * @typedef {{
 * xPos: number,
 * yPos: number,
 * height: number,
 * width: number,
 * stroke: number,
 * color: CanvasGradient,
 * pressedProgress: number,
 * velocity: number
 * }}NoteToRender
 */

// analysers
const CHANNEL_ANALYSER_FFT = 1024;
const DRUMS_ANALYSER_FFT = 2048;
const WAVE_MULTIPLIER = 2;
const ANALYSER_STROKE = 2;

// note rendering
const DARKER_MULTIPLIER = 0.6;
const GRADIENT_DARKEN = 0.5;
export const STROKE_THICKNESS = 1;
export const NOTE_MARGIN = 1;
export const FONT_SIZE = 16;
export const PRESSED_EFFECT_TIME = 0.6;

// limits
export const MIN_NOTE_HEIGHT_PX = 2;
export const MAX_NOTES = 81572;


class Renderer
{
    /**
     * Creates a new midi renderer for rendering notes visually.
     * @param channelColors {Array<string>}
     * @param synth {Synthetizer}
     * @param canvas {HTMLCanvasElement}
     */
    constructor(channelColors, synth, canvas)
    {
        // variables
        /**
         * falling time in miliseconds
         * @type {number}
         */
        this.noteFallingTimeMs = 1000;
        this.noteAfterTriggerTimeMs = 0;
        /**
         * @type {{min: number, max: number}}
         * @private
         */
        this._keyRange = {
            min: 0,
            max: 127
        };

        /**
         * adds this to the synth's visual pitch in position caluclation
         * @type {number}
         */
        this.visualPitchBendOffset = 0;

        this.lineThickness = ANALYSER_STROKE;
        this._normalAnalyserFft = CHANNEL_ANALYSER_FFT;
        this._drumAnalyserFft = DRUMS_ANALYSER_FFT;
        this.waveMultiplier = WAVE_MULTIPLIER;


        // booleans
        this._renderBool = true;
        this.renderAnalysers = true;
        this.renderNotes = true;
        this.drawActiveNotes = true;
        this.showVisualPitch = true;
        this.stabilizeWaveforms = true;
        /**
         * @type {boolean[]}
         */
        this.renderChannels = Array(16).fill(true);

        /**
         * canvas
         * @type {HTMLCanvasElement}
         */
        this.canvas = canvas;

        /**
         * @type {CanvasRenderingContext2D}
         */
        this.drawingContext = this.canvas.getContext("2d");

        // note colors
        this.plainColors = channelColors;

        this.computeColors()

        // synth and analysers
        this.synth = synth;
        this.notesOnScreen = 0;

        /**
         * @type {AnalyserNode[]}
         */
        this.channelAnalysers = [];
        this.createChannelAnalysers(synth);
        this.connectChannelAnalysers(synth);
    }

    computeColors()
    {
        this.channelColors = this.plainColors.map(c => {
            const gradient = this.drawingContext.createLinearGradient(0, 0,
                this.canvas.width / 128, 0);
            gradient.addColorStop(0, calculateRGB(c, v => v * GRADIENT_DARKEN)); // darker color
            gradient.addColorStop(1, c); // brighter color
            return gradient;
        });
        this.darkerColors = this.plainColors.map(c => {
            const gradient = this.drawingContext.createLinearGradient(0, 0,
                this.canvas.width / 128, 0);

            gradient.addColorStop(0, calculateRGB(c, v => v * GRADIENT_DARKEN * DARKER_MULTIPLIER)); // darker color
            gradient.addColorStop(1, calculateRGB(c, v => v * DARKER_MULTIPLIER)); // brighter color
            return gradient;
        });
    }

    toggleDarkMode()
    {
        this.canvas.classList.toggle("light_mode");
    }

    /**
     * called after a frame is rendered
     * @type {function}
     */
    onRender;

    get normalAnalyserFft()
    {
        return this._normalAnalyserFft
    }

    set normalAnalyserFft(value)
    {
        this._normalAnalyserFft = value;
        this.updateFftSize();
    }

    get drumAnalyserFft()
    {
        return this._drumAnalyserFft;
    }

    set drumAnalyserFft(value)
    {
        this._drumAnalyserFft = value;
        this.updateFftSize();
    }

    get renderBool()
    {
        return this._renderBool;
    }

    set renderBool(value)
    {
        this._renderBool = value;
        if(value === true)
        {
            this.connectChannelAnalysers(this.synth);
        }
        else
        {
            this.disconnectChannelAnalysers();
        }
    }

    /**
     * The range of displayed MIDI keys
     * @returns {{min: number, max: number}}
     */
    get keyRange()
    {
        return this._keyRange;
    }

    /**
     * The range of displayed MIDI keys
     * @param value {{min: number, max: number}}
     */
    set keyRange(value)
    {
        if(value.max === undefined || value.min === undefined)
        {
            throw new TypeError("No min or max property!");
        }
        if(value.min > value.max)
        {
            let temp = value.min;
            value.min = value.max;
            value.max = temp;
        }
        value.min = Math.max(0, value.min);
        value.max = Math.min(127, value.max);
        this._keyRange = value;
    }
}

Renderer.prototype.render = render;
Renderer.prototype.computeNotePositions = computeNotePositions;

Renderer.prototype.createChannelAnalysers = createChannelAnalysers;
Renderer.prototype.updateFftSize = updateFftSize;
Renderer.prototype.connectChannelAnalysers = connectChannelAnalysers;
Renderer.prototype.disconnectChannelAnalysers = disconnectChannelAnalysers;

Renderer.prototype.connectSequencer = connectSequencer;
Renderer.prototype.calculateNoteTimes = calculateNoteTimes;
Renderer.prototype.resetIndexes = resetIndexes;

Renderer.prototype.renderWaveforms = renderWaveforms;

export { Renderer }