import { midiControllers } from "spessasynth_core";
import { handlePointers } from "./pointer_handling.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import type { WorkerSynthesizer } from "spessasynth_lib";
import type { InterfaceMode } from "../../server/saved_settings.ts";

/**
 * Midi_keyboard.js
 * purpose: creates and manages the on-screen virtual keyboard
 */

const GLOW_PX = 20;

export class MidiKeyboard {
    /**
     * @param midiNote the MIDI note number that was pressed
     * @param velocity the velocity that was used
     */
    public onNotePressed?: (midiNote: number, velocity: number) => unknown;
    public channel = 0;
    public mode: InterfaceMode = "light";
    protected mouseHeld = false;
    protected pressedKeys = new Set<number>();
    protected sizeChangeAnimationId = -1;
    protected modeChangeAnimationId = -1;
    protected synth: WorkerSynthesizer;
    protected channelColors: string[];
    protected keyboard: HTMLDivElement;
    protected keys: HTMLDivElement[] = [];
    protected keyColors: string[][] = [];
    protected handlePointers = handlePointers.bind(this);

    /**
     * Creates a new midi keyboard(keyboard)
     */
    public constructor(channelColors: string[], synth: WorkerSynthesizer) {
        this.synth = synth;
        this.channelColors = channelColors;

        const kb = document.getElementById("keyboard");
        if (!kb) {
            throw new Error("No keyboard element?");
        }
        this.keyboard = kb as HTMLDivElement;

        this._createKeyboard();

        // Connect the synth to keyboard
        this.synth.eventHandler.addEvent("noteOn", "keyboard-note-on", (e) => {
            const noteShift = Math.trunc(
                this.synth.channelProperties[e.channel].transposition
            );
            this.pressNote(e.midiNote + noteShift, e.channel, e.velocity);
        });

        this.synth.eventHandler.addEvent(
            "noteOff",
            "keyboard-note-off",
            (e) => {
                const noteShift = Math.trunc(
                    this.synth.channelProperties[e.channel].transposition
                );
                this.releaseNote(e.midiNote + noteShift, e.channel);
            }
        );

        this.synth.eventHandler.addEvent("stopAll", "keyboard-stop-all", () => {
            this.clearNotes();
        });

        this.synth.eventHandler.addEvent(
            "muteChannel",
            "keyboard-mute-channel",
            (e) => {
                if (e.isMuted) {
                    for (let i = 0; i < 128; i++) {
                        this.releaseNote(i, e.channel);
                    }
                }
            }
        );
    }

    protected _keyRange = {
        min: 0,
        max: 127
    };

    /**
     * The range of displayed MIDI keys
     */
    public get keyRange() {
        return this._keyRange;
    }

    /**
     * The range of displayed MIDI keys
     */
    public set keyRange(value: { min: number; max: number }) {
        if (value.max === undefined || value.min === undefined) {
            throw new TypeError("No min or max property!");
        }
        if (value.min > value.max) {
            const temp = value.min;
            value.min = value.max;
            value.max = temp;
        }
        value.min = Math.max(0, value.min);
        value.max = Math.min(127, value.max);
        this.setKeyRange(value, true);
    }

    protected _shown = true;

    public get shown() {
        return this._shown;
    }

    public set shown(val) {
        if (val) {
            this.keyboard.style.display = "";
        } else {
            this.keyboard.style.display = "none";
        }
        this._shown = val;
    }

    public setHoldPedal(down: boolean) {
        if (down) {
            this.synth.controllerChange(
                this.channel,
                midiControllers.sustainPedal,
                127
            );
            this.keyboard.style.filter = "brightness(0.5)";
        } else {
            this.synth.controllerChange(
                this.channel,
                midiControllers.sustainPedal,
                0
            );
            this.keyboard.style.filter = "";
        }
    }

    public toggleMode(animate = true) {
        if (this.mode === "light") {
            this.mode = "dark";
        } else {
            this.mode = "light";
        }
        if (!animate) {
            this.keys.forEach((k) => {
                if (k.classList.contains("flat_key")) {
                    k.classList.toggle("flat_dark_key");
                }
            });
            return;
        }
        if (this.modeChangeAnimationId) {
            clearTimeout(this.modeChangeAnimationId);
        }
        this.keyboard.classList.add("mode_transform");
        const disableScroll = document.body.scrollHeight <= window.innerHeight;
        if (disableScroll) {
            document.body.classList.add("no_scroll");
        }
        this.modeChangeAnimationId = window.setTimeout(() => {
            this.keys.forEach((k) => {
                if (k.classList.contains("flat_key")) {
                    k.classList.toggle("flat_dark_key");
                }
            });
            this.keyboard.classList.remove("mode_transform");
            // Restore scrolling
            setTimeout(() => document.body.classList.remove("no_scroll"), 500);
        }, 500);
    }

    public setKeyRange(range: { min: number; max: number }, animate = true) {
        const diff = Math.abs(range.max - range.min);
        if (diff < 12) {
            range.min -= 6;
            range.max = range.min + 12;
        }
        // Adjust height
        // According to my testing, this function seems to calculate the height well:
        // 900 / (keys + 5)
        const newHeight = 900 / (range.max - range.min + 5);
        const rules = document.styleSheets[0].cssRules;
        /**
         * Adjust key pressing skew (hacky!!!)
         */
        let keyRule: CSSStyleRule | undefined;
        for (const rule of rules) {
            if (
                "selectorText" in rule &&
                rule.selectorText === "#keyboard .key"
            ) {
                keyRule = rule as CSSStyleRule;
                break;
            }
        }
        if (!keyRule) {
            throw new Error("No matching rule.");
        }
        keyRule.style.setProperty(
            "--pressed-transform-skew",
            `${0.0008 / (newHeight / 7)}`
        );
        if (animate) {
            if (this.sizeChangeAnimationId) {
                clearTimeout(this.sizeChangeAnimationId);
            }
            // Do a cool animation here.
            // Get the height ratio for animation
            const computedStyle = getComputedStyle(this.keyboard);
            const currentHeight = parseFloat(
                computedStyle
                    .getPropertyValue("--current-min-height")
                    .replace(/[^\d.]+/g, "")
            );
            const currentHeightPx =
                this.keyboard.getBoundingClientRect().height;
            const heightRatio = newHeight / currentHeight;
            const heightDifferencePx =
                currentHeightPx * heightRatio - currentHeightPx;

            // Get the key shift ratio for animation
            const currentCenterKey =
                (this._keyRange.min + this._keyRange.max) / 2;
            const newCenterKey = (range.min + range.max) / 2;

            this._keyRange = range;

            // Get key width for calculation
            const keyWidth = this.keys
                .find((k) => k.classList.contains("sharp_key"))
                ?.getBoundingClientRect()?.width;
            if (keyWidth === undefined) {
                throw new Error("Unable to find a sharp key?");
            }
            const pixelShift = (currentCenterKey - newCenterKey) * keyWidth;

            // Get the new border radius
            const currentBorderRadius = parseFloat(
                computedStyle
                    .getPropertyValue("--key-border-radius")
                    .replace(/[^\d.]+/g, "")
            );
            // Add margin so the keyboard takes up the new amount of space
            this.keyboard.style.marginTop = `${heightDifferencePx}px`;
            this.keyboard.style.transition = "";

            // Being the transition
            this.keyboard.style.transform = `scale(${heightRatio}) translateX(${pixelShift}px)`;
            this.keyboard.style.setProperty(
                "--key-border-radius",
                `${currentBorderRadius / heightRatio}vmin`
            );

            // Animation end
            this.sizeChangeAnimationId = window.setTimeout(() => {
                this.keyboard.style.setProperty(
                    "--current-min-height",
                    `${newHeight}`
                );
                // Restore values and disable transition
                this.keyboard.style.transition = "none";
                this.keyboard.style.transform = "";
                this.keyboard.style.marginTop = "";
                this.keyboard.style.setProperty("--key-border-radius", "");
                // Update size
                this._createKeyboard();
                // Restore transition
                setTimeout(
                    () => (this.keyboard.style.transition = ""),
                    ANIMATION_REFLOW_TIME
                );
            }, 500);
        } else {
            this.keyboard.style.setProperty(
                "--current-min-height",
                `${newHeight}`
            );
            this._keyRange = range;
            this._createKeyboard();
        }
    }

    /**
     * Selects the channel from synth
     */
    public selectChannel(channel: number) {
        this.channel = channel;
    }

    /**
     * Presses a midi note visually
     * @param midiNote 0-127
     * @param channel 0-15
     * @param velocity 0-127
     */
    public pressNote(midiNote: number, channel: number, velocity: number) {
        const key = this.keys[midiNote - this._keyRange.min];
        if (key === undefined) {
            return;
        }
        key.classList.add("pressed");

        const isSharp = key.classList.contains("sharp_key");
        const brightness = velocity / 127;
        const rgbaValues = this.channelColors[channel % 16]
            .match(/\d+(\.\d+)?/g)
            ?.map(parseFloat);
        if (!rgbaValues) {
            throw new Error(
                `Invalid color: ${this.channelColors[channel % 16]}`
            );
        }

        // Multiply the rgb values by brightness
        let color;
        if (!isSharp && this.mode === "light") {
            // Multiply the rgb values
            const newRGBValues = rgbaValues
                .slice(0, 3)
                .map((value) => 255 - (255 - value) * brightness);

            // Create the new color
            color = `rgba(${newRGBValues.join(", ")}, ${rgbaValues[3]})`;
        } else {
            // Multiply the rgb values
            const newRGBValues = rgbaValues
                .slice(0, 3)
                .map((value) => value * brightness);

            // Create the new color
            color = `rgba(${newRGBValues.join(", ")}, ${rgbaValues[3]})`;
        }
        key.style.background = color;
        if (this.mode === "dark") {
            const spread = GLOW_PX * brightness;
            key.style.boxShadow = `${color} 0px 0px ${spread}px ${spread / 5}px`;
        }
        this.keyColors[midiNote - this._keyRange.min].push(
            this.channelColors[channel % 16]
        );
    }

    /**
     * @param midiNote 0-127
     * @param channel 0-15
     */
    public releaseNote(midiNote: number, channel: number) {
        const relativeKey = midiNote - this._keyRange.min;
        const keyElement = this.keys[relativeKey];
        if (keyElement === undefined) {
            return;
        }

        channel %= this.channelColors.length;
        const pressedColors = this.keyColors[relativeKey];
        if (!pressedColors) {
            return;
        }
        const channelColor = this.channelColors[channel];
        for (let i = 0; i < pressedColors.length; i++) {
            const color = pressedColors[i];
            if (color === channelColor) {
                pressedColors.splice(i, 1);
                i--;
            }
        }
        const color = pressedColors[pressedColors.length - 1] || "";
        keyElement.style.background = color;
        if (this.mode === "dark" && color !== "") {
            keyElement.style.boxShadow = `0px 0px ${GLOW_PX}px ${color}`;
        }
        if (pressedColors.length < 1) {
            keyElement.classList.remove("pressed");
            keyElement.style.background = "";
            keyElement.style.boxShadow = "";
        }
    }

    public clearNotes() {
        this.keys.forEach((key, index) => {
            key.classList.remove("pressed");
            key.style.background = "";
            key.style.boxShadow = "";
            this.keyColors[index] = [];
        });
    }

    protected _createKey(midiNote: number): HTMLDivElement {
        function isBlackNoteNumber(noteNumber: number) {
            const pitchClass = noteNumber % 12;
            return (
                pitchClass === 1 ||
                pitchClass === 3 ||
                pitchClass === 6 ||
                pitchClass === 8 ||
                pitchClass === 10
            );
        }

        const keyElement = document.createElement("div");
        keyElement.classList.add("key");
        keyElement.id = `note${midiNote}`;

        const isBlack = isBlackNoteNumber(midiNote);
        if (isBlack) {
            // Short note
            keyElement.classList.add("sharp_key");
        } else {
            // Long note
            keyElement.classList.add("flat_key");
            let blackNoteLeft = false;
            let blackNoteRight = false;
            if (midiNote >= 0) {
                blackNoteLeft = isBlackNoteNumber(midiNote - 1);
            }
            if (midiNote < 127) {
                blackNoteRight = isBlackNoteNumber(midiNote + 1);
            }

            if (blackNoteRight && blackNoteLeft) {
                keyElement.classList.add("between_sharps");
            } else if (blackNoteLeft) {
                keyElement.classList.add("left_sharp");
            } else if (blackNoteRight) {
                keyElement.classList.add("right_sharp");
            }
        }
        return keyElement;
    }

    protected _createKeyboard() {
        this.keyboard.innerHTML = "";

        // Create keyboard
        for (
            let midiNote = this._keyRange.min;
            midiNote < this._keyRange.max + 1;
            midiNote++
        ) {
            const keyElement = this._createKey(midiNote);
            this.keyColors.push([]);
            this.keyboard.appendChild(keyElement);
            this.keys.push(keyElement);
        }

        this.handlePointers();

        if (this.mode === "dark") {
            this.mode = "light";
            this.toggleMode(false);
        }
    }
}
