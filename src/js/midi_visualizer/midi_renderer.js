import {MidiSequencer} from "../midi_player/sequencer/midi_sequencer.js";
import {MidiSynthetizer} from "../midi_player/synthetizer/midi_synthetizer.js";
import {formatTime} from "../utils/text_formatting.js";

const CHANNEL_ANALYSER_FFT = 128;
export class MidiRenderer
{
    /**
     * Creates a new midi renderer for rendering notes visually.
     * @param channelColors {Array<string>}
     */
    constructor(channelColors) {
        this.noteFallingSpeed = 1000;

        this.renderNotes = true;
        this.channelColors = channelColors;

        /**
         * @type {AnalyserNode[]}
         */
        this.channelAnalysers = [];
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
     * @param seq {MidiSequencer}
     * @param synth {MidiSynthetizer}
     */
    startSynthRendering(seq, synth) {
        this.sequencerToRender = seq;
        this.connectChannelAnalysers(synth);
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

        // draw main analyser
        // let waveform = new Uint8Array(this.analyser.frequencyBinCount);
        // this.analyser.getByteFrequencyData(waveform);
        // this.drawMainWaveform(waveform);

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
        if(this.sequencerToRender) {
            let notesToPlay = [];

            let currentTime = this.sequencerToRender.currentTime;
            for (let trackNumber = 0; trackNumber < this.sequencerToRender.midiData.tracksAmount; trackNumber++) {
                let track = this.sequencerToRender.midiData.decodedTracks[trackNumber];

                let i = (track.lastNoteId ? track.lastNoteId : 0);
                let first = true;

                for (; i < track.length; i++) {
                    let event = track[i];
                    // must be a note on and velocity larger than 0
                    if (event.type !== "Note On" || event.data[1] === 0) {
                        continue;
                    }

                    let noteTime = event.msLength;
                    let currentDeltaMs = this.sequencerToRender.getDeltaAsMs(event.deltaTotal);

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
                    let currentDeltaMs = this.sequencerToRender.getDeltaAsMs(event.deltaTotal);

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
            callback(`FPS: ${Math.round(fps)} ${formatTime(Math.round(currentTime)).time}/${formatTime(this.sequencerToRender.duration).time}`);
            this.frameTimeStart = performance.now();
        }
        requestAnimationFrame(() => {
            this.render(callback);
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