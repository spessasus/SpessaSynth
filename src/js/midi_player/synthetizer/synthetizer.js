import {MidiChannel} from "./midi_channel.js";
import {SoundFont2} from "../../soundfont/soundfont_parser.js";
import {ShiftableByteArray} from "../../utils/shiftable_array.js";

const VOICES_CAP = 1000;

export class Synthetizer {
    /**
     * @param targetNode {AudioNode}
     * @param soundFont {SoundFont2}
     */
     constructor(targetNode, soundFont) {
        this.soundFont = soundFont;
        this.outputNode = targetNode;

        /**
         * For Black MIDI's - forces release time to 50ms
         * @type {boolean}
         */
        this.highPerformanceMode = false;

        console.log("Preparing channels");
        /**
         * @type {MidiChannel[]}
         */
        this.midiChannels = [];

        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);

        // create 16 channels
        for (let j = 0; j < 16; j++) {
            // default to the first preset
            this.midiChannels[j] = new MidiChannel(this.outputNode, this.defaultPreset, soundFont, j + 1, false);
        }

        // change percussion channel to the percussion preset
        this.midiChannels[9].percussionChannel = true;
        this.midiChannels[9].setPreset(this.percussionPreset);
        this.midiChannels[9].bank = 128;

        // // set reverb
        // fetch("other/reverb_impulse.wav").then(async r => {
        //     const buff = await this.outputNode.context.decodeAudioData(await r.arrayBuffer());
        //     for(const chan of this.midiChannels)
        //     {
        //         chan.setReverbBuffer(buff);
        //     }
        // });
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

        if(this.voicesAmount > VOICES_CAP)
        {
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

            // case "Effects 1 Depth":
            //     // reverb
            //     this.midiChannels[channel].setReverb(controllerValue);
            //     break;

            case "Expression Controller":
                this.midiChannels[channel]
                    .setExpression(controllerValue / 127);
                break;

            case "LSB for Control 11 (Expression Controller)":
                const expression = (this.midiChannels[channel].channelExpression << 7 ) | controllerValue;
                this.midiChannels[channel].setExpression(expression);
                break;

            case "Bank Select":
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
                // prevent unrecognized error as we always have up to 128 banks
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
                console.log("Unrecognized controller:", controllerName);
                break;
        }
    }

    /**
     * Resets all controllers
     */
    resetControllers()
    {
        for(const ch of this.midiChannels)
        {
            ch.resetControllers();
            ch.setPreset(this.defaultPreset);
            ch.percussionChannel = false;
        }
        this.midiChannels[9].setPreset(this.percussionPreset);
        this.midiChannels[9].percussionChannel = true;
    }

    /**
     * Sets the pitch
     * @param channel {number} 0-126
     * @param MSB {number} SECOND byte
     * @param LSB {number} FIRST byte
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.midiChannels[channel].setPitchBend(MSB, LSB);
    }

    /**
     * Calls on program change(channel number, preset name)
     * @type {function(number, string)}
     */
    onProgramChange;

    /**
     * @param channel {number} 0-15
     * @param programNumber {number} 0-127
     */
    programChange(channel, programNumber)
    {
        const channelObj = this.midiChannels[channel];
        // always 128 for percussion
        const bank = (channelObj.percussionChannel ? 128 : channelObj.bank);

        let preset = this.soundFont.getPreset(bank, programNumber);
        channelObj.setPreset(preset);
        console.log("changing channel", channel, "to bank:", channelObj.bank,
            "preset:", programNumber, preset.presetName);
        if(this.onProgramChange) {
            this.onProgramChange(channel, preset.presetName);
        }
    }

    reloadSoundFont()
    {
        for(let i = 0; i < 16; i++)
        {
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
                console.log("Unrecognized SysEx:", messageData);
                break;

            // roland
            // http://www.bandtrax.com.au/sysex.htm
            case 0x41:
                // gs
                if(messageData[2] === 0x42 && messageData[3] === 0x12 && messageData[4] === 0x40)
                {
                    // 0 means channel 10 (default), 1 means 1 etc.
                    const channel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][messageData[5] & 0x0F]; // for example 1A means A = 11
                    if(messageData[6] === 0x15) // drum channel
                    {
                        this.midiChannels[channel].percussionChannel = messageData[7] > 0;
                        console.log("Drum channel", channel, messageData[7] > 0);
                    }
                }
                else
                {
                    console.log("Unrecognizer Roland SysEx:", messageData);
                }

        }
    }

    /**
     * @returns {number}
     */
    get currentTime()
    {
        return this.outputNode.context.currentTime;
    }

    get voicesAmount()
    {
        let v = 0;
        this.midiChannels.forEach(c => v += c.voicesAmount);
        return v;
    }
}