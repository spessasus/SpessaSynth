import {MidiChannel} from "./midi_channel.js";
import {SoundFont2} from "../soundfont/soundfont_parser.js";
import {ShiftableByteArray} from "../utils/shiftable_array.js";
import { arrayToHexString, consoleColors } from '../utils/other.js';

// i mean come on
const VOICES_CAP = 1000;
export const DEFAULT_PERCUSSION = 9;

export class Synthetizer {
    /**
     * @param targetNode {AudioNode}
     * @param soundFont {SoundFont2}
     */
     constructor(targetNode, soundFont) {
        console.log("%cInitializing SpessaSynth synthesizer...", consoleColors.info);
        this.voiceCap = VOICES_CAP;
        this.soundFont = soundFont;
        this.context = targetNode.context;

        this.volumeController = new GainNode(targetNode.context, {
            gain: 1
        });

        this.panController = new StereoPannerNode(targetNode.context, {
            pan: 0
        });

        this.volumeController.connect(this.panController);
        this.panController.connect(targetNode);

        /**
         * For Black MIDI's - forces release time to 50ms
         * @type {boolean}
         */
        this.highPerformanceMode = false;

        /**
         * Controls the system
         * @type {"gm"|"gm2"|"gs"|"xg"}
         */
        this.system = "gm2";

        /**
         * @type {MidiChannel[]}
         */
        this.midiChannels = [];

        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);

        // create 16 channels
        for (let j = 0; j < 16; j++) {
            // default to the first preset
            this.midiChannels[j] = new MidiChannel(this.volumeController, this.defaultPreset, j + 1, false);
        }

        // change percussion channel to the percussion preset
        this.midiChannels[DEFAULT_PERCUSSION].percussionChannel = true;
        this.midiChannels[DEFAULT_PERCUSSION].setPreset(this.percussionPreset);
        this.midiChannels[DEFAULT_PERCUSSION].bank = 128;

        console.log("%cSpessaSynth is ready!", consoleColors.recognized);
    }

    /**
     * MIDI noteOn Event
     * @param channel {number} 0-15
     * @param midiNote {number} 0-127
     * @param velocity {number} 0-127
     * @param enableDebugging {boolean} set to true to log stuff to console
     */
    noteOn(channel, midiNote, velocity, enableDebugging = false) {
        if (velocity === 0) {
            this.noteOff(channel, midiNote);
            return;
        }

        if(this.voicesAmount > this.voiceCap)
        {
            return;
        }

        if(this.highPerformanceMode && this.voicesAmount > 200 && velocity < 40)
        {
            return;
        }

        if(midiNote > 127 || midiNote < 0)
        {
            console.warn(`Received a noteOn for note`, midiNote, "Ignoring.");
            return;
        }

        let chan = this.midiChannels[channel];
        chan.playNote(midiNote, velocity, enableDebugging);
        if(this.onNoteOn) {
            this.onNoteOn(midiNote, channel, velocity, chan.channelVolume, chan.channelExpression);
        }
    }

    /**
     * MIDI noteOff event
     * @param channel {number} 0-15
     * @param midiNote {number} 0-127
     */
    noteOff(channel, midiNote) {
        if(midiNote > 127 || midiNote < 0)
        {
            console.warn(`Received a noteOn for note`, midiNote, "Ignoring.");
            return;
        }
        if(this.onNoteOff) {
            this.onNoteOff(midiNote);
        }
        if(this.highPerformanceMode)
        {
            this.midiChannels[channel].stopNote(midiNote, true);
            return;
        }
        this.midiChannels[channel].stopNote(midiNote);
    }

    /**
     * Plays when the midi note goes on
     * @param midiNote {number} 0-127
     * @param channel {number} 0-15
     * @param velocity {number} 0-127
     * @param volume {number} 0-1
     * @param expression {number} 0-1
     */
    onNoteOn;

    /**
     * Plays when the midi note goes off
     * @param midiNote {number} 0-127
     */
    onNoteOff;

    stopAll() {
        console.log("%cStop all received!", consoleColors.info);
        for (let channel of this.midiChannels) {
            if(this.onNoteOff)
            {
                for(const note of channel.playingNotes)
                {
                    this.onNoteOff(note.midiNote);
                }
            }
            channel.stopAll();
        }
    }

    /**
     * Changes the given controller
     * @param channel {number} 0-15
     * @param controllerName {controllerNames}
     * @param controllerValue {number} 0-127
     */
    controllerChange(channel, controllerName, controllerValue)
    {
        switch (controllerName) {
            case "Main Volume":
                this.midiChannels[channel].setVolume(controllerValue);
                break;

            case "LSB for Control 7 (Main Volume)":
                let nevVol = (this.midiChannels[channel].channelVolume << 7) | controllerValue;
                this.midiChannels[channel].setVolume(nevVol);
                break;

            case "Sustain Pedal":
                if(controllerValue < 64) {
                    this.midiChannels[channel].releaseHoldPedal();
                }
                else
                {
                    this.midiChannels[channel].pressHoldPedal();
                }
                break;

            case "Pan":
                let pan = (controllerValue - 64) / 64;
                this.midiChannels[channel].setPan(pan);
                break;

            case "All Notes Off":
            case "All Sound Off":
                this.stopAll();
                break;

            case "Expression Controller":
                this.midiChannels[channel]
                    .setExpression(controllerValue / 127);
                break;

            case "LSB for Control 11 (Expression Controller)":
                const expression = (this.midiChannels[channel].channelExpression << 7 ) | controllerValue;
                this.midiChannels[channel].setExpression(expression);
                break;

            case "Bank Select":
                if(this.system === "gm")
                {
                    // gm ignores bank select
                    console.log("%cIgnorind the Bank Select, as the synth is in GM mode.", consoleColors.info);
                    return;
                }
                let bankNr = controllerValue;
                const channelObject = this.midiChannels[channel];
                if(channelObject.percussionChannel)
                {
                    // 128 for percussion channel
                    bankNr = 128
                }
                if(bankNr === 128 && !channelObject.percussionChannel)
                {
                    // if channel is not for percussion, default to bank current
                    bankNr = channelObject.bank;
                }

                channelObject.bank = bankNr;
                break;

            case "LSB for Control 0 (Bank Select)":
                if(this.system === 'xg')
                {
                    if(this.midiChannels[channel].bank === 127)
                    {
                        this.midiChannels[channel].percussionChannel = true;
                    }
                    this.midiChannels[channel].bank = controllerValue;
                }
                break;

            case "Non-Registered Parameter Number MSB":
                this.midiChannels[channel].setNRPCoarse(controllerValue);
                break;

            case "Non-Registered Parameter Number LSB":
                this.midiChannels[channel].setNRPFine(controllerValue);
                break;

            case "Registered Parameter Number MSB":
                this.midiChannels[channel].setRPCoarse(controllerValue);
                break;

            case "Registered Parameter Number LSB":
                this.midiChannels[channel].setRPFine(controllerValue);
                break;

            case "Data Entry MSB":
                this.midiChannels[channel].dataEntryCoarse(controllerValue);
                break;

            case "Reset All Controllers":
                this.midiChannels[channel].resetControllers();
                break;

            default:
                console.log(`%cUnrecognized controller: %c"${controllerName}"%c set to: %c${controllerValue}%c on channel: %c${channel}`,
                    consoleColors.warn,
                    consoleColors.unrecognized,
                    consoleColors.warn,
                    consoleColors.value,
                    consoleColors.warn,
                    consoleColors.recognized);
                break;
        }
        if(this.onControllerChange)
        {
            this.onControllerChange(channel, controllerName, controllerValue);
        }
    }

    /**
     * Resets all controllers
     */
    resetControllers()
    {
        console.log("%cResetting all controllers!", consoleColors.info);
        for(const ch of this.midiChannels)
        {
            // reset
            ch.resetControllers();
            ch.percussionChannel = false;
            ch.setPreset(this.defaultPreset);

            // call all the event listeners
            const chNr = ch.channelNumber - 1;
            if(this.onProgramChange)
            {
                this.onProgramChange(chNr, chNr === DEFAULT_PERCUSSION ? this.percussionPreset : this.defaultPreset);
            }
            if(this.onControllerChange)
            {
                this.onControllerChange(chNr, "Main Volume", 127);
                this.onControllerChange(chNr, "Pan", 64);
                this.onControllerChange(chNr, "Expression Controller", 127);
                this.onControllerChange(chNr, "Brightness", 127);
                this.onControllerChange(chNr, "Effects 1 Depth", 0);
            }
            if(this.onPitchWheel)
            {
                this.onPitchWheel(ch.channelNumber - 1, 64, 0);
            }
        }

        this.midiChannels[DEFAULT_PERCUSSION].percussionChannel = true;
        this.midiChannels[DEFAULT_PERCUSSION].setPreset(this.percussionPreset);
        this.system = "gm2";
        this.volumeController.gain.value = 1;
        this.panController.pan.value = 0;
    }

    /**
     * Sets the pitch
     * @param channel {number} 0-16
     * @param MSB {number} SECOND byte
     * @param LSB {number} FIRST byte
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.midiChannels[channel].setPitchBend(MSB, LSB);
        if(this.onPitchWheel)
        {
            this.onPitchWheel(channel, MSB, LSB);
        }
    }

    /**
     * Transposes the synthetizer's pitch by given semitones amount (percussion channels do not get affected)
     * @param semitones {number}
     */
    transpose(semitones)
    {
        this.midiChannels.forEach(c => c.transposeChannel(semitones));
    }

    /**
     * Sets the main volume
     * @param volume {number} 0-1
     */
    setMainVolume(volume)
    {
        this.volumeController.gain.value = volume;
    }

    /**
     * Calls on program change(channel number, preset)
     * @type {function(number, Preset)}
     */
    onProgramChange;

    /**
     * Calls on controller change(channel number, controller name, controller value)
     * @type {function(number, controllerNames, number)}
     */
    onControllerChange;

    /**
     * Calls on pitch wheel change (channel, msb, lsb)
     * @type {function(number, number, number)}
     */
    onPitchWheel;

    /**
     * @param channel {number} 0-15
     * @param programNumber {number} 0-127
     */
    programChange(channel, programNumber)
    {
        const channelObj = this.midiChannels[channel];
        // always 128 for percussion
        const bank = (channelObj.percussionChannel ? 128 : channelObj.bank);

        // find the preset
        let preset = this.soundFont.getPreset(bank, programNumber);
        channelObj.setPreset(preset);
        // console.log("changing channel", channel, "to bank:", channelObj.bank,
        //     "preset:", programNumber, preset.presetName);
        if(this.onProgramChange) {
            this.onProgramChange(channel, preset);
        }
    }

    reloadSoundFont()
    {
        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);
        for(let i = 0; i < 16; i++)
        {
            this.midiChannels[i].lockPreset = false;
            this.programChange(i, this.midiChannels[i].preset.program);
        }
    }

    /**
     * Sends a sysex
     * @param messageData {ShiftableByteArray} the message's data (after F0)
     */
    systemExclusive(messageData)
    {
        const type = messageData[0];
        switch (type)
        {
            default:
                console.log(`%cUnrecognized SysEx: %c${arrayToHexString(messageData)}`,
                    consoleColors.warn,
                    consoleColors.unrecognized);
                break;

            case 0x7E:
                // gm system
                if(messageData[2] === 0x09)
                {
                    if(messageData[3] === 0x01)
                    {
                        console.log("%cGM system on", consoleColors.info);
                        this.system = "gm";
                    }
                    else if(messageData[3] === 0x03)
                    {
                        console.log("%cGM2 system on", consoleColors.info);
                        this.system = "gm2";
                    }
                    else
                    {
                        console.log("%cGM system off, defaulting to GS", consoleColors.info);
                        this.system = "gs";
                    }
                }
                break;

            case 0x7F:
                // main volume
                if (messageData[2] === 0x04 && messageData[3] === 0x01)
                {
                    const vol = messageData[5] << 7 | messageData[4];
                    this.volumeController.gain.value = vol / 16383;
                }
                break;

            // this is a roland sysex
            // http://www.bandtrax.com.au/sysex.htm
            case 0x41:
                // messagedata[1] is device id (ignore as we're everything >:) )
                if(messageData[2] === 0x42 && messageData[3] === 0x12)
                {
                    // this is a GS sysex

                    if(messageData[7] === 0x00 && messageData[6] === 0x7F)
                    {
                        // this is a GS reset
                        console.log("%cGS system on", consoleColors.info);
                        this.system = "gs";
                        return;
                    }
                    else
                    if(messageData[6] === 0x15 && messageData[4] === 0x40)
                    {
                        // this is the Use for Drum Part sysex (multiple drums)
                        // determine the channel 0 means channel 10 (default), 1 means 1 etc.
                        const channel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][messageData[5] & 0x0F]; // for example 1A means A = 11
                        this.midiChannels[channel].percussionChannel = (messageData[7] > 0 && messageData[5] >> 4); // if set to other than 0, is a drum channel
                        console.log(`%cChannel %c${channel}%c ${this.midiChannels[channel].percussionChannel ? 
                            "is now a drum channel" 
                            : 
                            "now isn't a drum channel"}%c via: %c${arrayToHexString(messageData)}`,
                            consoleColors.info,
                            consoleColors.value,
                            consoleColors.recognized,
                            consoleColors.info,
                            consoleColors.value);
                    }
                    else
                    if(messageData[4] === 0x40 && messageData[6] === 0x06 && messageData[5] === 0x00)
                    {
                        // roland master pan
                        console.log(`%cRoland Master Pan set to: %c${messageData[7]}%c with: %c${arrayToHexString(messageData)}`,
                            consoleColors.info,
                            consoleColors.value,
                            consoleColors.info,
                            consoleColors.value);
                        this.panController.pan.value = (messageData[7] - 64) / 64;
                    }
                    else
                    {
                        // this is some other GS sysex...
                        console.log(`%cUnrecognized Roland %cGS %cSysEx: %c${arrayToHexString(messageData)}`,
                            consoleColors.warn,
                            consoleColors.recognized,
                            consoleColors.warn,
                            consoleColors.unrecognized);
                    }
                }
                else
                if(messageData[2] === 0x16 && messageData[3] === 0x12 && messageData[4] === 0x10)
                {
                    // this is a roland master volume message
                    this.volumeController.gain.value = messageData[7] / 100;
                    console.log(`%cRoland Master Volume control set to: %c${messageData[7]}%c via: %c${arrayToHexString(messageData)}`,
                        consoleColors.info,
                        consoleColors.value,
                        consoleColors.info,
                        consoleColors.value);
                }
                else
                {
                    // this is something else...
                    console.log(`%cUnrecognized Roland SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                }
                break;

            // yamaha
            case 0x43:
                // XG on
                if(messageData[2] === 0x4C && messageData[5] === 0x7E && messageData[6] === 0x00)
                {
                    console.log("%cXG system on", consoleColors.info);
                    this.system = "xg";
                }
                else
                {
                    console.log(`%cUnrecognized Yamaha SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                }
                break;


        }
    }

    /**
     * @returns {number}
     */
    get currentTime()
    {
        return this.context.currentTime;
    }

    get voicesAmount()
    {
        let v = 0;
        this.midiChannels.forEach(prev =>  v += prev.notes.size);
        return v;
    }
}