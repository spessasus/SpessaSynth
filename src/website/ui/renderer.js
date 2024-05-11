import {Synthetizer} from "../../spessasynth_lib/synthetizer/synthetizer.js";
import { calculateRGB, consoleColors } from '../../spessasynth_lib/utils/other.js'
import { Sequencer } from '../../spessasynth_lib/sequencer/sequencer.js';

/**
 * @typedef {{xPos: number, yPos: number, height: number, width: number, stroke: number, color: CanvasGradient}} NoteToRender
 */

// analysers
const CHANNEL_ANALYSER_FFT = 512;
const DRUMS_ANALYSER_FFT = 2048;
const WAVE_MULTIPLIER = 2;
const ANALYSER_STROKE = 2;

// note rendering
const DARKER_MULTIPLIER = 0.6;
const GRADIENT_DARKEN = 0.5;
const STROKE_THICKNESS = 1;
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
    constructor(channelColors, synth, canvas)
    {
        // variables
        this.noteFallingTimeMs = 1000;
        this.noteAfterTriggerTimeMs = 0;
        this.noteRenderingMode = 0;

        this.lineThickness = ANALYSER_STROKE;
        this.normalAnalyserFft = CHANNEL_ANALYSER_FFT;
        this.drumAnalyserFft = DRUMS_ANALYSER_FFT;
        this.waveMultiplier = WAVE_MULTIPLIER;


        // booleans
        this._renderBool = true;
        this.renderAnalysers = true;
        this.renderNotes = true;
        this.drawActiveNotes = true;
        this.showVisualPitch = true;

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
        this.createChannelAnalysers(synth);
        this.connectChannelAnalysers(synth);
    }

    toggleDarkMode()
    {
        this.canvas.classList.toggle("light_mode");
    }

    /**
     * @param synth {Synthetizer}
     */
    createChannelAnalysers(synth)
    {
        // disconnect the analysers from earlier
        for(const analyser of this.channelAnalysers)
        {
            analyser.disconnect();
            this.channelAnalysers.splice(0, 1);
        }
        this.channelAnalysers = [];
        for(let i = 0; i < synth.midiChannels.length; i++)
        {
            // create the analyser
            const analyser = new AnalyserNode(synth.context, {
                fftSize: this.normalAnalyserFft
            });
            this.channelAnalysers.push(analyser);
        }
        // connect more channels to the same analysers on add
        synth.eventHandler.addEvent("newchannel", "renderer-new-channel", channel => {
            const targetAnalyser = this.channelAnalysers[(synth.midiChannels.length - 1) % this.channelAnalysers.length];
            channel.gainController.connect(targetAnalyser);
        })
    }

    /**
     * Connect the 16 channels to their respective analysers
     * @param synth {Synthetizer}
     */
    connectChannelAnalysers(synth)
    {
        for(let i = 0; i < synth.midiChannels.length; i++)
        {
            // connect the channel's output to the analyser
            synth.midiChannels[i].gainController.connect(this.channelAnalysers[i % this.channelAnalysers.length], 0);
        }
    }

    disconnectChannelAnalysers()
    {
        for (const channelAnalyser of this.channelAnalysers) {
            channelAnalyser.disconnect();
        }
        console.log("%cAnalysers disconnected!", consoleColors.recognized);
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
    render(auto = true)
    {
        if (!this.renderBool) {
            if (auto) {
                requestAnimationFrame(this.render.bind(this));
            }
            return;
        }
        // calculate fps
        let timeSinceLastFrame = performance.now() - this.frameTimeStart;
        let fps = 1000 / timeSinceLastFrame;

        if(timeSinceLastFrame <= 0)
        {
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


        if (this.renderAnalysers && !this.synth.highPerformanceMode) {
            // draw the individual analysers
            this.renderWaveforms();
        }

        if (this.renderNotes && this.noteTimes) {
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

            /**
             * Compute positions
             * @type {NoteToRender[]}
             */
            let notesToDraw = [];
            switch(this.noteRenderingMode)
            {
                default:
                    notesToDraw = this.computeNotePositions(currentStartTime,
                        currentEndTime,
                        fallingTimeSeconds,
                        minNoteHeight,
                        noteWidth,
                        currentSeqTime,
                        keyStep,
                        this.synth.highPerformanceMode);
                    break;

                case 1:
                    notesToDraw = this.computeNotePositionsChannel(currentStartTime,
                        currentEndTime,
                        fallingTimeSeconds,
                        minNoteHeight,
                        noteWidth,
                        currentSeqTime,
                        keyStep,
                        this.synth.highPerformanceMode);
                    break;
            }

            // draw the notes from longest to shortest (non black midi mode)
            if(!this.synth.highPerformanceMode)
            {
                notesToDraw.sort((n1, n2) => n2.height - n1.height);
                notesToDraw.forEach(n => {
                    this.drawingContext.save();
                    this.drawingContext.fillStyle = n.color;
                    this.drawingContext.translate(n.xPos, n.yPos);

                    this.drawingContext.fillRect(0, 0, n.width, n.height);
                    this.drawingContext.restore();

                    this.drawingContext.strokeStyle = STROKE_COLOR;
                    this.drawingContext.lineWidth = n.stroke;
                    this.drawingContext.strokeRect(n.xPos, n.yPos, n.width, n.height);
                })
            }
        }

        // draw note count and fps
        this.drawingContext.textAlign = "end";
        this.drawingContext.fillText(`${this.notesOnScreen} notes`, this.canvas.width, FONT_SIZE + 5);
        this.drawingContext.fillText(Math.round(fps).toString() + " FPS", this.canvas.width, 5);

        this.frameTimeStart = performance.now();
        if(auto) {
            requestAnimationFrame(this.render.bind(this));
        }
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

    renderWaveforms()
    {
        this.channelAnalysers.forEach((analyser, i) => {
            if (this.synth.midiChannels[i].percussionChannel) {
                if (analyser.fftSize !== this.drumAnalyserFft) {
                    analyser.fftSize = this.drumAnalyserFft;
                }
            }
            else if(analyser.fftSize !== this.normalAnalyserFft)
            {
                analyser.fftSize = this.normalAnalyserFft;
            }

            this.drawChannelWaveform(analyser,
                i % 4,
                Math.floor(i / 4), i);
            i++;
        });
    }

    /**
     * @param currentStartTime {number}
     * @param currentEndTime {number}
     * @param fallingTimeSeconds {number}
     * @param minNoteHeight {number}
     * @param noteWidth {number}
     * @param currentSeqTime {number}
     * @param keyStep {number}
     * @param renderImmediately {boolean}
     * @returns {NoteToRender[]}
     */
    computeNotePositions(currentStartTime,
                         currentEndTime,
                         fallingTimeSeconds,
                         minNoteHeight,
                         noteWidth,
                         currentSeqTime,
                         keyStep,
                         renderImmediately=false)
    {
        /**
         * compute note pitch bend visual shift (for each channel)
         * @type {number[]}
         */
        const pitchBendXShift = [];
        this.synth.midiChannels.forEach(channel => {
            // pitch range * (bend - 8192) / 8192)) * key width
            if(this.showVisualPitch) {
                pitchBendXShift.push((channel.channelPitchBendRange * ((channel.pitchBend - 8192) / 8192)) * keyStep);
            }
            else
            {
                pitchBendXShift.push(0);
            }
        })
        /**
         * @type {NoteToRender[]}
         */
        const notesToDraw = [];
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

                        if(renderImmediately)
                        {
                            // draw the notes right away, we don't care about the order
                            this.drawingContext.fillStyle = this.plainColors[channelNumder];
                            this.drawingContext.fillRect(xPos + STROKE_THICKNESS + NOTE_MARGIN,
                                yPos + STROKE_THICKNESS,
                                noteWidth - (STROKE_THICKNESS * 2),
                                height - (STROKE_THICKNESS * 2));
                        }
                        else {
                            // save the notes to draw
                            // determine if notes are active or not (i.e. currently playing)
                            // not active notes
                            if ((note.start > currentSeqTime || noteSum < currentSeqTime)) {
                                notesToDraw.push({
                                    xPos: xPos,
                                    yPos: yPos,
                                    height: height,
                                    width: noteWidth,
                                    stroke: STROKE_THICKNESS,
                                    // if we ignore drawing active notes, draw those with regular colors
                                    color: this.drawActiveNotes ? this.darkerColors[channelNumder] : this.channelColors[channelNumder],
                                })
                            } else {
                                // active notes
                                notesToDraw.push({
                                    xPos: xPos + pitchBendXShift[channelNumder], // add pitch bend shift only to active notes
                                    yPos: yPos,
                                    height: height,
                                    width: noteWidth,
                                    stroke: STROKE_THICKNESS,
                                    color: this.channelColors[channelNumder]
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
        return notesToDraw;
    }

    /**
     * @param currentStartTime {number}
     * @param currentEndTime {number}
     * @param fallingTimeSeconds {number}
     * @param minNoteHeight {number}
     * @param noteWidth {number}
     * @param currentSeqTime {number}
     * @param keyStep {number}
     * @param renderImmediately {boolean}
     * @returns {NoteToRender[]}
     */
    computeNotePositionsChannel(currentStartTime,
                         currentEndTime,
                         fallingTimeSeconds,
                         minNoteHeight,
                         noteWidth,
                         currentSeqTime,
                         keyStep,
                         renderImmediately = false)
    {
        /**
         * @type {NoteToRender[]}
         */
        const notesToDraw = [];

        const fieldWidth = this.canvas.width / 4;
        const fieldHeight = this.canvas.height / 4;
        minNoteHeight /= 4;
        noteWidth /= 4;
        keyStep /= 4;
        const margin = NOTE_MARGIN / 4;
        const innerWidth = noteWidth - (STROKE_THICKNESS / 2);

        this.noteTimes.forEach((channel, channelNumder) => {

            if(channel.renderStartIndex >= channel.notes.length) return;

            // compute note offset
            const yOffset = fieldHeight * Math.floor(channelNumder / 4);
            const xOffset = fieldWidth * (channelNumder % 4);

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
                    // % of total height times height minus margin
                    let height = ((note.length / fallingTimeSeconds) * fieldHeight) - (margin * 2);

                    // height less than that can be ommitted (come on)
                    if(height > minNoteHeight || this.notesOnScreen < 1000) {
                        if(firstNoteIndex === -1)
                        {
                            firstNoteIndex = noteIndex - 1;
                        }


                        let yPos = fieldHeight - height
                            - (((note.start - currentStartTime) / fallingTimeSeconds) * fieldHeight) + margin;

                        const xPos = keyStep * note.midiNote + margin;

                        // shrink the note when its leaving the renderer
                        if(yPos < 0)
                        {
                            height += yPos;
                            yPos = 0;
                        }
                        if(yPos + height > fieldHeight)
                        {
                            height -= (yPos + height - fieldHeight)
                        }


                        // determine if the note should be darker or not (or flat if black midi mode is on
                        if(renderImmediately)
                        {
                            // draw them right away, we don't care about the order
                            this.drawingContext.fillStyle = this.plainColors[channelNumder];
                            this.drawingContext.fillRect(xPos + STROKE_THICKNESS + margin + xOffset,
                                yPos + STROKE_THICKNESS + yOffset,
                                noteWidth,
                                height - (STROKE_THICKNESS / 2));
                        }
                        else {
                            // save the notes to draw
                            if ((note.start > currentSeqTime || noteSum < currentSeqTime) && this.drawActiveNotes) {
                                notesToDraw.push({
                                    xPos: xPos + xOffset,
                                    yPos: yPos + yOffset,
                                    height: height,
                                    width: innerWidth,
                                    stroke: STROKE_THICKNESS / 4,
                                    color: this.darkerColors[channelNumder]
                                })
                            } else {
                                notesToDraw.push({
                                    xPos: xPos + xOffset,
                                    yPos: yPos + yOffset,
                                    height: height,
                                    width: innerWidth,
                                    stroke: STROKE_THICKNESS / 4,
                                    color: this.channelColors[channelNumder]
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
        return notesToDraw;
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
        const multiplier = this.waveMultiplier * waveHeight;

        // draw
        this.drawingContext.lineWidth = this.lineThickness;
        this.drawingContext.strokeStyle = this.channelColors[channelNumber];
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(relativeX, relativeY + waveform[0] * multiplier);


        let xPos = relativeX;
        waveform.forEach((val)  => {
            this.drawingContext.lineTo(
                xPos,
                relativeY + val * multiplier);
            xPos += step;

        });
        this.drawingContext.stroke();
    }
}