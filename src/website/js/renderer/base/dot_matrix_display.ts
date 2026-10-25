import type { MIDISystem } from "spessasynth_core";
import type { RendererCanvasFactory } from "./renderer.ts";

const DOT_MATRIX_SIZE = 16;
const DOT_MATRIX_MARGIN = 0.02;

const DOT_MATRIX_BG_GS = "hsl(30, 100%, 40%)";

const DOT_MATRIX_BG_XG = "hsl(75, 100%, 40%)";
const DISPLAY_MATRIX_TIMEOUT = 2.88;

const DOT_MATRIX_QUEUE_DELAY = 0.035;
export const SC8850_MATRIX_WIDTH = 160;
export const SC8850_MATRIX_HEIGHT = 64;

const SC8850_DOT_MATRIX_BG = DOT_MATRIX_BG_GS;

/**
 * Handling XG/GS dot matrix display for renderer.
 */
export class DotMatrixDisplay {
    /**
     * 160x64 bitmap
     */
    public readonly sc8850Matrix = Array.from(
        { length: SC8850_MATRIX_HEIGHT },
        () => new Array<boolean>(SC8850_MATRIX_WIDTH).fill(false)
    );
    private readonly ctx;
    private currentTime = 0;
    /**
     * 16x16 bitmap
     */
    private readonly dotMatrix = Array.from({ length: 16 }, () =>
        new Array<boolean>(16).fill(false)
    );
    // Queue of sysex events
    private readonly queue = new Array<number[]>();
    private queueActive = false;
    private lastTime = 0;
    private nextQueueProcessTime = 0;
    /**
     * `XG` for green
     * `GS` for orange
     * `sc8850` for high-res
     * @protected
     */
    private currentMatrixType: MIDISystem | "sc8850" | null = null;
    private displayMatrixTimeout = 0;

    private readonly sc8850Canvas: HTMLCanvasElement | OffscreenCanvas;
    private readonly sc8850Ctx:
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D;

    public constructor(
        context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        canvasFactory: RendererCanvasFactory = (width, height) =>
            new OffscreenCanvas(width, height)
    ) {
        this.ctx = context;
        this.sc8850Canvas = canvasFactory(
            SC8850_MATRIX_WIDTH,
            SC8850_MATRIX_HEIGHT
        );

        const sc8850Ctx = this.sc8850Canvas.getContext("2d");
        if (!sc8850Ctx) {
            throw new Error("Failed to acquire context!");
        }
        sc8850Ctx.fillStyle = SC8850_DOT_MATRIX_BG;
        this.sc8850Ctx = sc8850Ctx;
    }

    public clear() {
        this.currentMatrixType = null;
    }

    public displayMessage(syx: number[]) {
        // Parse 8850 right away
        if (syx[0] === 0x41 && syx[2] === 0x45 && syx[4] === 0x20) {
            this.lastTime = this.currentTime;
            this.parseSyx(syx);
            return;
        }
        // Buffer messages into a queue if needed
        if (
            this.queue.length > 0 ||
            Math.abs(this.lastTime - this.currentTime) < 0.01
        ) {
            this.queue.push(syx);
            if (!this.queueActive) {
                this.processQueue();
            }
            return;
        }
        this.lastTime = this.currentTime;
        this.parseSyx(syx);
    }

    /**
     * Advances the message queue and the display timeout without drawing.
     * @param currentTime The current time, in seconds.
     * @returns True if a matrix should be drawn.
     */
    public advance(currentTime: number) {
        this.currentTime = currentTime;
        if (this.currentMatrixType === null) {
            return false;
        }
        if (this.nextQueueProcessTime <= currentTime) {
            this.processQueue();
        }
        if (this.displayMatrixTimeout <= currentTime) {
            this.displayMatrixTimeout = 0;
            this.currentMatrixType = null;
        }
        return true;
    }

    public render(currentTime: number, width: number, height: number) {
        if (!this.advance(currentTime)) {
            return;
        }
        // 8850 is hi-res
        if (this.currentMatrixType === "sc8850") {
            this.renderSC8850Matrix(width, height);
        } else {
            this.renderDotMatrix(width, height);
        }
    }

    private parseSyx(syx: number[]) {
        const isYamaha = syx[0] === 0x43;
        const isRoland = syx[0] === 0x41;
        if (isRoland && syx[2] === 0x45 && syx[4] === 0x20) {
            // SC-8850
            const section = syx[5];
            if (section > 15) {
                return;
            }
            const syxOffset = 7;
            const rows = Array.from({ length: 4 }, () =>
                new Array<boolean>(160).fill(false)
            );
            for (let rowNum = 0; rowNum < 4; rowNum++) {
                for (let byte = 0; byte < 27; byte++) {
                    const data = syx[syxOffset + rowNum * 27 + byte];
                    for (let p = 0; p < 6; p++) {
                        const colNum = byte * 6 + p;
                        if (colNum >= 160) {
                            continue;
                        }
                        rows[rowNum][colNum] = ((data >> (5 - p)) & 1) === 1;
                    }
                }
            }

            const matrix = this.sc8850Matrix;
            for (let rowNum = 0; rowNum < 4; rowNum++) {
                for (let colNum = 0; colNum < 160; colNum++) {
                    matrix[section * 4 + rowNum][colNum] = rows[rowNum][colNum];
                }
            }
            this.currentMatrixType = "sc8850";
            this.displayMatrixTimeout =
                this.currentTime + DISPLAY_MATRIX_TIMEOUT;
        }
        if (
            isRoland &&
            syx[2] === 0x45 &&
            syx[3] === 0x12 &&
            syx[4] === 0x10 &&
            syx[5] === 0x01 &&
            syx[6] === 0x00
        ) {
            // Roland Dot Matrix
            const syxOffset = 7;
            const matrix = this.dotMatrix;
            for (let rowNum = 0; rowNum < 16; rowNum++) {
                let colNum = 0;
                for (let i = 4; i >= 0; i--) {
                    matrix[rowNum][colNum++] =
                        ((syx[syxOffset + rowNum] >> i) & 1) === 1;
                }
                for (let i = 4; i >= 0; i--) {
                    matrix[rowNum][colNum++] =
                        ((syx[syxOffset + rowNum + 16] >> i) & 1) === 1;
                }
                for (let i = 4; i >= 0; i--) {
                    matrix[rowNum][colNum++] =
                        ((syx[syxOffset + rowNum + 32] >> i) & 1) === 1;
                }
                matrix[rowNum][colNum] =
                    ((syx[syxOffset + 48 + rowNum] >> 4) & 1) === 1;
            }

            this.currentMatrixType = "gs";
            this.displayMatrixTimeout =
                this.currentTime + DISPLAY_MATRIX_TIMEOUT;
        }
        if (isYamaha && syx[3] === 0x07) {
            // Yamaha Display Bitmap
            const syxOffset = 5;
            const matrix = this.dotMatrix;
            for (let rowNum = 0; rowNum < 16; rowNum++) {
                let colNum = 0;
                for (let i = 6; i >= 0; i--) {
                    matrix[rowNum][colNum++] =
                        ((syx[syxOffset + rowNum] >> i) & 1) === 1;
                }
                for (let i = 6; i >= 0; i--) {
                    matrix[rowNum][colNum++] =
                        ((syx[syxOffset + rowNum + 16] >> i) & 1) === 1;
                }
                for (let i = 6; i >= 5; i--) {
                    matrix[rowNum][colNum++] =
                        ((syx[syxOffset + rowNum + 32] >> i) & 1) === 1;
                }
            }

            this.currentMatrixType = "xg";
            this.displayMatrixTimeout =
                this.currentTime + DISPLAY_MATRIX_TIMEOUT;
        }
    }

    private processQueue() {
        const syx = this.queue.shift();
        if (!syx) {
            this.queueActive = false;
            return;
        }
        this.queueActive = true;
        this.parseSyx(syx);
        this.nextQueueProcessTime = this.currentTime + DOT_MATRIX_QUEUE_DELAY;
    }

    private renderSC8850Matrix(width: number, height: number) {
        // Rendered through a 160x64 canvas to prevent the lines from showing up
        // (then send as image to the real canvas)
        this.sc8850Ctx.clearRect(
            0,
            0,
            SC8850_MATRIX_WIDTH,
            SC8850_MATRIX_HEIGHT
        );
        for (let row = 0; row < SC8850_MATRIX_HEIGHT; row++) {
            for (let col = 0; col < SC8850_MATRIX_WIDTH; col++) {
                if (this.sc8850Matrix[row][col]) {
                    // Draw the pixel
                    this.sc8850Ctx.fillRect(col, row, 1, 1);
                }
            }
        }
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(this.sc8850Canvas, 0, 0, width, height);
        this.ctx.imageSmoothingEnabled = true;
    }

    private renderDotMatrix(canvasWidth: number, canvasHeight: number) {
        const dotWidth = canvasWidth / DOT_MATRIX_SIZE;
        const dotHeight = canvasHeight / DOT_MATRIX_SIZE;
        const dotMargin = dotWidth * DOT_MATRIX_MARGIN;
        const dotMargin2 = dotMargin * 2;

        const isGS = this.currentMatrixType === "gs";
        this.ctx.fillStyle = isGS ? DOT_MATRIX_BG_GS : DOT_MATRIX_BG_XG;

        for (let row = 0; row < DOT_MATRIX_SIZE; row++) {
            for (let col = 0; col < DOT_MATRIX_SIZE; col++) {
                if (this.dotMatrix[row][col]) {
                    this.ctx.fillStyle = isGS
                        ? DOT_MATRIX_BG_GS
                        : DOT_MATRIX_BG_XG;
                    this.ctx.fillRect(
                        col * dotWidth + dotMargin,
                        row * dotHeight + dotMargin,
                        dotWidth - dotMargin2,
                        dotHeight - dotMargin2
                    );
                }
            }
        }
    }
}
