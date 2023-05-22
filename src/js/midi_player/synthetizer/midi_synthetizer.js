import {MidiChannel} from "./midi_channel.js";
import "../../midi_parser/events/midi_event.js";
import "../../midi_parser/events/meta_event.js";
import "../../midi_parser/events/sysex_event.js";
import {SoundFont2Parser} from "../../soundfont2_parser/soundfont_parser.js";

export class MidiSynthetizer {
    /**
     * @param targetNode {AudioNode}
     * @param soundFont {SoundFont2Parser}
     */
    constructor(targetNode, soundFont) {
        this.outputNode = targetNode;
        this.soundFont = soundFont;

        this.userChannel = new MidiChannel(this.outputNode, this.soundFont.presets[0], true);

        console.log("Preparing channels");
        /**
         * @type {MidiChannel[]}
         */
        this.midiChannels = [];

        // create 16 channels
        for (let j = 0; j < 16; j++) {
            if(j === 9)
            {
                // default to percussion
                this.midiChannels[j] = new MidiChannel(this.outputNode, this.soundFont.getPreset(128, 0));
            }
            else {
                // default to the first preset
                this.midiChannels[j] = new MidiChannel(this.outputNode, this.soundFont.presets[0]);
            }
        }
    }

    NoteOn(trackNumber, channel, midiNote, velocity) {
        if (velocity === 0) {
            this.NoteOff(trackNumber, channel, midiNote, 0);
            return;
        }
        let chan = this.midiChannels[channel];
        chan.playNote(midiNote, velocity);
        this.onNoteOn(midiNote, channel, velocity, chan.channelVolume, chan.channelExpression);
    }

    NoteOff(trackNumber, channel, midiNote) {
        this.midiChannels[channel].stopNote(midiNote);
        this.onNoteOff(midiNote);
    }

    /**
     * Plays when the midi note goes on
     * @param midiNote {number} 0-127
     * @param channel {number} 0-15
     * @param velocty {number} 0-127
     * @param volume {number} 0-1
     * @param expression {number} 0-1
     */
    onNoteOn;

    /**
     * Plays when the midi note goes off
     * @param midiNote {number} 0-127
     */
    onNoteOff;

    /**
     * Plays a note on the user's channel
     * @param midiNote {number}
     * @param velocity {number}
     */
    playUserNote = (midiNote, velocity) => this.userChannel.playNote(midiNote, velocity);

    /**
     * Stops a note on the user's channel
     * @param midiNote {number}
     */
    stopuserNote = midiNote => this.userChannel.stopNote(midiNote, 0);

    /**
     * @param event {MidiEvent|MetaEvent|SysexEvent}
     */
    textEvent(event) {
        const td = new TextDecoder("windows-1250");
        let decodedText = td.decode(new Uint8Array(event.data)).replace("\n", "");
        if(event.type === "Lyrics")
        {
            let text = decodedText;
            if(this.lastLyricsText)
            {
                text = this.lastLyricsText + " " + decodedText;
            }
            this.lastLyricsText = decodedText
            document.getElementById("text_event").innerText = text;
        }
        else {
            document.getElementById("text_event").innerText =
                `${event.type}: ${decodedText}`;
        }
    }

    resetAll() {
        for (let channel of this.midiChannels) {
            channel.stopAll();
        }
        for(let i = 0; i < 128; i++)
        {
            this.onNoteOff(i);
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
                this.midiChannels[channel].changePan(pan);
                break;

            case "All Notes Off":
            case "All Sound Off":
                this.resetAll();
                break;

            case "Expression Controller":
                this.midiChannels[channel]
                    .setExpression(controllerValue / 127);
                break;

            case "Bank Select":
                let bankNr = controllerValue;
                const channelObject = this.midiChannels[channel];
                if(channel === 9)
                {
                    // 128 for percussion channel
                    bankNr = 128
                }
                if(bankNr === 128 && channel !== 9)
                {
                    // if channel is not for percussion, default to bank current
                    bankNr = channelObject.bank;
                }

                channelObject.bank = bankNr;
                break;

            case "Non-Registered Parameter Number MSB":
                this.midiChannels[channel].NRPN_MSB = controllerValue;
                break;

            case "Non-Registered Parameter Number LSB":
                this.midiChannels[channel].NRPN_LSB = controllerValue;
                break;

            case "Data Entry MSB":
                this.midiChannels[channel].dataEntry(controllerValue);
                break;

            default:
                break;
        }
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

    programChange(channel, programNumber)
    {
        const channelObj = this.midiChannels[channel];
        let preset = this.soundFont.getPreset(channelObj.bank, programNumber);
        channelObj.changePreset(preset);
        console.log("changing channel", channel, "to bank:", channelObj.bank,
            "preset:", programNumber, preset.presetName);
    }
}