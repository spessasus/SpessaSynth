import {
    isSharpMIDINote,
    KEYBOARD_GLOW_INTENSITY,
    KEYBOARD_GLOW_PX
} from "./key_style.ts";
import { type KeyboardThemeID, keyboardThemes } from "./keyboard_themes.ts";
import type {
    RenderBounds,
    RendererCanvasFactory
} from "../../renderer/base/renderer.ts";

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface KeyboardOptions {
    keyRange: { min: number; max: number };
    channelColors: string[];
    theme: KeyboardThemeID;
    forceMaxVelocity: boolean;
    glow: boolean;
    glowIntensity: number;
    vertical: boolean;
    shown: boolean;
}

interface KeyRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface KeyGlow {
    note: number;
    sharp: boolean;
    rect: KeyRect;
    tilt: number;
    color: string;
    blur: number;
    intensity: number;
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
// Create a gap at the top
const KEY_Y_OFFSET = 1;

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

export function clamp(value: number, min: number, max: number) {
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
    private currentKeyWidth = 0;
    /**
     * Pressed keys collected during the key pass,
     * Their glow is drawn above all keys
     */
    private readonly glows = new Array<KeyGlow>();
    private readonly canvasFactory: RendererCanvasFactory;
    /**
     * Each glow is blurred into this layer once, then the layer is stacked for intensity,
     * As blurring is far more expensive than copying the result.
     */
    private glowLayer?: {
        canvas: HTMLCanvasElement | OffscreenCanvas;
        ctx: Context2D;
    };

    private channelColors = new Array<number[]>();

    public constructor(
        ctx: Context2D,
        options: KeyboardOptions,
        canvasFactory: RendererCanvasFactory = (width, height) =>
            new OffscreenCanvas(width, height)
    ) {
        this.ctx = ctx;
        this.canvasFactory = canvasFactory;
        this.options = {
            ...options,
            shown: options.shown ?? true
        };
        this.setChannelColors(options.channelColors);
    }

    public get keyRange() {
        return { ...this.options.keyRange };
    }

    public get themeId() {
        return this.options.theme;
    }

    public get theme() {
        return keyboardThemes[this.options.theme];
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

    public get glow() {
        return this.options.glow;
    }

    public set glow(glow: boolean) {
        this.options.glow = glow;
        this.drawAt(this.currentTime);
    }

    public get glowIntensity() {
        return this.options.glowIntensity;
    }

    public set glowIntensity(intensity: number) {
        this.options.glowIntensity = intensity;
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

    /**
     * Sets the colors of the pressed keys for each channel.
     */
    public setChannelColors(colors: string[]) {
        this.options.channelColors = colors;
        this.channelColors = colors.map((c) => {
            const rgbValues = c.replaceAll(/[^\d,]/g, "").split(",");
            return rgbValues.map((v) => Number.parseInt(v));
        });
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

    public setTheme(theme: KeyboardThemeID) {
        if (theme === this.options.theme) {
            return;
        }
        this.options.theme = theme;
        this.drawAt(this.currentTime);
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

        this.ctx.save();
        this.ctx.translate(bounds.x, bounds.y);

        // Clear render area
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.fillStyle = this.theme.background;
        this.ctx.fillRect(0, 0, width, height);

        // Clip the render bounds
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, width, height);
        this.ctx.clip();

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

        this.currentKeyWidth = keyWidth;
        // Sharps are drawn after flats to appear on top
        const sharps: { note: number; rect: KeyRect }[] = [];

        for (let i = 0; i < keyCount; i++) {
            const note = range.min + i;
            const layoutIndex = note - range.min;
            const center = (layoutIndex + 0.5) * keyWidth;
            if (isSharpMIDINote(note)) {
                sharps.push({
                    note,
                    rect: this.applyGap({
                        x: layoutIndex * keyWidth,
                        y: KEY_Y_OFFSET,
                        width: keyWidth,
                        height:
                            this.actualHeight * this.theme.sharpLength -
                            KEY_Y_OFFSET
                    })
                });
            } else {
                // Draw right away
                this.drawKey(
                    note,
                    false,
                    this.applyGap(this.getFlatKeyRect(note, center, keyWidth)),
                    time
                );
            }
        }
        for (const key of sharps) {
            this.drawKey(key.note, true, key.rect, time);
        }

        // Glow goes above all keys and may reach outside the keyboard
        const keyTransform = this.ctx.getTransform();
        this.ctx.restore();
        this.ctx.restore();
        if (this.glows.length > 0) {
            this.drawGlowLayer(sharps, keyTransform);
            this.glows.length = 0;
        }

        this.pruneReleasedKeys(time);
    }

    /**
     * Removes the released keys that finished their transition.
     * @param time The current time.
     */
    public pruneReleasedKeys(time: number) {
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
            y: KEY_Y_OFFSET,
            width: end - start,
            height: this.actualHeight - KEY_Y_OFFSET
        };
    }

    private applyGap(rect: KeyRect): KeyRect {
        const gap = this.theme.gap * this.currentKeyWidth;
        return {
            ...rect,
            x: rect.x + gap / 2,
            width: Math.max(1, rect.width - gap)
        };
    }

    private drawKey(note: number, sharp: boolean, rect: KeyRect, time: number) {
        const style = sharp ? this.theme.black : this.theme.white;
        const { gradient: colors, angle, rest } = style;

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
        for (const [i, color] of colors.entries()) {
            gradient.addColorStop(i / Math.max(1, colors.length - 1), color);
        }
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

                const rgbaValues = this.channelColors[press.channel % 16];

                const newRGBValues = rgbaValues
                    .slice(0, 3)
                    .map((v, i) => rest[i] + (v - rest[i]) * brightness);

                const alpha = rgbaValues[3] ?? 1;
                const color = `rgba(${newRGBValues.join(", ")}, ${alpha})`;
                const tilt = clamp(
                    (time - press.pressTime) / KEY_TRANSITION_SECONDS,
                    0,
                    1
                );
                if (this.options.glow) {
                    // Squared, like MIDI velocity to gain mapping
                    const glow =
                        brightness * brightness * this.options.glowIntensity;
                    this.glows.push({
                        note,
                        sharp,
                        rect,
                        tilt,
                        color,
                        blur: KEYBOARD_GLOW_PX * glow,
                        intensity: KEYBOARD_GLOW_INTENSITY * glow
                    });
                }
                this.ctx.fillStyle = color;
                this.drawStyledKey(rect, tilt, sharp);
                return;
            } else {
                const latest = presses[presses.length - 1];
                if (latest.releaseTime !== undefined) {
                    const elapsed = time - latest.releaseTime;
                    if (elapsed < KEY_TRANSITION_SECONDS) {
                        const tilt =
                            (latest.releaseStartTilt ?? 1) *
                            (1 - clamp(elapsed / KEY_TRANSITION_SECONDS, 0, 1));
                        this.drawStyledKey(rect, tilt, sharp);
                        return;
                    }
                }
            }
        }
        // Not pressed
        this.drawStyledKey(rect, 0, sharp);
    }

    /**
     * Draws the glow around the visible part of a pressed key.
     * The key itself is filled too, which is invisible as it has the same color.
     * Not clipping the key out avoids jagged edges, as clips are not always antialiased.
     * @param ctx The glow layer.
     * @param glow The glowing key.
     * @param covering The rectangles of the keys drawn above this key.
     * @param alpha The opacity of this glow in the layer.
     */
    private drawGlow(
        ctx: Context2D,
        glow: KeyGlow,
        covering: { note: number; rect: KeyRect }[],
        alpha: number
    ) {
        const { raise, taper } = this.pressDeformation(glow.rect, glow.tilt);
        // The sides of a pressed key move inwards linearly towards the bottom
        const inset = (y: number) =>
            (taper * (y - glow.rect.y)) / (glow.rect.height - raise);
        const keyRight = glow.rect.x + glow.rect.width;

        const visibleKeyPath = () => {
            this.keyPath(ctx, glow.rect, glow.tilt, glow.sharp);
            for (const { rect } of covering) {
                const top = rect.y;
                const bottom = rect.y + rect.height;
                const coverRight = rect.x + rect.width;
                ctx.moveTo(Math.max(rect.x, glow.rect.x + inset(top)), top);
                ctx.lineTo(
                    Math.max(rect.x, glow.rect.x + inset(bottom)),
                    bottom
                );
                ctx.lineTo(
                    Math.min(coverRight, keyRight - inset(bottom)),
                    bottom
                );
                ctx.lineTo(Math.min(coverRight, keyRight - inset(top)), top);
                ctx.closePath();
            }
        };

        ctx.save();
        ctx.shadowColor = glow.color;
        ctx.shadowBlur = glow.blur;
        ctx.fillStyle = glow.color;
        ctx.globalAlpha = alpha;
        visibleKeyPath();
        ctx.fill();
        if (glow.sharp) {
            // Sharp glows come after the flat ones
            // An opaque body keeps the flat key glow off the pressed sharp key
            ctx.shadowColor = "transparent";
            ctx.globalAlpha = 1;
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * Blurs every glow once into the glow layer,
     * Then stacks the layer onto the canvas to reach the requested intensity.
     * @param sharps The sharp keys, which cover parts of the flat keys.
     * @param keyTransform The transform the keys were drawn with.
     */
    private drawGlowLayer(
        sharps: { note: number; rect: KeyRect }[],
        keyTransform: DOMMatrix
    ) {
        const { width, height } = this.ctx.canvas;
        if (
            this.glowLayer?.canvas.width !== width ||
            this.glowLayer.canvas.height !== height
        ) {
            const canvas = this.canvasFactory(width, height);
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                return;
            }
            this.glowLayer = { canvas, ctx };
        }
        const layer = this.glowLayer.ctx;

        let maxBlur = 0;
        let maxIntensity = 0;
        for (const glow of this.glows) {
            maxBlur = Math.max(maxBlur, glow.blur);
            maxIntensity = Math.max(maxIntensity, glow.intensity);
        }
        const margin = Math.ceil(maxBlur * 2);
        const x = Math.max(0, Math.floor(this.bounds.x) - margin);
        const y = Math.max(0, Math.floor(this.bounds.y) - margin);
        const regionWidth =
            Math.min(
                width,
                Math.ceil(this.bounds.x + this.bounds.width) + margin
            ) - x;
        const regionHeight =
            Math.min(
                height,
                Math.ceil(this.bounds.y + this.bounds.height) + margin
            ) - y;
        if (regionWidth <= 0 || regionHeight <= 0 || maxIntensity <= 0) {
            return;
        }

        layer.setTransform(1, 0, 0, 1, 0, 0);
        layer.clearRect(x, y, regionWidth, regionHeight);
        layer.setTransform(keyTransform);

        const copies = Math.ceil(maxIntensity);
        const visibleLength = this.vertical
            ? this.bounds.height
            : this.bounds.width;
        // Glows are in the key drawing order, so the sharp key glow is on top
        for (const glow of this.glows) {
            const start = glow.rect.x + this.xOffset;
            if (start + glow.rect.width < 0 || start > visibleLength) {
                // Not visible
                continue;
            }
            // Sharp keys cover parts of the flat key, so they are not glowing
            const covering = glow.sharp
                ? []
                : sharps.filter(
                      (s) =>
                          s.note === glow.note - 1 || s.note === glow.note + 1
                  );
            this.drawGlow(layer, glow, covering, glow.intensity / copies);
        }

        for (let i = 0; i < copies; i++) {
            this.ctx.drawImage(
                this.glowLayer.canvas,
                x,
                y,
                regionWidth,
                regionHeight,
                x,
                y,
                regionWidth,
                regionHeight
            );
        }
    }

    private drawStyledKey(rect: KeyRect, tilt: number, sharp: boolean) {
        const style = sharp ? this.theme.black : this.theme.white;
        this.keyPath(this.ctx, rect, tilt, sharp);
        this.ctx.fill();
        if (style.gloss > 0) {
            const gloss = this.ctx.createLinearGradient(
                0,
                rect.y,
                0,
                rect.y + rect.height * 0.55
            );
            gloss.addColorStop(0, `rgba(255, 255, 255, ${style.gloss})`);
            gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
            this.ctx.save();
            this.ctx.fillStyle = gloss;
            this.ctx.fill();
            this.ctx.restore();
        }
        if (style.outline) {
            this.ctx.save();
            this.ctx.strokeStyle = style.outline.color;
            this.ctx.lineWidth = style.outline.width * this.currentKeyWidth;
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    /**
     * How far the bottom edge rises and the sides move inwards for a pressed key.
     */
    private pressDeformation(rect: KeyRect, tilt: number) {
        const strength = KEY_PRESS_STRENGTH * this.theme.pressDepth * tilt;
        return {
            raise: rect.height * KEY_PRESS_RAISE_RATIO * strength,
            taper: rect.width * KEY_PRESS_TAPER_RATIO * strength
        };
    }

    private keyPath(
        ctx: Context2D,
        rect: KeyRect,
        tilt: number,
        sharp: boolean
    ) {
        const style = sharp ? this.theme.black : this.theme.white;
        const { raise, taper } = this.pressDeformation(rect, tilt);
        const outerY = rect.y + rect.height - raise;
        const left = rect.x + taper;
        const right = rect.x + rect.width - taper;
        const top = this.currentRadius * style.topRadius;
        const bottom = this.currentRadius * style.radius;

        const points = [
            [rect.x, rect.y, top],
            [rect.x + rect.width, rect.y, top],
            [right, outerY, bottom],
            [left, outerY, bottom]
        ];
        ctx.beginPath();
        for (const [i, [x, y, r]] of points.entries()) {
            const [prevX, prevY] =
                points[(i + points.length - 1) % points.length];
            const [nextX, nextY] = points[(i + 1) % points.length];
            // Round the corner by cutting into both edges and curving through the corner
            const prevLength = Math.hypot(prevX - x, prevY - y);
            const nextLength = Math.hypot(nextX - x, nextY - y);
            const prevCut =
                Math.min(r, prevLength / 2) / Math.max(1, prevLength);
            const nextCut =
                Math.min(r, nextLength / 2) / Math.max(1, nextLength);
            const beforeX = x + (prevX - x) * prevCut;
            const beforeY = y + (prevY - y) * prevCut;
            if (i === 0) {
                ctx.moveTo(beforeX, beforeY);
            } else {
                ctx.lineTo(beforeX, beforeY);
            }
            ctx.quadraticCurveTo(
                x,
                y,
                x + (nextX - x) * nextCut,
                y + (nextY - y) * nextCut
            );
        }
        ctx.closePath();
    }
}
