import type { Renderer } from "./renderer.ts";

const DOT_MATRIX_PIXEL_WIDTH = 40;
const DOT_MATRIX_PIXEL_HEIGHT = 16;
const DOT_MATRIX_SIZE = 16;
const DOT_MATRIX_MARGIN = 2;
const DOT_MATRIX_BG_PADDING = 2;

const DOT_MATRIX_WIDTH =
    (DOT_MATRIX_PIXEL_WIDTH + DOT_MATRIX_MARGIN) * DOT_MATRIX_SIZE;
const DOT_MATRIX_HEIGHT =
    (DOT_MATRIX_PIXEL_HEIGHT + DOT_MATRIX_MARGIN) * DOT_MATRIX_SIZE;

const DOT_MATRIX_ACTIVE = "hsl(0,0%,10%)";
const DOT_MATRIX_BG_GS = "hsl(30, 100%, 50%)";
const DOT_MATRIX_INACTIVE_GS = "hsl(30, 100%, 40%)";

const DOT_MATRIX_BG_XG = "hsl(75, 100%, 50%)";
const DOT_MATRIX_INACTIVE_XG = "hsl(75, 100%, 40%)";
const SCALE_FACTOR = 800;

export function drawDotMatrix(this: Renderer) {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const scale = Math.min(canvasWidth, canvasHeight) / SCALE_FACTOR;
    const matrixWidth = DOT_MATRIX_WIDTH * scale;
    const matrixHeight = DOT_MATRIX_HEIGHT * scale;
    const matrixStartX = canvasWidth / 2 - matrixWidth / 2;
    const matrixStartY = canvasHeight / 2 - matrixHeight / 2;
    const bgPadding = scale * DOT_MATRIX_BG_PADDING;
    const dotWidth = scale * DOT_MATRIX_PIXEL_WIDTH;
    const dotHeight = scale * DOT_MATRIX_PIXEL_HEIGHT;
    const dotMargin = scale * DOT_MATRIX_MARGIN;

    const isGS = this.showDisplayMatrix === "gs";
    this.drawingContext.fillStyle = isGS ? DOT_MATRIX_BG_GS : DOT_MATRIX_BG_XG;
    this.drawingContext.fillRect(
        matrixStartX - bgPadding,
        matrixStartY - bgPadding,
        matrixWidth + 2 * bgPadding,
        matrixHeight + 2 * bgPadding
    );

    for (let row = 0; row < DOT_MATRIX_SIZE; row++) {
        for (let col = 0; col < DOT_MATRIX_SIZE; col++) {
            this.drawingContext.fillStyle = this.displayMatrix[row][col]
                ? DOT_MATRIX_ACTIVE
                : isGS
                  ? DOT_MATRIX_INACTIVE_GS
                  : DOT_MATRIX_INACTIVE_XG;
            this.drawingContext.fillRect(
                matrixStartX + col * (dotWidth + dotMargin),
                matrixStartY + row * (dotHeight + dotMargin),
                dotWidth,
                dotHeight
            );
        }
    }
}
