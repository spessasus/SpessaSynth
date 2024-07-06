import {Synthetizer} from "../../spessasynth_lib/synthetizer/synthetizer.js";
import { midiControllers } from '../../spessasynth_lib/midi_parser/midi_message.js'
import { isMobile } from './utils/is_mobile.js'

/**
 * midi_keyboard.js
 * purpose: creates and manages the on-screen virtual keyboard
 */

const GLOW_PX = 150;

export class MidiKeyboard
{
    /**
     * Creates a new midi keyboard(keyboard)
     * @param channelColors {Array<string>}
     * @param synth {Synthetizer}
     */
    constructor(channelColors, synth) {
        this.mouseHeld = false;
        this.lastKeyPressed = -1;
        this.heldKeys = [];
        /**
         * @type {"light"|"dark"}
         */
        this.mode = "light";
        this.enableDebugging = true;

        /**
         * @type {{min: number, max: number}}
         * @private
         */
        this._keyRange = {
            min: 0,
            max: 127
        };

        document.onpointerdown = () => {
            this.mouseHeld = true;
        }
        document.onpointerup = () => {
            this.mouseHeld = false;
            this.lastKeyPressed = -1;
            for(let key of this.heldKeys)
            {
                // user note off
                this.releaseNote(key, this.channel);
                this.synth.noteOff(this.channel, key);
            }
        }

        // hold pedal on
        document.addEventListener("keydown", e =>{
            if(e.key === "Shift")
            {
                this.synth.controllerChange(this.channel, midiControllers.sustainPedal, 127);
                this.keyboard.style.filter = "brightness(0.5)";
            }
        });

        // hold pedal off
        document.addEventListener("keyup", e => {
            if(e.key === "Shift")
            {
                this.synth.controllerChange(this.channel, midiControllers.sustainPedal, 0);
                this.keyboard.style.filter = "";
            }
        });

        this.synth = synth;
        this.channel = 0;

        this.channelColors = channelColors;

        this._createKeyboard();

        // connect the synth to keyboard
        this.synth.eventHandler.addEvent("noteon", "keyboard-note-on", e => {
            this.pressNote(e.midiNote, e.channel, e.velocity);
        });

        this.synth.eventHandler.addEvent("noteoff", "keyboard-note-off", e => {
            this.releaseNote(e.midiNote, e.channel);
        });

        this.synth.eventHandler.addEvent("stopall", "keyboard-stop-all", () => {
            this.clearNotes();
        });

        // QoL: change keyboard channel to the changed one when user changed it
        this.synth.eventHandler.addEvent("programchange", "keyboard-program-change", e => {
            if(e.userCalled)
            {
                this.selectChannel(e.channel);
            }
        })
    }

    /**
     * @private
     */
    _createKeyboard()
    {
        /**
         * @type {HTMLDivElement}
         */
        this.keyboard = document.getElementById("keyboard");
        this.keyboard.innerHTML = "";

        /**
         *
         * @type {HTMLDivElement[]}
         */
        this.keys = [];

        /**
         * @type {string[][]}
         */
        this.keyColors = [];
        // create keyboard
        for (let midiNote = this._keyRange.min; midiNote < this._keyRange.max + 1; midiNote++) {

            const keyElement = this._createKey(midiNote);
            this.keyColors.push([]);
            this.keyboard.appendChild(keyElement);
            this.keys.push(keyElement);
        }

        /**
         * @param keyElement {HTMLDivElement}
         * @param e {PointerEvent}
         */
        const noteOnHandler = (keyElement, e) => {
            if (!this.mouseHeld)
            {
                return;
            }

            e.stopPropagation();
            e.preventDefault();
            const midiNote = parseInt(keyElement.id.replace("note", ""));

            if(this.lastKeyPressed === midiNote || isNaN(midiNote))
            {
                return;
            }

            if(this.lastKeyPressed !== -1)
            {
                // user note off
                this.heldKeys.splice(this.heldKeys.indexOf(this.lastKeyPressed), 1);
                this.releaseNote(this.lastKeyPressed, this.channel);
                this.synth.noteOff(this.channel, this.lastKeyPressed);
            }

            this.lastKeyPressed = midiNote;

            // user note on
            if (!this.heldKeys.includes(midiNote))
            {
                this.heldKeys.push(midiNote);
            }

            let velocity ;
            if (isMobile)
            {
                // ignore precise key velocity on mobile (keys are too small anyways)
                velocity = 127;
            }
            else
            {
                // determine velocity. lower = more velocity
                const rect = keyElement.getBoundingClientRect();
                const relativeY = e.clientY; // Handle both mouse and touch events
                const relativeMouseY = relativeY - rect.top;
                const keyHeight = rect.height;
                velocity = Math.floor(relativeMouseY / keyHeight * 127);
            }
            this.synth.noteOn(this.channel, midiNote, velocity, this.enableDebugging);
        };

        // POINTER HANDLING
        this.keyboard.onpointerdown = e => {
            this.mouseHeld = true;
            noteOnHandler(document.elementFromPoint(e.clientX, e.clientY), e);
        }

        this.keyboard.onpointermove = e => {
            noteOnHandler(document.elementFromPoint(e.clientX, e.clientY), e);
        };

        this.keyboard.onpointerleave = () => {
            const midiNote = this.lastKeyPressed;
            // user note off
            this.heldKeys.splice(this.heldKeys.indexOf(midiNote), 1);
            this.releaseNote(midiNote, this.channel);
            this.synth.noteOff(this.channel, midiNote);
            this.lastKeyPressed = -1;
        };
    }

    /**
     * @param midiNote {number}
     * @returns {HTMLDivElement}
     * @private
     */
    _createKey(midiNote)
    {
        function isBlackNoteNumber(noteNumber) {
            let pitchClass = noteNumber % 12;
            return pitchClass === 1 || pitchClass === 3 || pitchClass === 6 || pitchClass === 8 || pitchClass === 10;
        }
        let keyElement = document.createElement("div");
        keyElement.classList.add("key");
        keyElement.id = `note${midiNote}`;


        let isBlack = isBlackNoteNumber(midiNote);
        if(isBlack)
        {
            // short note
            keyElement.classList.add("sharp_key");
        }
        else
        {
            // long note
            keyElement.classList.add("flat_key");
            let blackNoteLeft = false;
            let blackNoteRight = false;
            if(midiNote >= 0)
            {
                blackNoteLeft = isBlackNoteNumber(midiNote - 1);
            }
            if(midiNote < 127) {
                blackNoteRight = isBlackNoteNumber(midiNote + 1);
            }

            if(blackNoteRight && blackNoteLeft)
            {
                keyElement.classList.add("between_sharps");
            }
            else if(blackNoteLeft)
            {
                keyElement.classList.add("left_sharp");
            }
            else if(blackNoteRight)
            {
                keyElement.classList.add("right_sharp");
            }


        }
        return keyElement;
    }

    toggleMode()
    {
        if(this.mode === "light")
        {
            this.mode = "dark";
        }
        else
        {
            this.mode = "light";
        }
        this.keys.forEach(k => {
            if(k.classList.contains("flat_key"))
            {
                k.classList.toggle("flat_dark_key");
            }
        })
    }

    /**
     * The range of displayed MIDI keys
     * @returns {{min: number, max: number}}
     */
    get keyRange()
    {
        return this._keyRange;
    }

    /**
     * The range of displayed MIDI keys
     * @param value {{min: number, max: number}}
     */
    set keyRange(value)
    {
        if(value.max === undefined || value.min === undefined)
        {
            throw new TypeError("No min or max property!");
        }
        if(value.min > value.max)
        {
            let temp = value.min;
            value.min = value.max;
            value.max = temp;
        }
        value.min = Math.max(0, value.min);
        value.max = Math.min(127, value.max);
        this._keyRange = value;
        this._createKeyboard();

        // adjust height
        // according to my testing, this function seems to calculate the height well:
        // 900 / (keys + 5)
        this.keyboard.style.minHeight = `${900 / ((value.max - value.min) + 5)}vw`;
    }

    /**
     * Selects the channel from synth
     * @param channel {number} 0-15
     */
    selectChannel(channel)
    {
        this.channel = channel;
    }

    /**
     * presses a midi note visually
     * @param midiNote {number} 0-127
     * @param channel {number} 0-15     * @param volume {number} 0-1
     * @param velocity {number} 0-127
     */
    pressNote(midiNote, channel, velocity)
    {
        if(midiNote > this._keyRange.max || midiNote < this._keyRange.min)
        {
            return;
        }
        let key = this.keys[midiNote - this._keyRange.min];
        key.classList.add("pressed");

        let isSharp = key.classList.contains("sharp_key");
        let brightness = velocity / 127;
        let rgbaValues = this.channelColors[channel % 16].match(/\d+(\.\d+)?/g).map(parseFloat);

        // multiply the rgb values by brightness
        let color;
        if (!isSharp && this.mode === "light") {
            // multiply the rgb values
            let newRGBValues = rgbaValues.slice(0, 3).map(value => 255 - (255 - value) * brightness);

            // create the new color
            color = `rgba(${newRGBValues.join(", ")}, ${rgbaValues[3]})`;
        }
        else
        {
            // multiply the rgb values
            let newRGBValues = rgbaValues.slice(0, 3).map(value => value * brightness);

            // create the new color
            color = `rgba(${newRGBValues.join(", ")}, ${rgbaValues[3]})`;
        }
        key.style.background = color;
        if(this.mode === "dark")
        {
            const spread = GLOW_PX * brightness;
            key.style.boxShadow = `${color} 0px 0px ${spread}px ${spread / 5}px`;
            console.log(spread, spread / 10)
        }
        /**
         * @type {string[]}
         */
        this.keyColors[midiNote - this._keyRange.min].push(this.channelColors[channel % 16]);
    }

    /**
     * @param midiNote {number} 0-127
     * @param channel {number} 0-15
     */
    releaseNote(midiNote, channel)
    {
        if(midiNote > this._keyRange.max || midiNote < this._keyRange.min)
        {
            return;
        }
        if(midiNote > 127 || midiNote < 0)
        {
            return;
        }
        let key = this.keys[midiNote - this._keyRange.min];

        /**
         * @type {string[]}
         */
        let pressedColors = this.keyColors[midiNote - this._keyRange.min];
        if(!pressedColors)
        {
            return;
        }
        pressedColors.splice(pressedColors.findLastIndex(v => v === this.channelColors[channel]), 1);
        key.style.background = pressedColors[pressedColors.length - 1];
        if(this.mode === "dark")
        {
            key.style.boxShadow = `0px 0px ${GLOW_PX}px ${pressedColors[pressedColors.length - 1]}`;
        }
        if(pressedColors.length < 1)
        {
            key.classList.remove("pressed");
            key.style.background = "";
            key.style.boxShadow = "";
        }
    }

    clearNotes()
    {
        this.keys.forEach((key, index) => {
            key.classList.remove("pressed");
            key.style.background = "";
            key.style.boxShadow = "";
            this.keyColors[index] = [];
        })
    }
}