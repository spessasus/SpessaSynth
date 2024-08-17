import { FONT_SIZE } from './renderer.js'
import { drawNotes } from './draw_notes.js'
/**
 * Renders a single frame
 * @this {Renderer}
 * @param auto {boolean} if set to false, the renderer won't clear the screen or request an animation frame. Defaults to true.
 */
export function render(auto = true)
{
    if (auto) {
        // Keep trying to initialize copies of the needed document elements if null
        if (this.midiOutElement == null || this.voiceMeterText == null) {
            this.midiOutElement = document.getElementById('midi_output_selector');
            this.voiceMeterText = document.querySelector('div.voice_meter.main_controller_element:not(.editable)');
            if (this.midiOutElement != null && this.voiceMeterText != null) {
                // Initialize variable needed for tracking state
                this.hasRendered = 0;
            }
        }

        // Determine if we need to increment hasRendered
        if (this.midiOutElement?.value === "-1") {
            // By far the most reliable way to get all actually sounding voices, unfortunately
            const voices = parseInt(this.voiceMeterText.textContent.replace(/\D/g, ''), 10);
            if (voices > 0 || (!this.seq?.paused && this.notesOnScreen > 0)) {
                this.hasRendered = 0;
            } else if (voices === 0 || (this.seq?.paused && voices === 0)) {
                this.hasRendered++;
            }
        }

        // Now we either skip rendering the frame or not
        if (!this.renderBool || this.hasRendered > 1) {
            requestAnimationFrame(this.render.bind(this));
            return;
        } else {
            this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    if (this.renderAnalysers && !this.synth.highPerformanceMode)
    {
        // draw the individual analysers
        this.renderWaveforms();
    }
    console.log("r")

    if (this.renderNotes && this.noteTimes)
    {
        /**
         * Compute positions
         * @type {NoteToRender[]}
         */
        let notesToDraw = this.computeNotePositions(this.synth.highPerformanceMode);

        // draw the notes from longest to shortest (non black midi mode)
        if(!this.synth.highPerformanceMode)
        {
            drawNotes(notesToDraw, this.drawingContext, this.sideways);
        }
    }

    // calculate fps
    let timeSinceLastFrame = performance.now() - this.frameTimeStart;
    this.frameTimeStart = performance.now();
    let fps = 1000 / timeSinceLastFrame;

    // draw note count and fps
    this.drawingContext.textBaseline = "hanging";
    this.drawingContext.textAlign = "end";
    this.drawingContext.font = `${FONT_SIZE}px Verdana`;
    this.drawingContext.fillStyle = "white";
    this.drawingContext.strokeStyle = "white";
    this.drawingContext.fillText(`${this.notesOnScreen} notes`, this.canvas.width, FONT_SIZE + 5);
    this.drawingContext.fillText(Math.round(fps).toString() + " FPS", this.canvas.width, 5);
    if(this.onRender)
    {
        this.onRender();
    }
    if(auto)
    {
        requestAnimationFrame(this.render.bind(this));
    }
}
