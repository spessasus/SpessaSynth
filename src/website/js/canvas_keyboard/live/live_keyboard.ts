import { MIDIControllers } from "spessasynth_core";
import type { InterfaceMode } from "../../../../server/saved_settings.ts";
import type { Synthesizer } from "../../utils/synthesizer.ts";
import { BaseKeyboard, KEY_TRANSITION_SECONDS } from "../base/base_keyboard.ts";
import type { RenderBounds } from "../../renderer/base/renderer.ts";
import { isSharpMIDINote, SHARP_KEY_LENGTH_RATIO } from "../base/key_style.ts";
import { isMobile } from "../../utils/is_mobile.ts";

const MIN_POINTER_DIMENSION_PX = 1;
// Duration of each phase in the theme mode sweep animation in seconds
const MODE_SWEEP_SECONDS = 0.5;
// Number of phases in the theme mode sweep animation
const MODE_SWEEP_PHASE_COUNT = 2;
// Cross-axis distance multiplier for the theme sweep transition
const MODE_SWEEP_EXTENT_MULTIPLIER = 2;

function easeOut(progress: number) {
    return 1 - Math.pow(1 - progress, 4);
}

/**
 * Live synth and pointer-event adapter for BaseKeyboard.
 */
export class LiveKeyboard extends BaseKeyboard {
    public channel = 0;
    public onNotePressed?: (midiNote: number, velocity: number) => unknown;
    public forceRenderOneFrame = false;
    protected readonly synth: Synthesizer;
    private readonly noteDisplayKeys = new Map<string, number[]>();
    private readonly pointerNotes = new Map<
        number,
        { note: number; rawNote: number }
    >();
    private readonly canvas: HTMLCanvasElement;
    private modeTransition?: {
        from: InterfaceMode;
        to: InterfaceMode;
        startTime: number;
    };

    public constructor(
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        channelColors: string[],
        synth: Synthesizer
    ) {
        super(ctx, {
            keyRange: { min: 0, max: 127 },
            channelColors,
            mode: "light",
            forceMaxVelocity: false,
            vertical: false,
            shown: true
        });
        this.canvas = canvas;
        this.synth = synth;

        canvas.addEventListener("pointerdown", (event) => {
            const hit = this.handlePointerEvent(event);
            if (!hit) {
                return;
            }
            canvas.setPointerCapture(event.pointerId);
            this.pointerNotes.set(event.pointerId, {
                note: hit.note,
                rawNote: hit.note - this.getKeyOffset(this.channel)
            });
            this.sendNoteOn(hit.note, hit.velocity);
        });
        canvas.addEventListener("pointermove", (event) => {
            if (!this.pointerNotes.has(event.pointerId)) {
                return;
            }
            const hit = this.handlePointerEvent(event);
            const previous = this.pointerNotes.get(event.pointerId)!;
            if (!hit || hit.note === previous.note) {
                return;
            }
            this.sendNoteOff(previous.rawNote);
            this.pointerNotes.set(event.pointerId, {
                note: hit.note,
                rawNote: hit.note - this.getKeyOffset(this.channel)
            });
            this.sendNoteOn(hit.note, hit.velocity);
        });
        const release = (event: PointerEvent) => {
            const previous = this.pointerNotes.get(event.pointerId);
            if (!previous) {
                return;
            }
            this.sendNoteOff(previous.rawNote);
            this.pointerNotes.delete(event.pointerId);
        };
        canvas.addEventListener("pointerup", release);
        canvas.addEventListener("pointercancel", release);
        canvas.addEventListener("lostpointercapture", release);

        synth.eventHandler.addEvent(
            "noteOn",
            "canvas-keyboard-note-on",
            (event) => {
                const note = event.midiNote + this.getKeyOffset(event.channel);
                const key = this.noteKey(event.channel, event.midiNote);
                const notes = this.noteDisplayKeys.get(key) ?? [];
                notes.push(note);
                this.noteDisplayKeys.set(key, notes);
                this.pressKey(note, event.channel, event.velocity, this.now());
            }
        );
        synth.eventHandler.addEvent(
            "noteOff",
            "canvas-keyboard-note-off",
            (event) => {
                const key = this.noteKey(event.channel, event.midiNote);
                const notes = this.noteDisplayKeys.get(key);
                const displayNote =
                    notes?.pop() ??
                    event.midiNote + this.getKeyOffset(event.channel);
                if (notes?.length === 0) {
                    this.noteDisplayKeys.delete(key);
                }
                this.releaseKey(displayNote, event.channel, this.now());
            }
        );
        synth.eventHandler.addEvent(
            "stopAll",
            "canvas-keyboard-stop-all",
            () => {
                this.noteDisplayKeys.clear();
                this.pointerNotes.clear();
                this.clearKeys(this.now());
            }
        );
    }

    /**
     * The mode the keyboard is at or is transitioning to.
     * Differs from mode while the sweep animation is still running.
     */
    public get targetMode() {
        return this.modeTransition?.to ?? this.mode;
    }

    public override render(bounds: RenderBounds, time: number) {
        if (this.needsAnimation(time)) {
            this.drawAt(time);
        }
        super.render(bounds, time);
    }

    public override drawAt(time: number) {
        this.updateModeTransition(time);
        super.drawAt(time);
        this.forceRenderOneFrame = true;
    }

    public needsAnimation(time: number) {
        for (const keys of this.pressedKeys.values()) {
            if (
                keys.some((key) =>
                    key.releaseTime === undefined
                        ? time - key.pressTime < KEY_TRANSITION_SECONDS
                        : time - key.releaseTime < KEY_TRANSITION_SECONDS
                )
            ) {
                return true;
            }
            if (
                keys.some(
                    (key) =>
                        key.releaseTime !== undefined &&
                        time - key.releaseTime < KEY_TRANSITION_SECONDS
                )
            ) {
                return true;
            }
        }

        return !!this.modeTransition;
    }

    public override toggleMode() {
        this.modeTransition = {
            from: this.mode,
            to: this.mode === "light" ? "dark" : "light",
            startTime: this.now()
        };
        this.drawAt(this.now());
    }

    public selectChannel(channel: number) {
        this.channel = channel;
    }

    public setHoldPedal(down: boolean) {
        this.synth.controllerChange(
            this.channel,
            MIDIControllers.sustainPedal,
            down ? 127 : 0
        );
    }

    public onMute(muteChannel: number, muted: boolean) {
        if (!muted) {
            return;
        }
        for (const [key, notes] of this.noteDisplayKeys) {
            if (!key.startsWith(`${muteChannel}:`)) {
                continue;
            }
            const note = Number.parseInt(key.slice(key.indexOf(":") + 1), 10);
            for (const displayNote of notes) {
                this.releaseKey(displayNote, muteChannel, this.now());
            }
            this.noteDisplayKeys.delete(this.noteKey(muteChannel, note));
        }
    }

    private updateModeTransition(time: number) {
        const transition = this.modeTransition;
        if (!transition) {
            return;
        }
        const progress =
            (time - transition.startTime) /
            (MODE_SWEEP_SECONDS * MODE_SWEEP_PHASE_COUNT);

        if (progress >= 0.5) {
            // The keyboard is swept out of view, so switch the theme silently.
            this.options.mode = transition.to;
        }
        if (progress >= 1) {
            this.modeTransition = undefined;
            this.yOffset = 0;
            return;
        }
        const phaseProgress =
            progress < 0.5
                ? progress * MODE_SWEEP_PHASE_COUNT
                : (progress - 0.5) * MODE_SWEEP_PHASE_COUNT;
        const easedProgress = easeOut(phaseProgress);
        const offsetProgress =
            progress < 0.5 ? easedProgress : 1 - easedProgress;
        this.yOffset =
            offsetProgress * this.actualHeight * MODE_SWEEP_EXTENT_MULTIPLIER;
    }

    private handlePointerEvent(event: PointerEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const x =
            ((event.clientX - rect.left) /
                Math.max(MIN_POINTER_DIMENSION_PX, rect.width)) *
                this.canvas.width -
            this.bounds.x;
        const y =
            ((event.clientY - rect.top) /
                Math.max(MIN_POINTER_DIMENSION_PX, rect.height)) *
                this.canvas.height -
            this.bounds.y;
        return this.checkKeyNumber(x, y);
    }

    private checkKeyNumber(
        x: number,
        y: number
    ):
        | {
              note: number;
              velocity: number;
          }
        | undefined {
        const layoutX = this.vertical ? y : x;
        const layoutY = this.vertical ? this.bounds.width - x : y;
        const range = this.options.keyRange;
        const count = range.max - range.min + 1;
        const layoutWidth = this.actualWidth;
        const layoutHeight = this.actualHeight;
        const slot = layoutWidth / count;
        const sharpRadius = layoutHeight * SHARP_KEY_LENGTH_RATIO;

        // Sharps are drawn above whites, so check them first.
        for (let note = range.max; note >= range.min; note--) {
            if (!isSharpMIDINote(note)) {
                continue;
            }
            const i = note - range.min;
            const rect = {
                x: i * slot + this.xOffset,
                y: 0,
                width: slot,
                height: sharpRadius
            };
            if (
                layoutX >= rect.x &&
                layoutX <= rect.x + rect.width &&
                layoutY >= rect.y &&
                layoutY <= rect.y + rect.height
            ) {
                return {
                    note,
                    velocity: isMobile
                        ? 127
                        : Math.floor((y / Math.max(1, layoutHeight)) * 127)
                };
            }
        }
        for (let note = range.max; note >= range.min; note--) {
            if (isSharpMIDINote(note)) {
                continue;
            }
            const center = (note - range.min + 0.5) * slot + this.xOffset;
            const rect = this.getFlatKeyRect(note, center, slot);
            if (
                layoutX >= rect.x &&
                layoutX <= rect.x + rect.width &&
                layoutY >= rect.y &&
                layoutY <= rect.y + rect.height
            ) {
                return {
                    note,
                    velocity: isMobile
                        ? 127
                        : Math.floor((y / Math.max(1, layoutHeight)) * 127)
                };
            }
        }
        return undefined;
    }

    private sendNoteOn(displayNote: number, velocity: number) {
        const rawNote = displayNote - this.getKeyOffset(this.channel);
        if (rawNote < 0 || rawNote > 127) {
            return;
        }
        this.onNotePressed?.(rawNote, velocity);
        this.synth.noteOn(this.channel, rawNote, velocity);
    }

    private sendNoteOff(rawNote: number) {
        if (rawNote >= 0 && rawNote <= 127) {
            this.synth.noteOff(this.channel, rawNote);
        }
    }

    private getKeyOffset(channel: number) {
        const ch = this.synth.midiChannels[channel];
        return (
            (ch.patch.isDrum
                ? 0
                : this.synth.midiParameters.keyShift +
                  this.synth.systemParameters.keyShift) +
            ch.midiParameters.keyShift +
            ch.systemParameters.keyShift
        );
    }

    private noteKey(channel: number, note: number) {
        return `${channel}:${note}`;
    }

    private now() {
        return performance.now() / 1000;
    }
}
