import {Synthetizer} from "../midi_player/synthetizer/synthetizer.js";
import { calculateRGB } from '../utils/other.js'

const CHANNEL_ANALYSER_FFT = 512;
const DRUMS_ANALYSER_FFT = 2048;
const NOTE_MARGIN = 1;
const MIN_NOTE_TIME_MS = 20;
const FONT_SIZE = 16;
export class Renderer
{
    /**
     * Creates a new midi renderer for rendering notes visually.
     * @param channelColors {Array<string>}
     * @param synth {Synthetizer}
     * @param canvas {HTMLCanvasElement}
     */
    constructor(channelColors, synth, canvas) {
        this.noteFallingTimeMs = 1000;
        this.noteAfterTriggerTimeMs = 0;

        this.renderNotes = true;

        this.noteFieldWidth = canvas.width;
        this.noteFieldHeight = canvas.height;
        this.noteFieldTopOffset = 0;
        this.noteFieldLeftOffset = 0;
        this.noteFieldAngle = 0;

        this.channelColors = channelColors;
        this.synth = synth;
        this.notesOnScreen = 0;
        /**
         * If undefined, it's not paused
         * @type {number}
         */
        this.pauseTime = undefined;
        /**
         * @type {{midiNote: number, channel: number, startMs: number, timeMs: number}[]}
         */
        this.fallingNotes = [];

        /**
         * @type {AnalyserNode[]}
         */
        this.channelAnalysers = [];
        this.connectChannelAnalysers(synth);

        /**
         * @type {HTMLCanvasElement}
         */
        this.canvas = canvas;

        /**
         * @type {CanvasRenderingContext2D}
         */
        this.drawingContext = this.canvas.getContext("2d");
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
     * Creates a new note that starts falling
     * @param midiNote {number}
     * @param channel {number}
     * @param timeOffsetMs {number} in miliseconds, how low should the note start. 0 means it starts falling from the top
     */
    startNoteFall(midiNote, channel, timeOffsetMs = 0)
    {
        this.fallingNotes.push({
            midiNote: midiNote,
            channel: channel,
            timeMs: Infinity,
            startMs: this.getCurrentTime() - timeOffsetMs
        });
    };

    /**
     * Ends the falling note
     * @param midiNote {number}
     * @param channel {number}
     * @param timeOffsetMs {number} in miliseconds, how low should the note cut off. 0 means it cuts off from the top
     */
    stopNoteFall(midiNote, channel, timeOffsetMs = 0)
    {
        for(const note of this.fallingNotes.filter(note =>
            note.midiNote === midiNote &&
            note.channel === channel &&
            note.timeMs === Infinity))
        {
            note.timeMs = this.getCurrentTime() - timeOffsetMs - note.startMs;
            if(note.timeMs < MIN_NOTE_TIME_MS) note.timeMs = MIN_NOTE_TIME_MS;
        }
        //this.fallingNotes.sort((na, nb) => (nb.timeMs - na.timeMs) + (na.channel - nb.channel));
    }

    clearNotes()
    {
        this.fallingNotes = [];
    }

    /**
     * Gets absolute time
     * @returns {number}
     */
    getCurrentTime()
    {
        if(this.pauseTime === undefined)
        {
            return this.synth.currentTime * 1000;
        }
        else
        {
            return this.pauseTime;
        }
    }

    /**
     * Pauses the falling notes
     */
    pause()
    {
        if(this.pauseTime !== undefined)
        {
            return;
        }
        this.pauseTime = this.getCurrentTime();
    }

    resume()
    {
        if(this.pauseTime === undefined)
        {
            return;
        }
        const diff = this.pauseTime - this.synth.currentTime * 1000;
        this.fallingNotes.forEach(n => n.startMs -= diff);
        this.pauseTime = undefined;
    }

    /**
     * Renders a single frame
     * @param auto {boolean} if set to false, the renderer won't clear the screen or request an animation frame. Defaults to true.
     */
    render(auto = true)
    {
        if(!this.renderNotes)
        {
            if(auto) {
                requestAnimationFrame(() => {
                    this.render();
                });
            }
            return;
        }
        if(auto) {
            this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.drawingContext.textAlign = "start";
        this.drawingContext.textBaseline = "hanging";
        this.drawingContext.fillStyle = "#ccc";
        this.drawingContext.font = `${FONT_SIZE}px Sans`;


        // draw the individual analysers
        this.channelAnalysers.forEach((analyser, i ) => {
            if(this.synth.midiChannels[i].percussionChannel)
            {
                if(analyser.fftSize !== DRUMS_ANALYSER_FFT)
                {
                    analyser.fftSize = DRUMS_ANALYSER_FFT;
                }
            }

            this.drawChannelWaveform(analyser,
                i % 4,
                Math.floor(i / 4), i);
            i++;
        });


        // draw the notes
        this.drawingContext.save();
        this.drawingContext.translate(this.noteFieldWidth / 2 + this.noteFieldLeftOffset, this.noteFieldHeight / 2 + this.noteFieldTopOffset);
        this.drawingContext.rotate(this.noteFieldAngle * Math.PI / 180);
        this.drawingContext.translate(this.noteFieldWidth / -2, this.noteFieldHeight / -2);

        this.notesOnScreen = 0;
        const noteWidth = this.noteFieldWidth / 128 - (NOTE_MARGIN * 2);
        this.fallingNotes.forEach(note =>
        {
            const yPos = ((this.getCurrentTime() - note.startMs) / (this.noteFallingTimeMs + this.noteAfterTriggerTimeMs)) * this.noteFieldHeight;
            const xPos = (this.noteFieldWidth / 128) * note.midiNote;
            let noteHeight;
            if(note.timeMs === Infinity)
            {
                noteHeight = yPos;
            }
            else
            {
                noteHeight = (note.timeMs / (this.noteFallingTimeMs + this.noteAfterTriggerTimeMs)) * this.noteFieldHeight;
            }
            let noteColor = this.channelColors[note.channel]

            // make notes that are about to play or after being played, darker
            if (this.getCurrentTime() - note.startMs < this.noteFallingTimeMs ||
                this.getCurrentTime() - note.startMs - note.timeMs > this.noteFallingTimeMs) {

                // create the new color
                noteColor = calculateRGB(noteColor, v => v * 0.5);
            }
            const xFinal = xPos + NOTE_MARGIN;
            const yFinal = yPos - noteHeight;
            const hFinal = noteHeight - (NOTE_MARGIN * 2);

            this.drawingContext.fillStyle = noteColor;
            this.drawingContext.fillRect(xFinal, yFinal, noteWidth, hFinal);

            if(yPos - noteHeight <= this.noteFieldHeight)
            {
                this.notesOnScreen++;
            }

            // delete note if out of range (double height
            if(yPos - noteHeight > this.noteFieldHeight)
            {
                this.fallingNotes.splice(this.fallingNotes.indexOf(note), 1);
            }
        });
        this.drawingContext.restore();

        // calculate fps
        let timeSinceLastFrame = performance.now() - this.frameTimeStart;
        let fps = 1000 / timeSinceLastFrame;

        // draw note count and fps
        this.drawingContext.textAlign = "end";
        this.drawingContext.fillText(`${this.notesOnScreen} notes`, this.canvas.width + this.noteFieldLeftOffset, FONT_SIZE + 5);
        this.drawingContext.fillText(Math.round(fps).toString() + " FPS", this.canvas.width + this.noteFieldLeftOffset, 5);

        this.frameTimeStart = performance.now();
        if(auto) {
            requestAnimationFrame(() => {
                this.render();
            });
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
        const WAVE_MULTIPLIER = 2;
        const waveWidth = this.canvas.width / 4;
        const waveHeight = this.canvas.height / 4
        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y;
        const yRange = waveHeight;
        const xStep = waveWidth / waveform.length;

        // draw
        this.drawingContext.strokeStyle = this.channelColors[channelNumber];

        this.drawingContext.moveTo(
            relativeX,
            relativeY
        )
        this.drawingContext.beginPath();
        for(let i = 0; i < waveform.length; i++)
        {
            const currentData = waveform[i] * WAVE_MULTIPLIER;
            this.drawingContext.lineTo(
                relativeX + (i * xStep),
                relativeY + (currentData * yRange) + yRange / 2)
        }
        this.drawingContext.stroke();
        this.drawingContext.closePath();
    }
}