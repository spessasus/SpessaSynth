import {Synthetizer} from "../../../spessasynth_lib/synthetizer/synthetizer.js";
import { midiControllers } from '../../../spessasynth_lib/midi_parser/midi_message.js'
import { _handlePointers } from './pointer_handling.js'
import { ANIMATION_REFLOW_TIME } from '../utils/animation_utils.js'

/**
 * midi_keyboard.js
 * purpose: creates and manages the on-screen virtual keyboard
 */

const GLOW_PX = 20;

class MidiKeyboard
{
    /**
     * Creates a new midi keyboard(keyboard)
     * @param channelColors {Array<string>}
     * @param synth {Synthetizer}
     */
    constructor(channelColors, synth) {
        this.mouseHeld = false;
        /**
         * @type {Set<number>}
         */
        this.pressedKeys = new Set();
        /**
         * @type {"light"|"dark"}
         */
        this.mode = "light";
        this.enableDebugging = false;
        this.sizeChangeAnimationId = -1;
        this.modeChangeAnimationId = -1;

        /**
         * @type {{min: number, max: number}}
         * @private
         */
        this._keyRange = {
            min: 0,
            max: 127
        };

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
        /**
         * @type {boolean}
         * @private
         */
        this._shown = true;

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

        this.synth.eventHandler.addEvent("mutechannel", "keyboard-mute-channel", e => {
            if(e.isMuted)
            {
                for (let i = 0; i < 128; i++)
                {
                    this.releaseNote(i, e.channel);
                }
            }
        });
    }

    /**
     * @param val {boolean}
     */
    set shown(val)
    {
        if(val === true)
        {
            this.keyboard.style.display = "";
        }
        else
        {
            this.keyboard.style.display = "none";
        }
        this._shown = val;
    }

    get shown()
    {
        return this._shown;
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

        this._handlePointers();

        if(this.mode === "dark")
        {
            this.mode = "light"
            this.toggleMode(false);
        }
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

    toggleMode(animate = true)
    {
        if(this.mode === "light")
        {
            this.mode = "dark";
        }
        else
        {
            this.mode = "light";
        }
        if(!animate)
        {
            this.keys.forEach(k => {
                if(k.classList.contains("flat_key"))
                {
                    k.classList.toggle("flat_dark_key");
                }
            });
            return;
        }
        if(this.modeChangeAnimationId)
        {
            clearTimeout(this.modeChangeAnimationId);
        }
        this.keyboard.classList.add("mode_transform");
        const disableScroll = document.body.scrollHeight <= window.innerHeight;
        if(disableScroll)
        {
            document.body.classList.add("no_scroll");
        }
        this.modeChangeAnimationId = setTimeout(() => {
            this.keys.forEach(k => {
                if(k.classList.contains("flat_key"))
                {
                    k.classList.toggle("flat_dark_key");
                }
            });
            this.keyboard.classList.remove("mode_transform");
            // restore scrolling
            setTimeout(() => document.body.classList.remove("no_scroll"), 500);
        }, 500);
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
        this.setKeyRange(value, true);

    }

    /**
     * @param range {{min: number, max: number}}
     * @param animate {boolean}
     */
    setKeyRange(range, animate = true)
    {
        const diff = Math.abs(range.max - range.min)
        if(diff < 12)
        {
            range.min -= 6;
            range.max = range.min + 12;
        }
        // adjust height
        // according to my testing, this function seems to calculate the height well:
        // 900 / (keys + 5)
        const newHeight = 900 / ((range.max - range.min) + 5);
        const rules = document.styleSheets[0].cssRules;
        /**
         * adjust key pressing skew (hacky!!!)
         * @type {CSSStyleRule}
         */
        let keyRule;
        for(const rule of rules)
        {
            if(rule.selectorText === "#keyboard .key")
            {
                keyRule = rule;
                break;
            }
        }
        keyRule.style.setProperty("--pressed-transform-skew", `${0.0008 / (newHeight / 7)}`);
        if(animate)
        {
            if(this.sizeChangeAnimationId)
            {
                clearTimeout(this.sizeChangeAnimationId);
            }
            // do a cool animation
            // get height ratio for anumation
            const computedStyle = getComputedStyle(this.keyboard);
            const currentHeight = parseFloat(computedStyle.getPropertyValue("--current-min-height").replace(/[^\d.]+/g, ""));
            const currentHeightPx = this.keyboard.getBoundingClientRect().height;
            const heightRatio = newHeight / currentHeight;
            const heightDifferencePx = currentHeightPx * heightRatio - currentHeightPx;

            // get key shift ratio for anumation
            const currentCenterKey = (this._keyRange.min + this._keyRange.max) / 2;
            const newCenterKey = (range.min + range.max) / 2;

            this._keyRange = range;

            // get key width for calculation
            const keyWidth = this.keys.find(k => k.classList.contains("sharp_key")).getBoundingClientRect().width;
            const pixelShift = (currentCenterKey - newCenterKey) * keyWidth;

            // get the new border radius
            const currentBorderRadius = parseFloat(
                computedStyle
                    .getPropertyValue("--key-border-radius")
                    .replace(/[^\d.]+/g, "")
            );
            // add margin so the keyboard takes up the new amount of space
            this.keyboard.style.marginTop = `${heightDifferencePx}px`;
            this.keyboard.style.transition = "";

            // being the transition
            this.keyboard.style.transform = `scale(${heightRatio}) translateX(${pixelShift}px)`;
            this.keyboard.style.setProperty("--key-border-radius", `${currentBorderRadius / heightRatio}vmin`);

            // animation end
            this.sizeChangeAnimationId = setTimeout(() => {
                this.keyboard.style.setProperty("--current-min-height", `${newHeight}`);
                // restore values and disable transition
                this.keyboard.style.transition = "none";
                this.keyboard.style.transform = "";
                this.keyboard.style.marginTop = "";
                this.keyboard.style.setProperty("--key-border-radius", "");
                // update size
                this._createKeyboard();
                // restore transition
                setTimeout(() => this.keyboard.style.transition = "", ANIMATION_REFLOW_TIME);
            }, 500);
        }
        else
        {
            this.keyboard.style.setProperty("--current-min-height", `${newHeight}`);
            this._keyRange = range;
            this._createKeyboard();
        }
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
        let key = this.keys[midiNote - this._keyRange.min];
        if(key === undefined)
        {
            return;
        }
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
        let key = this.keys[midiNote - this._keyRange.min];
        if(key === undefined)
        {
            return;
        }

        channel %= this.channelColors.length;

        /**
         * @type {string[]}
         */
        let pressedColors = this.keyColors[midiNote - this._keyRange.min];
        if(!pressedColors)
        {
            return;
        }
        const colorIndex = pressedColors.findLastIndex(v => v === this.channelColors[channel]);
        if(colorIndex === -1)
        {
            return;
        }
        pressedColors.splice(colorIndex, 1);
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
MidiKeyboard.prototype._handlePointers = _handlePointers;
export { MidiKeyboard };