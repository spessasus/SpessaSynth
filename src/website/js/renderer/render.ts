import {
    FONT_SIZE,
    PRESET_NAMES_FONT_SIZE,
    Renderer,
    rendererModes
} from "./renderer.js";
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
        this.synth.voiceCount === 0 &&
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
        // Draw preset names
        if (
            this.showPresetNames &&
            this.rendererMode !== rendererModes.spectrumSingleMode &&
            this.rendererMode !== rendererModes.none
        ) {
            const waveWidth = this.canvas.width / 4;
            const waveHeight = this.canvas.height / 4;
            // Setup font
            this.drawingContext.textBaseline = "top";
            this.drawingContext.textAlign = "start";
            this.drawingContext.font = `${PRESET_NAMES_FONT_SIZE}px monospace`;
            this.drawingContext.fillStyle = "white";
            const names = this.programTracker.presetNames;
            const used = this.programTracker.usedChannels;
            const usedParts = this.programTracker.usedParts;
            // For every waveform
            for (let part = 0; part < 16; part++) {
                const x = part % 4;
                const y = Math.floor(part / 4);
                const relativeX = waveWidth * x;
                let relativeY = waveHeight * y;
                // Check for every channel that uses this waveform
                for (let chan = part; chan < names.length; chan += 16) {
                    // If used (by MIDI file) or currently active part (by something external)
                    if (
                        used.has(chan) ||
                        (this.voicesPlaying[part] && !usedParts.has(part))
                    ) {
                        this.drawingContext.fillText(
                            names[chan] ?? `CH ${part + 1}`,
                            relativeX,
                            relativeY
                        );
                        relativeY += PRESET_NAMES_FONT_SIZE;
                    }
                }
            }
        }
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

    // Draw dot matrix
    if (this.renderDotDisplay && this.showDisplayMatrix !== null) {
        this.drawDotMatrix();
    }

    // Calculate fps
    const timeSinceLastFrame = performance.now() - this.frameTimeStart;
    this.frameTimeStart = performance.now();
    const fps = 1000 / timeSinceLastFrame;

    // Draw note count and fps
    this.drawingContext.textBaseline = "top";
    this.drawingContext.textAlign = "end";
    this.drawingContext.font = `${FONT_SIZE}px monospace`;
    this.drawingContext.fillStyle = "white";

    let y = 0;
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
    if (this.showKeyboardMode) {
        y += FONT_SIZE;
        this.drawingContext.fillText(
            this.keyboardModeText,
            this.canvas.width,
            y
        );
    }

    // Left side
    let yIncrement;

    if (this.showPresetNames) {
        yIncrement = -FONT_SIZE;
        this.drawingContext.textBaseline = "bottom";
        y = this.canvas.height;
    } else {
        yIncrement = FONT_SIZE;
        y = 0;
    }
    this.drawingContext.textAlign = "start";
    // Engine mode
    this.drawingContext.fillText(
        this.workerMode ? "WORKER (CHROMIUM) MODE" : "WORKLET MODE",
        0,
        y
    );
    y += yIncrement;

    // Draw time signature and tempo (if note times are available)
    if (this.seq.midiData) {
        this.drawingContext.fillText(
            Math.round(this.seq.currentTempo * this.seq.playbackRate * 100) /
                100 +
                "BPM",
            0,
            y
        );
        y += yIncrement;
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
