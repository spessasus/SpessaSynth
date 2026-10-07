import type { Renderer } from "./renderer.ts";

const DOT_MATRIX_SIZE = 16;
const DOT_MATRIX_MARGIN = 0.02;

const DOT_MATRIX_BG_GS = "hsl(30, 100%, 40%)";

const DOT_MATRIX_BG_XG = "hsl(75, 100%, 40%)";

export const SC8850_MATRIX_WIDTH = 160;
export const SC8850_MATRIX_HEIGHT = 64;

const SC8850_DOT_MATRIX_BG = DOT_MATRIX_BG_GS;

export function drawDotMatrix(this: Renderer) {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const dotWidth = canvasWidth / DOT_MATRIX_SIZE;
    const dotHeight = canvasHeight / DOT_MATRIX_SIZE;
    const dotMargin = dotWidth * DOT_MATRIX_MARGIN;
    const dotMargin2 = dotMargin * 2;

    const isGS = this.showDisplayMatrix === "gs";
    this.drawingContext.fillStyle = isGS ? DOT_MATRIX_BG_GS : DOT_MATRIX_BG_XG;

    for (let row = 0; row < DOT_MATRIX_SIZE; row++) {
        for (let col = 0; col < DOT_MATRIX_SIZE; col++) {
            if (this.displayMatrix[row][col]) {
                this.drawingContext.fillStyle = isGS
                    ? DOT_MATRIX_BG_GS
                    : DOT_MATRIX_BG_XG;
                this.drawingContext.fillRect(
                    col * dotWidth + dotMargin,
                    row * dotHeight + dotMargin,
                    dotWidth - dotMargin2,
                    dotHeight - dotMargin2
                );
            }
        }
    }
}

let sc8850Canvas: HTMLCanvasElement | null = null;
let sc8850Ctx: CanvasRenderingContext2D | null = null;

export function drawSC8850DotMatrix(this: Renderer) {
    // Rendered through a 160x64 canvas to prevent the lines from showing up
    // (then send as image to the real canvas)
    if (!sc8850Canvas || !sc8850Ctx) {
        // Create the canvas here
        sc8850Canvas = document.createElement("canvas");
        sc8850Canvas.width = SC8850_MATRIX_WIDTH;
        sc8850Canvas.height = SC8850_MATRIX_HEIGHT;
        sc8850Ctx = sc8850Canvas.getContext("2d");
        if (!sc8850Ctx) {
            throw new Error("Failed to acquire context!");
        }
        sc8850Ctx.fillStyle = SC8850_DOT_MATRIX_BG;
    }
    sc8850Ctx.clearRect(0, 0, SC8850_MATRIX_WIDTH, SC8850_MATRIX_HEIGHT);
    for (let row = 0; row < SC8850_MATRIX_HEIGHT; row++) {
        for (let col = 0; col < SC8850_MATRIX_WIDTH; col++) {
            if (this.sc8850Matrix[row][col]) {
                // Draw the pixel
                sc8850Ctx.fillRect(col, row, 1, 1);
            }
        }
    }
    this.drawingContext.imageSmoothingEnabled = false;
    this.drawingContext.drawImage(
        sc8850Canvas,
        0,
        0,
        this.canvas.width,
        this.canvas.height
    );
    this.drawingContext.imageSmoothingEnabled = true;
}
