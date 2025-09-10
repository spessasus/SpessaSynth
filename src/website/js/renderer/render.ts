import { FONT_SIZE, Renderer, rendererModes } from "./renderer.js";
import { drawNotes } from "./draw_notes.js";

let hasRenderedNoVoices = false;

/**
 * Renders a single frame
 * @param auto if set to false, the renderer won't clear the screen or request an animation frame. Defaults to true.
 * @param force ignores nothing to do
 */
export function render(this: Renderer, auto = true, force = false) {
    const nothingToDo =
        (this.seq === undefined || this?.seq?.paused) &&
        this.synth.voicesAmount === 0 &&
        this.rendererMode === rendererModes.waveformsMode &&
        !force;
    let forceStraight = false;
    if (!this.renderBool || nothingToDo) {
        if (hasRenderedNoVoices) {
            // No frames shall be drawn. Redo!
            if (auto) {
                requestAnimationFrame(() => this.render());
            }
            return;
        } else {
            hasRenderedNoVoices = true;
            forceStraight = true;
        }
    } else {
        hasRenderedNoVoices = false;
    }

    if (auto) {
        requestAnimationFrame(() => this.render());
        this.drawingContext.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );
    }

    const highPerf = this.synth.getMasterParameter("blackMIDIMode");
    if (!highPerf) {
        // Draw the individual analyzers
        this.renderWaveforms(forceStraight);
    }

    if (this.renderNotes && this.noteTimes) {
        /**
         * Compute positions
         */
        const notesToDraw = this.computeNotePositions(highPerf);

        // Draw the notes from longest to shortest (non-black midi mode)
        if (!highPerf) {
            drawNotes(notesToDraw, this.drawingContext, this.sideways);
        }
    }

    // Calculate fps
    const timeSinceLastFrame = performance.now() - this.frameTimeStart;
    this.frameTimeStart = performance.now();
    const fps = 1000 / timeSinceLastFrame;

    // Draw note count and fps
    this.drawingContext.textBaseline = "hanging";
    this.drawingContext.textAlign = "end";
    this.drawingContext.font = `${FONT_SIZE}px monospace`;
    this.drawingContext.fillStyle = "white";

    let y = 5;
    // App version
    this.drawingContext.fillText(this.version, this.canvas.width, y);
    y += FONT_SIZE;
    // FPS
    this.drawingContext.fillText(
        Math.round(fps).toString() + " FPS",
        this.canvas.width,
        y
    );
    y += FONT_SIZE;
    // Note count
    this.drawingContext.fillText(
        `${this.notesOnScreen} notes`,
        this.canvas.width,
        y
    );

    // Left side
    y = 5;
    this.drawingContext.textAlign = "start";
    // Engine mode
    this.drawingContext.fillText(
        this.workerMode ? "WORKER (CHROMIUM) MODE" : "WORKLET MODE",
        0,
        y
    );
    y += FONT_SIZE;

    // Draw time signature and tempo (if note times are available)
    if (this.seq.midiData) {
        this.drawingContext.fillText(
            Math.round(this.seq.currentTempo * this.seq.playbackRate * 100) /
                100 +
                "BPM",
            0,
            y
        );
        y += FONT_SIZE;
        this.drawingContext.fillText(this.currentTimeSignature, 0, y);
    }

    // Show the hold pedal message
    if (this.showHoldPedal) {
        this.drawingContext.font = `${FONT_SIZE * 3}px monospace`;
        this.drawingContext.textAlign = "center";
        this.drawingContext.fillText(
            this.holdPedalIsDownText,
            this.canvas.width / 2,
            this.canvas.height / 4
        );
    }

    this.onRender?.();
}
