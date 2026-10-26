import { BaseRenderer, FONT_SIZE, PRESET_NAMES_FONT_SIZE } from "./renderer.js";
import { drawNotes } from "./draw_notes.js";
import { isMobile } from "../../utils/is_mobile.ts";
import { rendererModes } from "./renderer_modes.ts";

/**
 * Full frame render.
 * @param currentTime The current live time (for example synth time)
 * @param noteTime The note time, sequencer's time (MIDI song time).
 * @param forceStraight Force straight waveforms.
 */
export function renderFullFrame(
    this: BaseRenderer,
    currentTime: number,
    noteTime: number,
    forceStraight: boolean
) {
    this.clearFrame();
    this.updateCanvasColors();
    this.calculateRenderArea();
    if (
        this.colorRenderWidth !== this.width ||
        this.colorRenderHeight !== this.height
    ) {
        this.computeColors(this.colors.map((color) => color.plain));
    }
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(
        this.bounds.x,
        this.bounds.y,
        this.bounds.width,
        this.bounds.height
    );
    this.ctx.clip();
    this.ctx.translate(this.bounds.x, this.bounds.y);

    // Draw dot matrix
    if (this.renderDotDisplay) {
        this.dotMatrix.render(currentTime, this.width, this.height);
    }

    this.renderWaveforms(forceStraight);

    if (
        !this.highPerformanceMode && // Draw preset names
        this.showPresetNames &&
        this.rendererMode !== rendererModes.spectrumSingleMode &&
        this.rendererMode !== rendererModes.none
    ) {
        const waveWidth = this.width / 4;
        const waveHeight = this.height / 4;
        // Setup font
        // Scale down on mobile
        const devicePixelRatio =
            isMobile && typeof window !== "undefined"
                ? window.devicePixelRatio
                : 1;
        const fontSize = PRESET_NAMES_FONT_SIZE / devicePixelRatio;
        this.ctx.textBaseline = "top";
        this.ctx.textAlign = "start";
        this.ctx.font = `${fontSize}px monospace`;
        this.ctx.fillStyle = this.hudColor;
        const presetNames = this.programTracker.presetNames;
        // For every waveform
        for (let part = 0; part < 16; part++) {
            const x = part % 4;
            const y = Math.floor(part / 4);
            const relativeX = waveWidth * x;
            let relativeY = waveHeight * y;
            // Check for every channel that uses this waveform
            for (let chan = part; chan < presetNames.length; chan += 16) {
                // If used (by MIDI file) or currently active part (by something external)
                if (
                    this.programTracker.usedChannels.has(chan) ||
                    (this.voicesPlaying[part] &&
                        !this.programTracker.usedParts.has(part))
                ) {
                    this.ctx.fillText(presetNames[chan], relativeX, relativeY);
                    relativeY += fontSize;
                }
            }
        }
    }

    if (this.renderNotes && this.noteTimes) {
        /**
         * Compute positions
         */
        const notesToDraw = this.computeNotePositions(noteTime);

        // Draw the notes from longest to shortest (non-black midi mode)
        if (!this.highPerformanceMode) {
            drawNotes(notesToDraw, this.ctx, this.vertical);
        }
    }

    let fps = 0;
    if (this.showFps) {
        const timeSinceLastFrame = performance.now() - this.frameTimeStart;
        this.frameTimeStart = performance.now();
        fps = 1000 / timeSinceLastFrame;
    }

    // Draw note count and fps
    this.ctx.textBaseline = "top";
    this.ctx.textAlign = "end";
    // -1 to add some margin
    this.ctx.font = `${FONT_SIZE - 1}px monospace`;
    this.ctx.fillStyle = this.hudColor;

    let y = 0;
    // App version
    this.ctx.fillText(this.version, this.width, y);
    y += FONT_SIZE;
    if (this.showFps) {
        this.ctx.fillText(Math.round(fps).toString() + " FPS", this.width, y);
        y += FONT_SIZE;
    }
    // Note count
    this.ctx.fillText(`${this.notesOnScreen} notes`, this.width, y);
    // MIDI system
    y += FONT_SIZE;
    this.ctx.fillText(`${this.system.toUpperCase()} MODE`, this.width, y);
    if (this.showKeyboardMode) {
        y += FONT_SIZE;
        this.ctx.fillText(this.texts.keyboardMode, this.width, y);
    }

    // Left side
    let yIncrement;

    if (this.showPresetNames) {
        yIncrement = -FONT_SIZE;
        this.ctx.textBaseline = "bottom";
        y = this.height;
    } else {
        yIncrement = FONT_SIZE;
        y = 0;
    }
    this.ctx.textAlign = "start";
    if (this.showEngineMode) {
        this.ctx.fillText(
            this.workerMode
                ? "WORKER (CHROMIUM) MODE"
                : "WORKLET (FIREFOX) MODE",
            0,
            y
        );
        y += yIncrement;

        if (this.convolverMode) {
            this.ctx.fillText("CONVOLVER MODE", 0, y);
            y += yIncrement;
        }
    }

    // Draw time signature and tempo (if note times are available)
    if (this.noteTimes) {
        this.ctx.fillText(
            Math.round(this.currentTempo * 100) / 100 + "BPM",
            0,
            y
        );
        y += yIncrement;
        this.ctx.fillText(this.texts.timeSignature, 0, y);
    }

    // Show the hold pedal message
    if (this.showHoldPedal) {
        this.ctx.font = `${FONT_SIZE * 3}px monospace`;
        this.ctx.textAlign = "center";
        this.ctx.fillText(
            this.texts.holdPedal,
            this.width / 2,
            this.height / 4
        );
    }
    this.ctx.restore();

    this.keyboard.render(this.keyboardBounds, currentTime);
}
