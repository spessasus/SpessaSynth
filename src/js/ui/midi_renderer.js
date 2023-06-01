import {MidiSynthetizer} from "../midi_player/synthetizer/midi_synthetizer.js";

const CHANNEL_ANALYSER_FFT = 128;
const NOTE_MARGIN = 1;
const MIN_NOTE_TIME_MS = 50;
export class MidiRenderer
{
    /**
     * Creates a new midi renderer for rendering notes visually.
     * @param channelColors {Array<string>}
     * @param synth {MidiSynthetizer}
     */
    constructor(channelColors, synth) {
        this.noteFallingSpeed = 1000;

        this.renderNotes = true;
        this.channelColors = channelColors;
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
        this.canvas = document.getElementById("note_canvas");
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        /**
         * @type {CanvasRenderingContext2D}
         */
        this.drawingContext = this.canvas.getContext("2d");
    }

    /**
     * Connect the 16 channels to their respective analysers
     * @param synth {MidiSynthetizer}
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
            startMs: performance.now() - timeOffsetMs
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
            // random to prevent notes having the same time and flashing
            note.timeMs = performance.now() - timeOffsetMs - note.startMs;
            if(note.timeMs < MIN_NOTE_TIME_MS) note.timeMs = MIN_NOTE_TIME_MS;
        }
        //this.fallingNotes.sort((na, nb) => (nb.timeMs - na.timeMs) + (na.channel - nb.channel));
    }

    stopAllNoteFalls()
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
            return performance.now();
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
            console.warn("Renderer already paused");
            return;
        }
        this.pauseTime = this.getCurrentTime();
    }

    resume()
    {
        if(this.pauseTime === undefined)
        {
            console.warn("Renderer not paused");
            return;
        }
        this.pauseTime = undefined;
    }

    render()
    {
        if(!this.renderNotes)
        {
            requestAnimationFrame(() => {
                this.render();
            });
            return;
        }
        this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // draw the individual analysers
        let i = 0;
        for(const analyser of this.channelAnalysers)
        {
            const waveform = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatTimeDomainData(waveform);
            this.drawChannelWaveform(waveform,
                i % 4,
                Math.floor(i / 4), i);
            i++;
        }

        // draw the notes
        this.notesOnScreen = 0;
        const noteWidth = this.canvas.width / 128 - (NOTE_MARGIN * 2);
        for(const note of this.fallingNotes)
        {
            const yPos = ((this.getCurrentTime() - note.startMs) / this.noteFallingSpeed) * this.canvas.height;
            const xPos = (this.canvas.width / 128) * note.midiNote;
            let noteHeight;
            if(note.timeMs === Infinity)
            {
                noteHeight = yPos;
            }
            else
            {
                noteHeight = (note.timeMs / this.noteFallingSpeed) * this.canvas.height;
            }
            let noteColor = this.channelColors[note.channel]
            //make notes that are about to play darker
            if (yPos < this.canvas.height) {
                let rgbaValues = noteColor.match(/\d+(\.\d+)?/g).map(parseFloat);

                // multiply the rgb values by 0.5 (50% brighntess)
                let newRGBValues = rgbaValues.slice(0, 3).map(value => value * 0.5);

                // create the new color
                noteColor = `rgba(${newRGBValues.join(", ")}, ${rgbaValues[3]})`;
            }
            this.drawingContext.fillStyle = noteColor;
            this.drawingContext.fillRect(xPos + NOTE_MARGIN, yPos - noteHeight, noteWidth, noteHeight - (NOTE_MARGIN * 2));

            if(yPos - noteHeight <= this.canvas.height)
            {
                this.notesOnScreen++;
            }

            // delete note if out of range (double height
            if(yPos - noteHeight > this.canvas.height * 2)
            {
                this.fallingNotes.splice(this.fallingNotes.indexOf(note), 1);
            }
        }

        // calculate fps
        let timeSinceLastFrame = performance.now() - this.frameTimeStart;
        let fps = 1000 / timeSinceLastFrame;

        // draw FPS
        this.drawingContext.fillStyle = "#ccc";
        this.drawingContext.textAlign = "start";
        this.drawingContext.font = "16px Sans";
        this.drawingContext.fillText(Math.round(fps).toString(), 0, 16);

        // draw note count
        this.drawingContext.textAlign = "end";
        this.drawingContext.fillText(`${this.notesOnScreen} notes`, this.canvas.width, 16);

        this.frameTimeStart = performance.now();
        requestAnimationFrame(() => {
            this.render();
        });
    }

    /**
     * Draws the channel waveforms
     * @param waveform {Float32Array}
     * @param x {number} from 0 to 3
     * @param y {number} from 0 to 3
     * @param channelNumber {number} 0-15
     */
    drawChannelWaveform(waveform, x, y, channelNumber)
    {
        const WAVE_MULTIPLIER = 2;

        const waveWidth = this.canvas.width / 4;
        const waveHeight = this.canvas.height / 4
        const relativeX = waveWidth * x;
        const relativeY = waveHeight * y;
        const yRange = waveHeight;
        const xStep = waveWidth / waveform.length;

        this.drawingContext.moveTo(
            relativeX,
            relativeY
        )
        this.drawingContext.strokeStyle = this.channelColors[channelNumber];
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