import {Synthetizer} from "../../spessasynth_lib/synthetizer/synthetizer.js";
import { calculateRGB } from '../../spessasynth_lib/utils/other.js'
import { Sequencer } from '../../spessasynth_lib/sequencer/sequencer.js'

// analysers
const CHANNEL_ANALYSER_FFT = 512;
const DRUMS_ANALYSER_FFT = 2048;
const WAVE_MULTIPLIER = 2;

// note rendering
const DARKER_MULTIPLIER = 0.6;
const NOTE_MARGIN = 1;
const FONT_SIZE = 16;

// limits
const MIN_NOTE_HEIGHT_PX = 7;
const MAX_NOTES = 81572;
const MIN_NOTE_TIME_MS = 20;


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

        this.renderBool = true;
        this.renderAnalysers = true;
        this.renderNotes = true;
        this.noteCap = MAX_NOTES * (this.noteFallingTimeMs + this.noteAfterTriggerTimeMs) / 1000;

        this.channelColors = channelColors;
        this.darkerColors = this.channelColors.map(c => calculateRGB(c, v => v * DARKER_MULTIPLIER));
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
        if(this.noteCap < this.fallingNotes.length)
        {
            return;
        }
        if(this.renderNotes) {
            this.fallingNotes.push({
                midiNote: midiNote,
                channel: channel,
                timeMs: Infinity,
                startMs: this.getCurrentTime() - timeOffsetMs
            });
        }
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

    /**
     * @param noteTimes {NoteTimes}
     * @param sequencer {Sequencer}
     */
    connectSequencer(noteTimes, sequencer)
    {
        this.noteTimes = noteTimes;
        this.seq = sequencer;
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
    render(auto = true) {
        if (!this.renderBool) {
            if (auto) {
                requestAnimationFrame(() => {
                    this.render();
                });
            }
            return;
        }
        if (auto) {
            this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.noteCap = MAX_NOTES * (this.noteFallingTimeMs + this.noteAfterTriggerTimeMs) / 1000;

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

            this.drawingContext.save();

            // draw the notes

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

            this.noteTimes.forEach((channel, channelNumder) => {

                if(channel.renderStartIndex >= channel.notes.length) return;

                let noteIndex = channel.renderStartIndex;
                const notes = channel.notes;
                let note = notes[noteIndex];

                // while the note start is in range
                while(note.start <= currentEndTime){
                    noteIndex++;
                    // cap notes
                    if(this.notesOnScreen > MAX_NOTES)
                    {
                        return;
                    }

                    const noteSum = note.start + note.length

                    // if the note is out of range, append the render start index
                    if(noteSum < currentStartTime)
                    {
                        channel.renderStartIndex = noteIndex - 1;
                    }
                    else {
                        const height = (note.length / fallingTimeSeconds) * this.canvas.height - (NOTE_MARGIN * 2);

                        // height less than that can be ommitted (come on)
                        if(height > MIN_NOTE_HEIGHT_PX) {
                            const yPos = this.canvas.height - height
                                - (((note.start - currentStartTime) / fallingTimeSeconds) * this.canvas.height + NOTE_MARGIN);

                            const xPos = keyStep * note.midiNote;

                            // determine if the note should be darker or not
                            if (note.start > currentSeqTime || noteSum < currentSeqTime) {
                                this.drawingContext.fillStyle = this.darkerColors[channelNumder];
                            } else {
                                this.drawingContext.fillStyle = this.channelColors[channelNumder];
                            }

                            this.drawingContext.fillRect(xPos, yPos, noteWidth, height);
                            this.notesOnScreen++;
                        }
                    }

                    if(noteIndex >= notes.length)
                    {
                        return;
                    }

                    note = notes[noteIndex];
                }
            })


            // this.fallingNotes.forEach(note => {
            //     const yPos = ((this.getCurrentTime() - note.startMs) / (this.noteFallingTimeMs + this.noteAfterTriggerTimeMs));
            //     const xPos = (this.canvas.width / 128) * note.midiNote;
            //     let noteHeight;
            //     if (note.timeMs === Infinity) {
            //         noteHeight = yPos;
            //     } else {
            //         noteHeight = (note.timeMs / (this.noteFallingTimeMs + this.noteAfterTriggerTimeMs));
            //     }
            //     let noteColor = this.channelColors[note.channel]
            //
            //     // make notes that are about to play or after being played, darker
            //     if (this.getCurrentTime() - note.startMs < this.noteFallingTimeMs ||
            //         this.getCurrentTime() - note.startMs - note.timeMs > this.noteFallingTimeMs) {
            //
            //         // create the new color
            //         noteColor = calculateRGB(noteColor, v => v * 0.5);
            //     }
            //     const xFinal = xPos + NOTE_MARGIN;
            //     const yFinal = yPos - noteHeight;
            //     const hFinal = noteHeight - (NOTE_MARGIN * 2);
            //
            //     this.drawingContext.fillStyle = noteColor;
            //     this.drawingContext.fillRect(xFinal, yFinal, noteWidth, hFinal);
            //
            //     if (yPos - noteHeight <= this.canvas.height) {
            //         this.notesOnScreen++;
            //     }
            //
            //     // delete note if out of range (double height
            //     if (yPos - noteHeight > this.canvas.height) {
            //         this.fallingNotes.splice(this.fallingNotes.indexOf(note), 1);
            //     }
            // });
        }

        this.drawingContext.restore();

        // calculate fps
        let timeSinceLastFrame = performance.now() - this.frameTimeStart;
        let fps = 1000 / timeSinceLastFrame;

        // draw note count and fps
        this.drawingContext.textAlign = "end";
        this.drawingContext.fillText(`${this.notesOnScreen} notes`, this.canvas.width, FONT_SIZE + 5);
        this.drawingContext.fillText(Math.round(fps).toString() + " FPS", this.canvas.width, 5);

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