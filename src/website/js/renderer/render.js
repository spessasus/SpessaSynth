import { FONT_SIZE } from './renderer.js'
import { drawNotes } from './draw_notes.js'
/**
 * Renders a single frame
 * @this {Renderer}
 * @param auto {boolean} if set to false, the renderer won't clear the screen or request an animation frame. Defaults to true.
 */
export function render(auto = true)
{
    if (!this.renderBool)
    {
        if (auto)
        {
            requestAnimationFrame(this.render.bind(this));
        }
        return;
    }

    if (auto)
    {
        this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
