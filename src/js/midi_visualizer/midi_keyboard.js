import {MidiSynthetizer} from "../midi_player/synthetizer/midi_synthetizer.js";
export class MidiKeyboard
{
    /**
     * Creates a new midi keyboard(keyboard)
     * @param channelColors {Array<string>}
     * @param synth {MidiSynthetizer}
     */
    constructor(channelColors, synth) {
        this.mouseHeld = false;
        this.heldKeys = [];

        /**
         * @type {HTMLTableRowElement}
         */
        this.keyboard = document.getElementById("keyboard");

        document.onmousedown = () => this.mouseHeld = true;
        document.onmouseup = () => {
            this.mouseHeld = false;
            for(let key of this.heldKeys)
            {
                this.releaseNote(key);
                this.synth.NoteOff(this.channel, key);
            }
        }

        document.addEventListener("keydown", e =>{
            if(e.key === "Shift")
            {
                this.synth.controllerChange(this.channel, "Sustain Pedal", 127);
                document.getElementById("keyboard_text").innerText = "Hold pedal on";
            }
        });

        document.addEventListener("keyup", e => {
            if(e.key === "Shift")
            {
                this.synth.controllerChange(this.channel, "Sustain Pedal", 0);
                document.getElementById("keyboard_text").innerText = "";
            }
        });

        this.synth = synth;
        this.channel = 0;

        this.channelColors = channelColors;
        if (!this.keyboard.childNodes.length) {
            function isBlackNoteNumber(noteNumber) {
                let pitchClass = noteNumber % 12;
                return pitchClass === 1 || pitchClass === 3 || pitchClass === 6 || pitchClass === 8 || pitchClass === 10;
            }
            for (let midiNote = 0; midiNote < 128; midiNote++) {
                let noteElement = (document.createElement("td"));
                noteElement.id = `note${midiNote}`;
                noteElement.onmouseover = () => {
                    if(!this.mouseHeld)
                    {
                        return
                    }
                    this.heldKeys.push(midiNote);
                    this.pressNote(midiNote, this.channel, 127, 1, 1);
                    this.synth.NoteOn(this.channel, midiNote, 127);
                }

                noteElement.onmousedown = () =>
                {
                    this.heldKeys.push(midiNote);
                    this.pressNote(midiNote, this.channel, 127, 1, 1);
                    this.synth.NoteOn(this.channel, midiNote, 127);
                }

                noteElement.onmouseout = () => {
                    this.heldKeys.splice(this.heldKeys.indexOf(midiNote), 1);
                    this.releaseNote(midiNote);
                    this.synth.NoteOff(this.channel, midiNote);
                };
                noteElement.onmouseleave = noteElement.onmouseup;
                let isBlack = isBlackNoteNumber(midiNote);
                let transform;
                if(isBlack)
                {
                    // short note
                    noteElement.style.backgroundColor = "black";
                    noteElement.style.transformOrigin = "top";
                    //noteElement.style.border = "black 1px solid";
                    transform = "scale(1, 0.7)";
                    noteElement.style.zIndex = "10";
                }
                else
                {
                    // long note
                    noteElement.style.backgroundColor = (isBlackNoteNumber(midiNote) ? "black" : "white");
                    noteElement.style.zIndex = "1";
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
                        transform = "scale(2, 1)";
                    }
                    else if(blackNoteLeft)
                    {
                        transform = "scale(1.5, 1) translateX(-15%)";
                    }
                    else if(blackNoteRight)
                    {
                        transform = "scale(1.5, 1) translateX(15%)";
                    }


                }
                noteElement.style.transform = transform;
                noteElement.setAttribute("initial-transform", transform);
                noteElement.setAttribute("colors", `["${noteElement.style.backgroundColor}"]`);
                this.keyboard.appendChild(noteElement);
            }
        }
    }

    /**
     * Selects the channel from synth
     * @param channel {number} 0-15
     */
    selectChannel(channel)
    {
        this.channel = 0;
    }

    /**
     * presses a midi note visually
     * @param midiNote {number} 0-127
     * @param channel {number} 0-15
     * @param volume {number} 0-1
     * @param expression {number} 0-1
     * @param velocity {number} 0-127
     */
    pressNote(midiNote, channel, velocity, volume, expression)
    {
        let key = this.keyboard.childNodes[midiNote];
        key.style.transformOrigin = "top";
        key.style.transform =
            "matrix3d(1,0,0.00,0,0.00,1,0.00,0.0007,0,0,1,0,0,0,0,1) " + key.getAttribute("initial-transform");

        let isSharp = key.getAttribute("initial-transform") === "scale(1, 0.7)";
        let brightness = expression * volume * (velocity / 127);
        let rgbaValues = this.channelColors[channel].match(/\d+(\.\d+)?/g).map(parseFloat);

        // multiply the rgb values by brightness
        if (!isSharp) {
            // multiply the rgb values
            let newRGBValues = rgbaValues.slice(0, 3).map(value => 255 - (255 - value) * brightness);

            // create the new color
            key.style.backgroundColor = `rgba(${newRGBValues.join(", ")}, ${rgbaValues[3]})`;
        }
        else
        {
            // multiply the rgb values
            let newRGBValues = rgbaValues.slice(0, 3).map(value => value * brightness);

            // create the new color
            key.style.backgroundColor = `rgba(${newRGBValues.join(", ")}, ${rgbaValues[3]})`;
        }
        /**
         * @type {string[]}
         */
        let pressedColors = JSON.parse(key.getAttribute("colors"));
        pressedColors.push(this.channelColors[channel]);
        key.setAttribute("colors", JSON.stringify(pressedColors));
    }

    releaseNote(midiNote)
    {
        /**
         * @type {HTMLTableCellElement}
         */
        let key = this.keyboard.childNodes[midiNote];
        key.style.filter = "";
        key.style.transform = this.keyboard.childNodes[midiNote].getAttribute("initial-transform");
        /**
         * @type {string[]}
         */
        let pressedColors = JSON.parse(key.getAttribute("colors"));
        if(pressedColors.length > 1) {
            pressedColors.pop();
        }
        key.setAttribute("colors", JSON.stringify(pressedColors));
        key.style.backgroundColor = pressedColors[pressedColors.length - 1];
    }
}