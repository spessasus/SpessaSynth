import {Synthetizer, HIGH_PERF_CAP} from "../midi_player/synthetizer/synthetizer.js";
import {getEvent, midiControllers} from "../midi_parser/midi_message.js";
import {ShiftableByteArray} from "../utils/shiftable_array.js";

export class MidiKeyboard
{
    /**
     * Creates a new midi keyboard(keyboard)
     * @param channelColors {Array<string>}
     * @param synth {Synthetizer}
     */
    constructor(channelColors, synth) {
        this.mouseHeld = false;
        this.heldKeys = [];

        document.onmousedown = () => this.mouseHeld = true;
        document.onmouseup = () => {
            this.mouseHeld = false;
            for(let key of this.heldKeys)
            {
                // user note off
                this.releaseNote(key);
                this.synth.noteOff(this.channel, key);
            }
        }

        // hold pedal on
        document.addEventListener("keydown", e =>{
            if(e.key === "Shift")
            {
                this.synth.controllerChange(this.channel, "Sustain Pedal", 127);
                document.getElementById("keyboard_text").innerText = "Hold pedal on";
            }
        });

        // hold pedal off
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

        /**
         * @type {HTMLTableRowElement}
         */
        this.keyboard = document.getElementById("keyboard");

        // create keyboard
        function isBlackNoteNumber(noteNumber) {
                let pitchClass = noteNumber % 12;
                return pitchClass === 1 || pitchClass === 3 || pitchClass === 6 || pitchClass === 8 || pitchClass === 10;
        }
        for (let midiNote = 0; midiNote < 128; midiNote++) {
            let noteElement = document.createElement("td");
            noteElement.classList.add("key");
            noteElement.id = `note${midiNote}`;
            noteElement.onmouseover = () => {
                if(!this.mouseHeld)
                {
                    return
                }

                // user note on
                this.heldKeys.push(midiNote);
                this.pressNote(midiNote, this.channel, 127, 1, 1);
                this.synth.noteOn(this.channel, midiNote, 127, true);
            }

            noteElement.onmousedown = () =>
            {
                // user note on
                this.heldKeys.push(midiNote);
                this.pressNote(midiNote, this.channel, 127, 1, 1);
                this.synth.noteOn(this.channel, midiNote, 127, true);
            }

            noteElement.onmouseout = () => {
                // user note off
                this.heldKeys.splice(this.heldKeys.indexOf(midiNote), 1);
                this.releaseNote(midiNote);
                this.synth.noteOff(this.channel, midiNote);
            };
            noteElement.onmouseleave = noteElement.onmouseup;
            let isBlack = isBlackNoteNumber(midiNote);
            if(isBlack)
            {
                // short note
                noteElement.classList.add("sharp_key");
            }
            else
            {
                // long note
                noteElement.classList.add("flat_key");
                noteElement.style.backgroundColor = "white";
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
                    noteElement.classList.add("between_sharps");
                }
                else if(blackNoteLeft)
                {
                    noteElement.classList.add("left_sharp");
                }
                else if(blackNoteRight)
                {
                    noteElement.classList.add("right_sharp");
                }


            }
            noteElement.setAttribute("colors", `["${noteElement.style.backgroundColor}"]`);
            this.keyboard.appendChild(noteElement);
        }

        this.selectorMenu = document.getElementById("keyboard_selector");

        // preset selector
        const presetSelector = document.createElement("select");

        // load the preset names
        let pNames = this.synth.soundFont.presets.map(p => p.presetName);
        pNames.sort();
        for(let pName of pNames)
        {
            let option = document.createElement("option");
            option.value = pName;
            option.innerText = pName;
            presetSelector.appendChild(option);
        }

        presetSelector.
        addEventListener("change", () => {
            // find the preset's bank and program number
            const presetName = presetSelector.value;
            const preset = this.synth.soundFont.getPresetByName(presetName);
            const bank = preset.bank;
            const program = preset.program;

            // change bank
            this.synth.controllerChange(this.channel, "Bank Select", bank);
            this.synth.programChange(this.channel, program);
            console.log("Changing user preset to:", presetName);
        });
        this.selectorMenu.appendChild(presetSelector);

        // channel selector
        const channelSelector = document.createElement("select");

        let channelNumber = 0;
        /**
         * @type {HTMLOptionElement[]}
         */
        const options = [];
        for(const channel of this.synth.midiChannels)
        {
            const option = document.createElement("option");

            option.value = channelNumber.toString();
            option.innerText = `Channel ${channelNumber + 1}: ${channel.preset.presetName}`;

            option.style.backgroundColor = channelColors[channelNumber];
            option.style.color = "rgb(0, 0, 0)";

            channelSelector.appendChild(option);
            channelNumber++;
            options.push(option);
        }
        channelSelector.onchange = () => {
            presetSelector.value = this.synth.midiChannels[channelSelector.value].preset.presetName;
            this.selectChannel(parseInt(channelSelector.value));
        }

        this.selectorMenu.appendChild(channelSelector);

        // update on program change
        this.synth.onProgramChange = (ch, p) => {
            options[ch].innerText = `Channel ${ch + 1}: ${p}`;
        }

        // prepare the midi access
        navigator.requestMIDIAccess({sysex: true, software: true}).then(access => {
            this.createMIDIDeviceHandler(access);
        },
        message => {
            console.log(`Could not get MIDI Devices:`, message);
        });
    }

    /**
     * @param midiAccess {WebMidi.MIDIAccess}
     */
    createMIDIDeviceHandler(midiAccess)
    {
        this.midiAccess = midiAccess;
        const deviceSelector = document.createElement("select");
        deviceSelector.innerHTML = "<option value='-1' selected>No device selected</option>";
        for(const device of this.midiAccess.inputs)
        {
            const option = document.createElement("option");
            option.innerText = device[1].name;
            option.value = device[0];
            deviceSelector.appendChild(option);
        }
        this.selectorMenu.appendChild(deviceSelector);

        deviceSelector.onchange = () => {
            for(const dev of this.midiAccess.inputs)
            {
                dev[1].onmidimessage = undefined;
            }

            if(deviceSelector.value === "-1")
            {
                return;
            }

            this.midiAccess.inputs.get(deviceSelector.value).onmidimessage = event => {
                // discard as soon as possible if high perf
                if(this.synth.highPerformanceMode)
                {
                    // noteon
                    if(event.data[0] >> 4 === 0x9 && this.synth.voicesAmount > HIGH_PERF_CAP)
                    {
                        return;
                    }
                }
                const statusByteData = getEvent(event.data[0]);
                // process the event
                switch (statusByteData.name) {
                    case "Note On":
                        const velocity = event.data[2];
                        if(velocity > 0) {
                            this.synth.noteOn(statusByteData.channel, event.data[1], velocity);
                        }
                        else
                        {
                            this.synth.noteOff(statusByteData.channel, event.data[1]);
                        }
                        break;

                    case "Note Off":
                        this.synth.noteOff(statusByteData.channel, event.data[1]);
                        break;

                    case "Pitch Bend":
                        this.synth.pitchWheel(statusByteData.channel, event.data[2], event.data[1]);
                        break;

                    case "Controller Change":
                        this.synth.controllerChange(statusByteData.channel, midiControllers[event.data[1]], event.data[2]);
                        break;

                    case "Program Change":
                        this.synth.programChange(statusByteData.channel, event.data[1]);
                        break;

                    case "System Exclusive":
                        this.synth.systemExclusive(new ShiftableByteArray(event.data.slice(1)));
                        break;

                    case "System Reset":
                        this.synth.stopAll();
                        this.synth.resetControllers();
                        console.log("System Reset");
                        break;

                    default:
                        break;
                }
            }
            console.log("hooked to", deviceSelector.value);
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
     * @param expression {number} 0-1
     * @param volume {number} 0-1
     * @param velocity {number} 0-127
     */
    pressNote(midiNote, channel, velocity, volume, expression)
    {
        /**
         * @type {HTMLTableCellElement}
         */
        let key = this.keyboard.childNodes[midiNote];
        key.classList.add("pressed");

        let isSharp = key.classList.contains("sharp_key");
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
        /**
         * @type {string[]}
         */
        let pressedColors = JSON.parse(key.getAttribute("colors"));
        if(pressedColors.length > 1) {
            pressedColors.pop();
        }
        if(pressedColors.length === 1)
        {
            key.classList.remove("pressed");
        }
        key.setAttribute("colors", JSON.stringify(pressedColors));
        key.style.backgroundColor = pressedColors[pressedColors.length - 1];
    }
}