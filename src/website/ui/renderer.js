import {Synthetizer} from "../../spessasynth_lib/synthetizer/synthetizer.js";
import { calculateRGB } from '../../spessasynth_lib/utils/other.js';
import { Sequencer } from '../../spessasynth_lib/sequencer/sequencer.js';

// analysers
const CHANNEL_ANALYSER_FFT = 512;
const DRUMS_ANALYSER_FFT = 2048;
const WAVE_MULTIPLIER = 2;

// note rendering
const DARKER_MULTIPLIER = 0.6;
const GRADIENT_DARKEN = 0.5;
const STROKE_THICKNESS = 0.5;
const NOTE_MARGIN = 1;
const FONT_SIZE = 16;
const STROKE_COLOR = "#000";

// limits
const MIN_NOTE_HEIGHT_PX = 2;
const MAX_NOTES = 81572;


export class Renderer
{
    /**
     * Creates a new midi renderer for rendering notes visually.
     * @param channelColors {Array<string>}
     * @param synth {Synthetizer}
     * @param canvas {HTMLCanvasElement}
     */
    constructor(channelColors, synth, canvas) {
        // variables
        this.noteFallingTimeMs = 1000;
        this.noteAfterTriggerTimeMs = 0;

        // booleans
        this.renderBool = true;
        this.renderAnalysers = true;
        this.renderNotes = true;

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

        this.channelColors = channelColors.map(c => {
            const gradient = this.drawingContext.createLinearGradient(0, 0,
                this.canvas.width / 128, 0);
            gradient.addColorStop(0, calculateRGB(c, v => v * GRADIENT_DARKEN)); // darker color
            gradient.addColorStop(1, c); // brighter color
            return gradient;
        });
        this.darkerColors = channelColors.map(c => {
            const gradient = this.drawingContext.createLinearGradient(0, 0,
                this.canvas.width / 128, 0);

            gradient.addColorStop(0, calculateRGB(c, v => v * GRADIENT_DARKEN * DARKER_MULTIPLIER)); // darker color
            gradient.addColorStop(1, calculateRGB(c, v => v * DARKER_MULTIPLIER)); // brighter color
            return gradient;
        });

        // synth and analysers
        this.synth = synth;
        this.notesOnScreen = 0;

        /**
         * @type {AnalyserNode[]}
         */
        this.channelAnalysers = [];
        this.connectChannelAnalysers(synth);
    }

    /**
     * Connect the 16 channels to their respective analysers
     * @param synth {Synthetizer}
     */
    connectChannelAnalysers(synth)
    {
        // disconnect the analysers from earlier
        for(const analyser of this.channelAnalysers)
        {
            analyser.disconnect();
            this.channelAnalysers.splice(0, 1);
        }
        this.channelAnalysers = [];
        for(const channel of synth.midiChannels)
        {
            // create the analyser
            const analyser = new AnalyserNode(channel.ctx, {
                fftSize: CHANNEL_ANALYSER_FFT
            });
            // connect the channel's output to the analyser
            channel.gainController.connect(analyser);
            this.channelAnalysers.push(analyser);
        }
    }

    /**
     * @param noteTimes {NoteTimes}
     * @param sequencer {Sequencer}
     */
    connectSequencer(noteTimes, sequencer)
    {
        this.noteTimes = noteTimes;
        this.seq = sequencer;
    }

    /**
     * Renders a single frame
     * @param auto {boolean} if set to false, the renderer won't clear the screen or request an animation frame. Defaults to true.
     */
    render(auto = true) {
        if (!this.renderBool) {
            if (auto) {
                requestAnimationFrame(this.render.bind(this));
            }
            return;
        }
        if (auto) {
            this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.drawingContext.textAlign = "start";
        this.drawingContext.textBaseline = "hanging";
        this.drawingContext.fillStyle = "#ccc";
        this.drawingContext.font = `${FONT_SIZE}px Sans`;


        if (this.renderAnalysers) {
            // draw the individual analysers
            this.channelAnalysers.forEach((analyser, i) => {
                if (this.synth.midiChannels[i].percussionChannel) {
                    if (analyser.fftSize !== DRUMS_ANALYSER_FFT) {
                        analyser.fftSize = DRUMS_ANALYSER_FFT;
                    }
                }

                this.drawChannelWaveform(analyser,
                    i % 4,
                    Math.floor(i / 4), i);
                i++;
            });
        }

        if (this.renderNotes && this.noteTimes) {

            // draw the notes
            /**
             * @type {{x: number, y: number, h: number, c: CanvasGradient}[]}
             */
            const notesToDraw = [];

            // math
            this.notesOnScreen = 0;
            const keyStep = this.canvas.width / 128;
            const noteWidth = keyStep - (NOTE_MARGIN * 2);

            const fallingTime = this.noteFallingTimeMs / 1000
            const afterTime = this.noteAfterTriggerTimeMs / 1000;

            const currentSeqTime = this.seq.currentTime;
            const currentStartTime = currentSeqTime - afterTime;
            const fallingTimeSeconds = fallingTime + afterTime;
            const currentEndTime = currentStartTime + fallingTimeSeconds;
            const minNoteHeight = MIN_NOTE_HEIGHT_PX / fallingTimeSeconds;

            this.noteTimes.forEach((channel, channelNumder) => {

                if(channel.renderStartIndex >= channel.notes.length) return;

                let noteIndex = channel.renderStartIndex;
                const notes = channel.notes;
                let note = notes[noteIndex];

                let firstNoteIndex = -1;

                // while the note start is in range
                while(note.start <= currentEndTime){
                    noteIndex++;
                    // cap notes
                    if(this.notesOnScreen > MAX_NOTES)
                    {
                        break;
                    }

                    const noteSum = note.start + note.length

                    // if the note is out of range, append the render start index
                    if(noteSum > currentStartTime && note.length > 0) {
                        const height = ((note.length / fallingTimeSeconds) * this.canvas.height) - (NOTE_MARGIN * 2);

                        // height less than that can be ommitted (come on)
                        if(height > minNoteHeight || this.notesOnScreen < 1000) {
                            if(firstNoteIndex === -1)
                            {
                                firstNoteIndex = noteIndex - 1;
                            }
                            const yPos = this.canvas.height - height
                                - (((note.start - currentStartTime) / fallingTimeSeconds) * this.canvas.height) + NOTE_MARGIN;

                            const xPos = keyStep * note.midiNote + NOTE_MARGIN;

                            // determine if the note should be darker or not (or flat if black midi mode is on
                            if(this.synth.highPerformanceMode)
                            {
                                // draw them right away, we don't care about the order
                                this.drawingContext.fillStyle = this.plainColors[channelNumder];
                                this.drawingContext.fillRect(xPos + STROKE_THICKNESS + NOTE_MARGIN,
                                    yPos + STROKE_THICKNESS,
                                    noteWidth - (STROKE_THICKNESS * 2),
                                    height - (STROKE_THICKNESS * 2));
                            }
                            else {
                                // save the notes to draw
                                if (note.start > currentSeqTime || noteSum < currentSeqTime) {
                                    notesToDraw.push({
                                        x: xPos,
                                        y: yPos,
                                        h: height,
                                        c: this.darkerColors[channelNumder]
                                    })
                                } else {
                                    notesToDraw.push({
                                        x: xPos,
                                        y: yPos,
                                        h: height,
                                        c: this.channelColors[channelNumder]
                                    })
                                }
                            }
                            this.notesOnScreen++;
                        }
                    }

                    if(noteIndex >= notes.length)
                    {
                        break;
                    }

                    note = notes[noteIndex];
                }
                if(firstNoteIndex > -1) channel.renderStartIndex = firstNoteIndex;
            });

            // draw the notes from longest to shortest (non black midi mode)
            if(!this.synth.highPerformanceMode)
            {
                notesToDraw.sort((n1, n2) => n2.h - n1.h);
                notesToDraw.forEach(n => {
                    this.drawingContext.save();
                    this.drawingContext.fillStyle = n.c;
                    this.drawingContext.translate(n.x, n.y);

                    this.drawingContext.fillRect(0, 0, noteWidth, n.h);
                    this.drawingContext.restore();

                    this.drawingContext.strokeStyle = STROKE_COLOR;
                    this.drawingContext.lineWidth = STROKE_THICKNESS;
                    this.drawingContext.strokeRect(n.x, n.y, noteWidth, n.h);
                })
            }
        }

        // calculate fps
        let timeSinceLastFrame = performance.now() - this.frameTimeStart;
        let fps = 1000 / timeSinceLastFrame;

        // draw note count and fps
        this.drawingContext.textAlign = "end";
        this.drawingContext.fillText(`${this.notesOnScreen} notes`, this.canvas.width, FONT_SIZE + 5);
        this.drawingContext.fillText(Math.round(fps).toString() + " FPS", this.canvas.width, 5);

        this.frameTimeStart = performance.now();
        if(auto) {
            requestAnimationFrame(this.render.bind(this));
        }
    }

    /**
     * Draws the channel waveforms
     * @param analyser {AnalyserNode}
     * @param x {number} from 0 to 3
     * @param y {number} from 0 to 3
     * @param channelNumber {number} 0-15
     */
    drawChannelWaveform(analyser, x, y, channelNumber)
    {
        const waveform = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatTimeDomainData(waveform);
        const waveWidth = this.canvas.width / 4;
        const waveHeight = this.canvas.height / 4
        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y + waveHeight / 2;
        const step = waveWidth / waveform.length;
        const multiplier = WAVE_MULTIPLIER * waveHeight;

        // draw
        this.drawingContext.strokeStyle = this.channelColors[channelNumber];

        const path = new Path2D();
        path.moveTo(relativeX, relativeY + waveform[0] * multiplier);


        let xPos = relativeX;
        waveform.forEach((val)  => {
            path.lineTo(
                xPos,
                relativeY + val * multiplier);
            xPos += step;

        });
        this.drawingContext.stroke(path);
    }
}