import { Synthetizer } from "../../../spessasynth_lib/synthetizer/worklet_wrapper/synthetizer.js";
import { calculateRGB, RGBAOpacity } from "../utils/calculate_rgb.js";
import { render } from "./render.js";
import { computeNotePositions } from "./compute_note_positions.js";
import {
    connectChannelAnalysers,
    createChannelAnalysers,
    disconnectChannelAnalysers,
    updateFftSize
} from "./channel_analysers.js";
import { connectSequencer, resetIndexes } from "./connect_sequencer.js";
import { renderBigFft, renderSingleFft, renderSingleWaveform, renderWaveforms } from "./render_waveforms.js";
import { SpessaSynthInfo } from "../../../spessasynth_lib/utils/loggin.js";
import { consoleColors } from "../../../spessasynth_lib/utils/other.js";

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

/**
 * @enum {number}
 */
export const rendererModes = {
    waveformsMode: 0,
    spectrumSplitMode: 1,
    spectrumSingleMode: 2
};

// analysers
const CHANNEL_ANALYSER_FFT = 1024;
const DRUMS_ANALYSER_FFT = 4096;
export const ANALYSER_SMOOTHING = 0.4;
const WAVE_MULTIPLIER = 2;
const ANALYSER_STROKE = 2;

// note rendering
const DARKER_MULTIPLIER = 0.6;
const GRADIENT_DARKEN = 0.5;
export const STROKE_THICKNESS = 1;
export const NOTE_MARGIN = 1;
export const FONT_SIZE = 12;
export const PRESSED_EFFECT_TIME = 0.6;

// limits
export const MIN_NOTE_HEIGHT_PX = 2;
export const MAX_NOTES = 81572;


class Renderer
{
    /**
     * called after a frame is rendered
     * @type {function}
     */
    onRender;
    
    /**
     * Creates a new midi renderer for rendering notes visually.
     * @param channelColors {Array<string>}
     * @param synth {Synthetizer}
     * @param canvas {HTMLCanvasElement}
     * @param locale {LocaleManager}
     * @param version {string}
     */
    constructor(channelColors, synth, canvas, locale, version = "")
    {
        // variables
        /**
         * falling time in milliseconds
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
        
        this.version = "v" + version;
        
        /**
         * adds this to the synth's visual pitch in position caluclation
         * @type {number}
         */
        this.visualPitchBendOffset = 0;
        
        this.lineThickness = ANALYSER_STROKE;
        this._normalAnalyserFft = CHANNEL_ANALYSER_FFT;
        this._drumAnalyserFft = DRUMS_ANALYSER_FFT;
        this.waveMultiplier = WAVE_MULTIPLIER;
        
        // will be updated by locale manager
        this.holdPedalIsDownText = "";
        locale.bindObjectProperty(this, "holdPedalIsDownText", "locale.synthesizerController.holdPedalDown");
        this.currentTimeSignature = "4/4";
        
        /**
         * @type {rendererModes}
         */
        this.rendererMode = rendererModes.waveformsMode;
        
        // booleans
        /**
         * @type {boolean}
         * @private
         */
        this._notesFall = true;
        this.showHoldPedal = false;
        this.sideways = false;
        this._renderBool = true;
        this.renderAnalysers = true;
        this.renderNotes = true;
        this.drawActiveNotes = true;
        this.showVisualPitch = true;
        this._stabilizeWaveforms = true;
        
        // fft config
        this.exponentialGain = true;
        this.logarithmicFrequency = true;
        this.dynamicGain = false;
        
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
        
        this.computeColors();
        
        // synth and analyzers
        this.synth = synth;
        this.notesOnScreen = 0;
        this.timeOffset = 0;
        
        /**
         * @type {AnalyserNode[]}
         */
        this.channelAnalysers = [];
        this.bigAnalyser = new AnalyserNode(synth.context, {
            fftSize: this._normalAnalyserFft,
            smoothingTimeConstant: ANALYSER_SMOOTHING
        });
        this.createChannelAnalysers(synth);
        this.connectChannelAnalysers(synth);
    }
    
    get stabilizeWaveforms()
    {
        return this._stabilizeWaveforms;
    }
    
    /**
     *
     * @param val {boolean}
     */
    set stabilizeWaveforms(val)
    {
        this._stabilizeWaveforms = val;
        this.updateFftSize();
    }
    
    // noinspection JSUnusedGlobalSymbols
    /**
     * @returns {"down"|"up"}
     */
    get direction()
    {
        return this._notesFall ? "down" : "up";
    }
    
    /**
     * @param val {"down"|"up"}
     */
    set direction(val)
    {
        this._notesFall = val === "down";
    }
    
    /**
     * @returns {number}
     */
    get normalAnalyserFft()
    {
        return this._normalAnalyserFft;
    }
    
    set normalAnalyserFft(value)
    {
        this._normalAnalyserFft = value;
        this.updateFftSize();
    }
    
    // noinspection JSUnusedGlobalSymbols
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
        if (value === true)
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
        if (value.max === undefined || value.min === undefined)
        {
            throw new TypeError("No min or max property!");
        }
        if (value.min > value.max)
        {
            let temp = value.min;
            value.min = value.max;
            value.max = temp;
        }
        value.min = Math.max(0, value.min);
        value.max = Math.min(127, value.max);
        this._keyRange = value;
        setTimeout(this.updateSize.bind(this), 100);
    }
    
    /**
     * @param mode {rendererModes|number}
     */
    setRendererMode(mode)
    {
        this.rendererMode = mode;
        this.updateFftSize();
    }
    
    updateSize()
    {
        this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
        this.computeColors();
        this.updateFftSize();
        this.render(false, true);
    }
    
    toggleDarkMode()
    {
        this.canvas.classList.toggle("light_mode");
    }
    
    /**
     * @param mid {BasicMIDI}
     */
    calculateNoteTimes(mid)
    {
        const MIN_NOTE_TIME = 0.02;
        const times = mid.getNoteTimes(MIN_NOTE_TIME);
        /**
         * @type {{notes: {midiNote: number, start: number, length: number, velocity: number}[], rendererStartIndex: number}[]}
         */
        this.noteTimes = times.map(t =>
        {
            return {
                notes: t,
                rendererStartIndex: 0
            };
        });
        SpessaSynthInfo(`%cFinished loading note times and ready to render the sequence!`, consoleColors.info);
    }
    
    computeColors()
    {
        this.channelColors = this.plainColors.map(c =>
        {
            const gradient = this.drawingContext.createLinearGradient(
                0,
                0,
                this.canvas.width / 128,
                0
            );
            gradient.addColorStop(
                0,
                calculateRGB(c, v => v * GRADIENT_DARKEN)
            ); // darker color
            gradient.addColorStop(1, c); // brighter color
            return gradient;
        });
        this.darkerColors = this.plainColors.map(c =>
        {
            const gradient = this.drawingContext.createLinearGradient(
                0,
                0,
                this.canvas.width / 128,
                0
            );
            
            gradient.addColorStop(
                0,
                calculateRGB(
                    c,
                    v => v * GRADIENT_DARKEN * DARKER_MULTIPLIER
                )
            ); // darker color
            gradient.addColorStop(
                1,
                calculateRGB(c, v => v * DARKER_MULTIPLIER)
            ); // brighter color
            return gradient;
        });
        
        /**
         * @type {CanvasGradient[]}
         */
        this.gradientColors = this.plainColors.map((c, channelNumber) =>
        {
            const x = channelNumber % 4;
            const y = Math.floor(channelNumber / 4);
            const waveWidth = this.canvas.width / 4;
            const waveHeight = this.canvas.height / 4;
            const relativeX = waveWidth * x;
            const relativeY = waveHeight * y + waveHeight;
            const gradient = this.drawingContext.createLinearGradient(
                relativeX, relativeY - waveHeight,
                relativeX, relativeY + waveHeight * 0.5
            );
            gradient.addColorStop(0, this.plainColors[channelNumber]);
            gradient.addColorStop(1, RGBAOpacity(this.plainColors[channelNumber], 0));
            return gradient;
        });
        
        /**
         * @type {CanvasGradient[]}
         */
        this.sidewaysChannelColors = this.plainColors.map(c =>
        {
            const gradient = this.drawingContext.createLinearGradient(
                0,
                0,
                0,
                this.canvas.width / 128
            );
            gradient.addColorStop(
                0,
                calculateRGB(
                    c,
                    v => v * GRADIENT_DARKEN
                )
            ); // darker color
            gradient.addColorStop(1, c); // brighter color
            return gradient;
        });
        this.sidewaysDarkerColors = this.plainColors.map(c =>
        {
            const gradient = this.drawingContext.createLinearGradient(
                0,
                0,
                0,
                this.canvas.width / 128
            );
            
            gradient.addColorStop(
                0,
                calculateRGB(
                    c,
                    v => v * GRADIENT_DARKEN * DARKER_MULTIPLIER
                )
            ); // darker color
            gradient.addColorStop(
                1,
                calculateRGB(
                    c,
                    v => v * DARKER_MULTIPLIER
                )
            ); // brighter color
            return gradient;
        });
    }
}

Renderer.prototype.render = render;
Renderer.prototype.computeNotePositions = computeNotePositions;

Renderer.prototype.createChannelAnalysers = createChannelAnalysers;
Renderer.prototype.updateFftSize = updateFftSize;
Renderer.prototype.connectChannelAnalysers = connectChannelAnalysers;
Renderer.prototype.disconnectChannelAnalysers = disconnectChannelAnalysers;

Renderer.prototype.connectSequencer = connectSequencer;
Renderer.prototype.resetIndexes = resetIndexes;

Renderer.prototype.renderWaveforms = renderWaveforms;
Renderer.prototype.renderSingleWaveform = renderSingleWaveform;
Renderer.prototype.renderSingleFft = renderSingleFft;
Renderer.prototype.renderBigFft = renderBigFft;

export { Renderer };