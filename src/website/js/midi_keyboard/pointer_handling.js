import { isMobile } from '../utils/is_mobile.js'

/**
 * @this {MidiKeyboard}
 * @private
 */
export function _handlePointers()
{
    // POINTER HANDLING
    const userNoteOff = note => {
        this.pressedKeys.delete(note)
        this.releaseNote(note, this.channel);
        this.synth.noteOff(this.channel, note);
    }

    const userNoteOn = (note, clientY) => {
        // user note on
        this.pressedKeys.add(note);

        let velocity;
        if (isMobile)
        {
            // ignore precise key velocity on mobile (keys are too small anyways)
            velocity = 127;
        }
        else
        {
            // determine velocity. lower = more velocity
            const keyElement = this.keys[note];
            const rect = keyElement.getBoundingClientRect();
             // Handle both mouse and touch events
            const relativeMouseY = clientY - rect.top;
            const keyHeight = rect.height;
            velocity = Math.floor(relativeMouseY / keyHeight * 127);
        }
        this.synth.noteOn(this.channel, note, velocity, this.enableDebugging);
    }

    /**
     * @param e {MouseEvent|TouchEvent}
     */
    const moveHandler = e => {
        // all currently pressed keys are stored in this.pressedKeys
        /**
         * @type {Touch[]|MouseEvent[]}
         */
        const touches = e.touches ? Array.from(e.touches) : [e];
        /**
         * @type {Set<number>}
         */
        const currentlyTouchedKeys = new Set();
        touches.forEach(touch => {
            const targetKey = document.elementFromPoint(touch.clientX, touch.clientY);
            const midiNote = parseInt(targetKey.id.replace("note", ""));
            currentlyTouchedKeys.add(midiNote);
            if(isNaN(midiNote) || midiNote < 0 || this.pressedKeys.has(midiNote))
            {
                // pressed outside of bounds or already pressed
                return;
            }
            userNoteOn(midiNote, touch.clientY);
        });
        this.pressedKeys.forEach(key => {
            if(!currentlyTouchedKeys.has(key))
            {
                userNoteOff(key);
            }
        });
    };

    // mouse
    document.addEventListener("mousedown", e => {
        this.mouseHeld = true;
        moveHandler(e);
    });
    document.addEventListener("mouseup", () => {
        this.mouseHeld = false;
        this.pressedKeys.forEach(key => {
            userNoteOff(key);
        });
    });
    this.keyboard.onmousemove = e => {
        if(this.mouseHeld) moveHandler(e);
    };
    this.keyboard.onmouseleave = () => {
        this.pressedKeys.forEach(key => {
            userNoteOff(key);
        });
    }

    // touch
    this.keyboard.ontouchstart = e => {
        moveHandler(e);
    };
    this.keyboard.ontouchend = () => {
        this.pressedKeys.forEach(key => {
            userNoteOff(key);
        });
    };
    this.keyboard.addEventListener("touchmove", e => {
        moveHandler(e);
    });
}