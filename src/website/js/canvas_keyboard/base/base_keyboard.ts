import type { InterfaceMode } from "../../../../server/saved_settings.ts";
import {
    DARK_FLAT_KEY_GRADIENT,
    DARK_KEY_COLOR_VALUE,
    DARK_KEY_GRADIENT_ANGLE_DEGREES,
    isSharpMIDINote,
    KEYBOARD_BACKGROUND_COLOR,
    KEYBOARD_GLOW_PX,
    LIGHT_FLAT_KEY_GRADIENT,
    LIGHT_KEY_COLOR_VALUE,
    LIGHT_KEY_GRADIENT_ANGLE_DEGREES,
    SHARP_KEY_COLOR_VALUE,
    SHARP_KEY_GRADIENT,
    SHARP_KEY_GRADIENT_ANGLE_DEGREES,
    SHARP_KEY_LENGTH_RATIO
} from "./key_style.ts";
import type { RenderBounds } from "../../renderer/base/renderer.ts";

export interface KeyboardOptions {
    keyRange: { min: number; max: number };
    channelColors: string[];
    mode: InterfaceMode;
    forceMaxVelocity: boolean;
    vertical: boolean;
    shown: boolean;
}

interface KeyRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface PressedKey {
    channel: number;
    velocity: number;
    pressTime: number;
    releaseTime?: number;
    releaseStartTilt?: number;
}

// Duration of key press and release tilt animation in seconds
export const KEY_TRANSITION_SECONDS = 0.1;
// Matches the old HTML keyboard
const KEYBOARD_HEIGHT_MULTIPLIER = 9.2;
// Key corner border radius ratio relative to the smaller canvas dimension
const KEY_BORDER_RADIUS_RATIO = 0.038;
// Minimum key corner border radius in pixels
const MIN_KEY_BORDER_RADIUS_PX = 1;
// Needed because otherwise they show at the very top
const WHITE_KEY_Y_OFFSET = 1;

// Horizontal reach ratio for white keys between two black keys
const WHITE_KEY_BETWEEN_REACH_RATIO = 0.95;
// Outer horizontal reach ratio for white keys adjacent to a single black key
const WHITE_KEY_ADJACENT_OUTER_REACH_RATIO = 0.952;
// Inner horizontal reach ratio for white keys adjacent to a single black key
const WHITE_KEY_ADJACENT_INNER_REACH_RATIO = 0.448;
// Vertical displacement ratio for the bottom edge of pressed keys
const KEY_PRESS_RAISE_RATIO = 0.16;
// Horizontal inward taper ratio for the sides of pressed keys
const KEY_PRESS_TAPER_RATIO = 0.12;
// Overall strength multiplier for the pressed key deformation effect
const KEY_PRESS_STRENGTH = 0.65;

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Keyboard rendering engine in the canvas, replacing the old HTML keyboard.
 */
export class BaseKeyboard {
    /**
     * X offset relative to the keyboard (so in vertical mode it's actually y offset)
     */
    public xOffset = 0;
    /**
     * Extra width of the keyboard's layout (in vertical mode it's the height),
     * letting animations stretch the axis along which the keys are spread
     */
    public widthOffset = 0;
    protected readonly ctx;
    protected options: KeyboardOptions;
    protected bounds: RenderBounds = { x: 0, y: 0, width: 0, height: 0 };
    protected readonly pressedKeys = new Map<number, PressedKey[]>();
    /**
     * Y offset relative to the keyboard (so in vertical mode it's actually x offset)
     */
    protected yOffset = 0;
    protected currentTime = 0;
    private currentRadius = 0;

    private readonly channelColors: number[][];

    public constructor(
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        options: KeyboardOptions
    ) {
        this.ctx = ctx;
        this.options = {
            ...options,
            shown: options.shown ?? true
        };
        this.channelColors = options.channelColors.map((c) => {
            const rgbValues = c.replaceAll(/[^\d,]/g, "").split(",");
            return rgbValues.map((v) => Number.parseInt(v));
        });
    }

    public get keyRange() {
        return { ...this.options.keyRange };
    }

    public get mode() {
        return this.options.mode;
    }

    public get vertical() {
        return this.options.vertical;
    }

    public set vertical(vertical: boolean) {
        this.options.vertical = vertical;
    }

    public get shown() {
        return this.options.shown ?? true;
    }

    public set shown(shown: boolean) {
        this.options.shown = shown;
        this.drawAt(this.currentTime);
    }

    public get forceMaxVelocity() {
        return this.options.forceMaxVelocity;
    }

    public set forceMaxVelocity(force: boolean) {
        this.options.forceMaxVelocity = force;
        this.drawAt(this.currentTime);
    }

    /**
     * Height of the keyboard, relative to its orientation
     * @protected
     */
    protected get actualHeight() {
        return this.vertical ? this.bounds.width : this.bounds.height;
    }

    /**
     * Width of the keyboard (+offset), relative to its orientation
     * @protected
     */
    protected get actualWidth() {
        return (
            (this.vertical ? this.bounds.height : this.bounds.width) +
            this.widthOffset
        );
    }

    public getSnapshot(): KeyboardOptions {
        return {
            ...this.options
        };
    }

    public getCurrentHeight(length: number) {
        const noteCount =
            this.options.keyRange.max - this.options.keyRange.min + 1;
        return (
            ((length + this.widthOffset) * KEYBOARD_HEIGHT_MULTIPLIER) /
            noteCount
        );
    }

    public setKeyRange(range: { min: number; max: number }) {
        if (
            range.min === this.options.keyRange.min &&
            range.max === this.options.keyRange.max
        ) {
            return;
        }
        this.options.keyRange = range;
        this.drawAt(this.currentTime);
    }

    public setMode(mode: InterfaceMode) {
        if (mode === this.options.mode) {
            return;
        }
        this.options.mode = mode;
        this.drawAt(this.currentTime);
    }

    public toggleMode() {
        this.setMode(this.options.mode === "light" ? "dark" : "light");
    }

    public pressKey(
        note: number,
        channel: number,
        velocity: number,
        time: number
    ) {
        if (note < 0 || note > 127) {
            return;
        }
        const active = this.pressedKeys.get(note) ?? [];
        active.push({
            channel,
            velocity: clamp(Math.round(velocity), 0, 127),
            pressTime: time
        });
        this.pressedKeys.set(note, active);
        this.drawAt(time);
    }

    public releaseKey(note: number, channel: number, time: number) {
        const active = this.pressedKeys.get(note);
        if (!active) {
            return;
        }
        for (let i = active.length - 1; i >= 0; i--) {
            if (
                active[i].channel === channel &&
                active[i].releaseTime === undefined
            ) {
                active[i].releaseTime = time;
                active[i].releaseStartTilt = clamp(
                    (time - active[i].pressTime) / KEY_TRANSITION_SECONDS,
                    0,
                    1
                );
                break;
            }
        }
        if (active.length === 0) {
            this.pressedKeys.delete(note);
        }
        this.drawAt(time);
    }

    public clearKeys(time: number) {
        this.pressedKeys.clear();
        this.drawAt(time);
    }

    public drawAt(time: number) {
        this.currentTime = time;
    }

    /**
     * Renders a full frame
     * @param bounds The bounds to render the keyboard at.
     * @param time The time to render the keyboard at.
     */
    public render(bounds: RenderBounds, time: number) {
        this.currentTime = time;
        this.bounds = bounds;
        const { width, height } = bounds;
        if (!this.shown || width <= 0 || height <= 0) {
            return;
        }

        // Clip to render bounds
        this.ctx.save();
        this.ctx.translate(bounds.x, bounds.y);
        this.ctx.beginPath();
        this.ctx.rect(0, 0, width, height);
        this.ctx.clip();

        // Clear render area
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = KEYBOARD_BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, width, height);

        // Draw in horizontal keyboard coordinates, then rotate into the bounds.
        if (this.vertical) {
            this.ctx.translate(width, 0);
            this.ctx.rotate(Math.PI / 2);
        }
        // Apply offsets
        this.ctx.translate(this.xOffset, this.yOffset);

        const range = this.options.keyRange;
        const keyCount = range.max - range.min + 1;
        const keyWidth = this.actualWidth / keyCount;

        this.currentRadius = Math.max(
            MIN_KEY_BORDER_RADIUS_PX,
            Math.min(width, height) * KEY_BORDER_RADIUS_RATIO
        );

        // Sharps are drawn after flats to appear on top
        const sharps: { note: number; rect: KeyRect }[] = [];

        for (let i = 0; i < keyCount; i++) {
            const note = range.min + i;
            const layoutIndex = note - range.min;
            const center = (layoutIndex + 0.5) * keyWidth;
            if (isSharpMIDINote(note)) {
                sharps.push({
                    note,
                    rect: {
                        x: layoutIndex * keyWidth,
                        y: 0,
                        width: keyWidth,
                        height: this.actualHeight * SHARP_KEY_LENGTH_RATIO
                    }
                });
            } else {
                // Draw right away
                this.drawKey(
                    note,
                    false,
                    this.getFlatKeyRect(note, center, keyWidth),
                    time
                );
            }
        }
        for (const key of sharps) {
            this.drawKey(key.note, true, key.rect, time);
        }

        // Prune released keys
        for (const [note, keys] of this.pressedKeys) {
            const remaining = keys.filter(
                (key) =>
                    key.releaseTime === undefined ||
                    time - key.releaseTime < KEY_TRANSITION_SECONDS
            );
            if (remaining.length === 0) {
                this.pressedKeys.delete(note);
            } else if (remaining.length !== keys.length) {
                this.pressedKeys.set(note, remaining);
            }
        }
        this.ctx.restore();
    }

    protected getFlatKeyRect(
        note: number,
        center: number,
        slot: number
    ): KeyRect {
        const left = isSharpMIDINote(note - 1);
        const right = note < 127 && isSharpMIDINote(note + 1);

        let start: number;
        let end: number;
        if (left && right) {
            // Extend to both
            start = center - WHITE_KEY_BETWEEN_REACH_RATIO * slot;
            end = center + WHITE_KEY_BETWEEN_REACH_RATIO * slot;
        } else if (left) {
            // Extend to left
            start = center - WHITE_KEY_ADJACENT_OUTER_REACH_RATIO * slot;
            end = center + WHITE_KEY_ADJACENT_INNER_REACH_RATIO * slot;
        } else {
            // Assume extend to right, shouldn't happen otherwise
            start = center - WHITE_KEY_ADJACENT_INNER_REACH_RATIO * slot;
            end = center + WHITE_KEY_ADJACENT_OUTER_REACH_RATIO * slot;
        }
        return {
            x: start,
            y: WHITE_KEY_Y_OFFSET,
            width: end - start,
            height: this.actualHeight - WHITE_KEY_Y_OFFSET
        };
    }

    private drawKey(note: number, sharp: boolean, rect: KeyRect, time: number) {
        const mode = this.mode;
        let startColor, endColor;
        if (sharp) {
            [startColor, endColor] = SHARP_KEY_GRADIENT;
        } else {
            [startColor, endColor] =
                mode === "dark"
                    ? DARK_FLAT_KEY_GRADIENT
                    : LIGHT_FLAT_KEY_GRADIENT;
        }
        const angle = sharp
            ? SHARP_KEY_GRADIENT_ANGLE_DEGREES
            : mode === "dark"
              ? DARK_KEY_GRADIENT_ANGLE_DEGREES
              : LIGHT_KEY_GRADIENT_ANGLE_DEGREES;

        // Create gradient
        const angleRad = (angle * Math.PI) / 180;
        const directionX = Math.sin(angleRad);
        const directionY = -Math.cos(angleRad);
        const halfLength =
            (Math.abs(directionX) * rect.width +
                Math.abs(directionY) * rect.height) /
            2;
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        const gradient = this.ctx.createLinearGradient(
            centerX - directionX * halfLength,
            centerY - directionY * halfLength,
            centerX + directionX * halfLength,
            centerY + directionY * halfLength
        );
        gradient.addColorStop(0, startColor);
        gradient.addColorStop(1, endColor);
        this.ctx.fillStyle = gradient;

        const presses = this.pressedKeys.get(note);

        if (presses?.length) {
            // Still active presses only
            const held = presses.filter((key) => key.releaseTime === undefined);
            // Last held key is the one we draw
            const press = held[held.length - 1];
            if (press) {
                // There is a key currently held
                const brightness = this.options.forceMaxVelocity
                    ? 1
                    : Math.max(0, Math.min(1, press.velocity / 127));

                const unpressedColor = sharp
                    ? SHARP_KEY_COLOR_VALUE
                    : mode === "light"
                      ? LIGHT_KEY_COLOR_VALUE
                      : DARK_KEY_COLOR_VALUE;

                const rgbaValues = this.channelColors[press.channel % 16];

                const newRGBValues = rgbaValues
                    .slice(0, 3)
                    .map(
                        (v) =>
                            unpressedColor + (v - unpressedColor) * brightness
                    );

                const alpha = rgbaValues[3] ?? 1;
                const color = `rgba(${newRGBValues.join(", ")}, ${alpha})`;
                this.ctx.save();
                if (this.mode === "dark") {
                    this.ctx.shadowColor = color;
                    this.ctx.shadowBlur = KEYBOARD_GLOW_PX * brightness;
                }
                this.ctx.fillStyle = color;
                this.drawPressedKey(
                    rect,
                    clamp(
                        (time - press.pressTime) / KEY_TRANSITION_SECONDS,
                        0,
                        1
                    )
                );
                this.ctx.restore();
                return;
            } else {
                const latest = presses[presses.length - 1];
                if (latest.releaseTime !== undefined) {
                    const elapsed = time - latest.releaseTime;
                    if (elapsed < KEY_TRANSITION_SECONDS) {
                        const tilt =
                            (latest.releaseStartTilt ?? 1) *
                            (1 - clamp(elapsed / KEY_TRANSITION_SECONDS, 0, 1));
                        this.drawPressedKey(rect, tilt);
                        return;
                    }
                }
            }
        }
        // Not pressed
        this.drawRoundedKey(rect);
    }

    private drawPressedKey(rect: KeyRect, tilt: number) {
        const r = this.currentRadius;
        const raise =
            rect.height * KEY_PRESS_RAISE_RATIO * KEY_PRESS_STRENGTH * tilt;
        const taper =
            rect.width * KEY_PRESS_TAPER_RATIO * KEY_PRESS_STRENGTH * tilt;
        const outerY = rect.y + rect.height - raise;
        const left = rect.x + taper;
        const right = rect.x + rect.width - taper;

        this.ctx.beginPath();
        // Top left
        this.ctx.moveTo(rect.x, rect.y);
        // Top right
        this.ctx.lineTo(rect.x + rect.width, rect.y);
        this.ctx.lineTo(rect.x + rect.width, rect.y);

        // Bottom right, rounded
        const p2PrevDx = rect.x + rect.width - right;
        const p2PrevDy = rect.y - outerY;
        const p2PrevLen = Math.hypot(p2PrevDx, p2PrevDy);
        const p2NextDx = left - right;
        const p2NextLen = Math.abs(p2NextDx);
        const p2PrevScale = r / Math.max(1, p2PrevLen);
        const p2NextScale = r / Math.max(1, p2NextLen);
        const c2BeforeX = right + p2PrevDx * p2PrevScale;
        const c2BeforeY = outerY + p2PrevDy * p2PrevScale;
        const c2AfterX = right + p2NextDx * p2NextScale;
        const c2AfterY = outerY;
        this.ctx.lineTo(c2BeforeX, c2BeforeY);
        this.ctx.quadraticCurveTo(right, outerY, c2AfterX, c2AfterY);

        // Bottom left, rounded
        const p3PrevDx = right - left;
        const p3PrevLen = Math.abs(p3PrevDx);
        const p3NextDx = rect.x - left;
        const p3NextDy = rect.y - outerY;
        const p3NextLen = Math.hypot(p3NextDx, p3NextDy);
        const p3PrevScale = r / Math.max(1, p3PrevLen);
        const p3NextScale = r / Math.max(1, p3NextLen);
        const c3BeforeX = left + p3PrevDx * p3PrevScale;
        const c3BeforeY = outerY;
        const c3AfterX = left + p3NextDx * p3NextScale;
        const c3AfterY = outerY + p3NextDy * p3NextScale;
        this.ctx.lineTo(c3BeforeX, c3BeforeY);
        this.ctx.quadraticCurveTo(left, outerY, c3AfterX, c3AfterY);

        // Corner 0: close back to top-left (rect.x, rect.y), radius = 0
        this.ctx.lineTo(rect.x, rect.y);
        this.ctx.quadraticCurveTo(rect.x, rect.y, rect.x, rect.y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    private drawRoundedKey(rect: KeyRect) {
        const r = this.currentRadius;
        this.ctx.beginPath();
        this.ctx.moveTo(rect.x, rect.y);
        this.ctx.lineTo(rect.x + rect.width, rect.y);
        this.ctx.lineTo(rect.x + rect.width, rect.y + rect.height - r);
        this.ctx.quadraticCurveTo(
            rect.x + rect.width,
            rect.y + rect.height,
            rect.x + rect.width - r,
            rect.y + rect.height
        );
        this.ctx.lineTo(rect.x + r, rect.y + rect.height);
        this.ctx.quadraticCurveTo(
            rect.x,
            rect.y + rect.height,
            rect.x,
            rect.y + rect.height - r
        );
        this.ctx.closePath();
        this.ctx.fill();
    }
}
