/**
 * Draw_notes.js
 * purpose: renders notes with effects to the canvas
 */
import type { NoteToRender } from "./renderer.ts";

const STROKE_COLOR = "#000";
const PRESSED_EFFECT_OPACITY = 0.5;

export function drawNotes(
    notesToDraw: NoteToRender[],
    drawingContext: CanvasRenderingContext2D,
    sideways: boolean
) {
    // Render the pressed effect first
    for (const n of notesToDraw) {
        if (n.pressedProgress === 0) {
            continue;
        }
        drawingContext.fillStyle = n.color;
        const effectStrength = n.pressedProgress * n.velocity;
        drawingContext.globalAlpha = PRESSED_EFFECT_OPACITY * effectStrength;
        if (sideways) {
            drawingContext.fillRect(
                n.xPos,
                n.yPos - n.height * effectStrength,
                n.width,
                n.height * (effectStrength * 2 + 1)
            );
            drawingContext.globalAlpha = 1;
            continue;
        }
        drawingContext.fillRect(
            n.xPos - n.width * effectStrength,
            n.yPos,
            n.width * (effectStrength * 2 + 1),
            n.height
        );
        drawingContext.globalAlpha = 1;
    }

    for (const n of notesToDraw) {
        // Save and change color
        drawingContext.fillStyle = n.color;
        drawingContext.save();

        // Draw the rectangle
        drawingContext.translate(n.xPos, n.yPos);
        drawingContext.fillRect(0, 0, n.width, n.height);
        drawingContext.restore();

        // Draw the outline
        drawingContext.strokeStyle = STROKE_COLOR;
        drawingContext.lineWidth = n.stroke;
        drawingContext.strokeRect(n.xPos, n.yPos, n.width, n.height);
    }
}
