import { isMobile } from "../utils/is_mobile.js";
import type { MIDIKeyboard } from "./midi_keyboard.ts";

export function handlePointers(this: MIDIKeyboard) {
    // POINTER HANDLING
    const userNoteOn = (note: number, touch: Touch | MouseEvent) => {
        // User note on
        let velocity;
        if (isMobile) {
            // Ignore precise key velocity on mobile (keys are too small anyway)
            velocity = 127;
        } else {
            // Determine velocity. lower = more velocity
            const keyElement = this.keys[0]; // All keys have the same top
            const rect = keyElement.getBoundingClientRect();
            if (this.keyboard.classList.contains("sideways")) {
                const relativeMouseX = touch.clientX - rect.left;
                const keyWidth = rect.width;
                velocity = Math.floor(
                    ((keyWidth - relativeMouseX) / keyWidth) * 127
                );
            } else {
                // Handle both mouse and touch events
                const relativeMouseY = touch.clientY - rect.top;
                const keyHeight = rect.height;
                velocity = Math.floor((relativeMouseY / keyHeight) * 127);
            }
        }
        if (this.onNotePressed) {
            this.onNotePressed(note, velocity);
        }
        this.synth.noteOn(this.channel, note, velocity);
    };

    const moveHandler = (e: MouseEvent | TouchEvent) => {
        // All currently pressed keys are stored in this.pressedKeys
        const touches = "touches" in e ? Array.from(e.touches) : [e];
        const currentlyTouchedKeys = new Set<number>();
        for (const touch of touches) {
            const targetKey = document.elementFromPoint(
                touch.clientX,
                touch.clientY
            );
            if (!targetKey) {
                continue;
            }
            const midiNote = Number.parseInt(targetKey.id.replace("note", ""));
            currentlyTouchedKeys.add(midiNote);
            if (
                Number.isNaN(midiNote) ||
                midiNote < 0 ||
                this.pressedKeys.has(midiNote)
            ) {
                // Pressed outside of bounds or already pressed
                continue;
            }
            this.pressedKeys.add(midiNote);
            userNoteOn(midiNote, touch);
        }
        for (const key of this.pressedKeys) {
            if (!currentlyTouchedKeys.has(key)) {
                this.userNoteOff(key);
            }
        }
    };

    // Mouse
    if (isMobile) {
        // Touch
        this.keyboard.addEventListener("touchstart", moveHandler.bind(this));
        this.keyboard.addEventListener("touchend", moveHandler.bind(this));
        // Some fingers may still be pressed so we move handler here
        this.keyboard.addEventListener("touchmove", moveHandler.bind(this));
    } else {
        document.addEventListener("mousedown", (e) => {
            this.mouseHeld = true;
            moveHandler(e);
        });
        document.addEventListener("mouseup", () => {
            this.mouseHeld = false;
            for (const key of this.pressedKeys) {
                this.userNoteOff(key);
            }
        });
        this.keyboard.addEventListener("mousemove", (e) => {
            if (this.mouseHeld) {
                moveHandler(e);
            }
        });
        this.keyboard.addEventListener("mouseleave", () => {
            for (const key of this.pressedKeys) {
                this.userNoteOff(key);
            }
        });
    }
}
