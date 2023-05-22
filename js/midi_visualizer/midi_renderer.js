import {MidiSynthetizer} from "../midi_player/midi_synthetizer.js";
import {formatTime} from "../utils/text_formatting.js";

const SMOOTHING_CONSTANT = 0.8;
export class MidiRenderer
{
    /**
     * Creates a new midi renderer for rendering notes visually.
     * @param channelColors {Array<string>}
     * @param analyser {AnalyserNode}
     */
    constructor(channelColors, analyser) {
        this.noteFallingSpeed = 1000;

        this.renderNotes = true;
        this.channelColors = channelColors;
        this.analyser = analyser;
        this.analyser.fftSize = 1024;
        /**
         * @type {HTMLCanvasElement}
         */
        this.canvas = document.getElementById("note_canvas");
        this.canvas.width = window.innerWidth;
        this.canvas.height = 800;
        /**
         * @type {CanvasRenderingContext2D}
         */
        this.drawingContext = this.canvas.getContext("2d");
    }

    /**
     * Start rendering the track for given synth
     * @param synth {MidiSynthetizer}
     */
    startSynthRendering(synth) {
        this.synthToRender = synth;
    }

    /**
     * @param callback {function(time: string)}
     */
    render(callback)
    {
        if(!this.renderNotes)
        {
            requestAnimationFrame(() => {
                this.render(callback);
            });
            return;
        }
        this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let waveform = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(waveform);

        // draw the line
        this.drawingContext.strokeStyle = "#ccc";
        let x = 0;
        let step = this.canvas.width / this.analyser.frequencyBinCount;

        let waveRange = this.canvas.height + 5;

        this.drawingContext.beginPath();
        this.drawingContext.moveTo(0, waveRange - ((waveform[0] / 255) * waveRange));
        for(let i = 0; i < waveform.length; i++)
        {
            let val = waveform[i] / 255;
            this.drawingContext.lineTo(x, waveRange - (val * waveRange));
            x += step;
        }
        this.drawingContext.stroke();
        this.drawingContext.closePath();

        if(this.synthToRender) {
            let notesToPlay = [];

            let currentTime = this.synthToRender.currentTime;
            for (let trackNumber = 0; trackNumber < this.synthToRender.midiData.tracksAmount; trackNumber++) {
                let track = this.synthToRender.midiData.decodedTracks[trackNumber];

                let i = (track.lastNoteId ? track.lastNoteId : 0);
                let first = true;

                for (; i < track.length; i++) {
                    let event = track[i];
                    // must be a note on and velocity larger than 0
                    if (event.type !== "Note On" || event.data[1] === 0) {
                        continue;
                    }

                    let noteTime = event.msLength;
                    let currentDeltaMs = this.synthToRender.getDeltaAsMs(event.deltaTotal);

                    if (currentDeltaMs > (currentTime * 1000) + this.noteFallingSpeed + noteTime) {
                        break;
                    }
                    if (currentDeltaMs < (currentTime * 1000) - noteTime) {
                        continue;
                    }
                    if (first) {
                        first = false;
                        track.lastNoteId = i;
                    }
                    notesToPlay.push(event);
                }

                // sort the notes to play the shortest last
                notesToPlay.sort((note1, note2) => note2.msLength - note1.msLength);

                for (let event of notesToPlay) {
                    let noteTime = event.msLength;
                    if (noteTime < 30) {
                        // make percussion visible
                        noteTime = 30;
                    }
                    let noteColor = this.channelColors[event.channel];
                    let currentDeltaMs = this.synthToRender.getDeltaAsMs(event.deltaTotal);

                    // make notes that are about to play darker
                    if (currentDeltaMs > (currentTime * 1000)) {
                        if (!noteColor) {
                            console.error(event.channel);
                        }
                        let rgbaValues = noteColor.match(/\d+(\.\d+)?/g).map(parseFloat);

                        // multiply the rgb values by 0.5 (50% brighntess)
                        let newRGBValues = rgbaValues.slice(0, 3).map(value => value * 0.5);

                        // create the new color
                        noteColor = `rgba(${newRGBValues.join(", ")}, ${rgbaValues[3]})`;
                    }

                    let noteHeightPx = (noteTime / this.noteFallingSpeed) * this.canvas.height;
                    this.drawingContext.fillStyle = noteColor;
                    let xPos = (this.canvas.width / 128) * event.data[0];
                    let yPos = this.canvas.height - (this.canvas.height * ((currentDeltaMs - (currentTime * 1000)) / this.noteFallingSpeed)) - noteHeightPx + 2;
                    this.drawingContext.fillRect(xPos + 1, yPos, this.canvas.width / 128 - 2, noteHeightPx - 4);
                }
            }

            let timeSinceLastFrame = performance.now() - this.frameTimeStart;
            let fps = 1000 / timeSinceLastFrame;
            callback(`FPS: ${Math.round(fps)} ${formatTime(Math.round(currentTime)).time}/${formatTime(this.synthToRender.duration).time}`);
            let smoothing = (1 - timeSinceLastFrame) * SMOOTHING_CONSTANT;
            if(smoothing > 0 && smoothing < 1)
            {
                this.analyser.smoothingTimeConstant = smoothing;
            }
            this.frameTimeStart = performance.now();
        }
        requestAnimationFrame(() => {
            this.render(callback);
        });
    }
}