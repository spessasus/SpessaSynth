import type { Renderer } from "./renderer.ts";

const DOT_MATRIX_SIZE = 16;
const DOT_MATRIX_MARGIN = 0.02;

const DOT_MATRIX_BG_GS = "hsl(30, 100%, 40%)";

const DOT_MATRIX_BG_XG = "hsl(75, 100%, 40%)";

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
