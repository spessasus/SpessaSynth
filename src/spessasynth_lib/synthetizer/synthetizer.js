import {MidiChannel} from "./buffer_voice/midi_channel.js";
import {SoundFont2} from "../soundfont/soundfont_parser.js";
import {ShiftableByteArray} from "../utils/shiftable_array.js";
import { arrayToHexString, consoleColors } from '../utils/other.js';
import { midiControllers } from '../midi_parser/midi_message.js'
import { WorkletChannel } from './worklet_channel/worklet_channel.js'
import { EventHandler } from '../utils/event_handler.js'

// i mean come on
const VOICES_CAP = 800;

export const DEFAULT_GAIN = 0.5;
export const DEFAULT_PERCUSSION = 9;

export class Synthetizer {
    /**
     * Creates a new instance of the SpessaSynth synthesizer
     * @param targetNode {AudioNode}
     * @param soundFont {SoundFont2}
     */
     constructor(targetNode, soundFont) {
        console.log("%cInitializing SpessaSynth synthesizer...", consoleColors.info);
        this.voiceCap = VOICES_CAP;
        this.soundFont = soundFont;
        this.context = targetNode.context;

        this.eventHandler = new EventHandler();

        this.volumeController = new GainNode(targetNode.context, {
            gain: DEFAULT_GAIN
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


        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);

        // create 16 channels
        this.midiChannels = [...Array(16).keys()].map(j => new MidiChannel(this.volumeController, this.defaultPreset, j + 1, false));

        // change percussion channel to the percussion preset
        this.midiChannels[DEFAULT_PERCUSSION].percussionChannel = true;
        this.midiChannels[DEFAULT_PERCUSSION].setPreset(this.percussionPreset);
        this.midiChannels[DEFAULT_PERCUSSION].bank = 128;

        console.log("%cSpessaSynth is ready!", consoleColors.recognized);
    }

    /**
     * Starts playing a note
     * @param channel {number} 0-15 the channel to play the note
     * @param midiNote {number} 0-127 the key number of the note
     * @param velocity {number} 0-127 the velocity of the note (generally controls loudness)
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
        this.eventHandler.callEvent("noteon", {
            midiNote: midiNote,
            channel: channel,
            velocity: velocity,
            channelVolume: chan.channelVolume,
            channelExpression: chan.channelExpression,
        });
    }

    /*
     * Prevents any further changes to the vibrato via NRPN messages
     */
    lockChannelVibrato()
    {
        this.midiChannels.forEach(c => c.lockVibrato = true);
    }

    /**
     * Stops playing a note
     * @param channel {number} 0-15 the channel of the note
     * @param midiNote {number} 0-127 the key number of the note
     */
    noteOff(channel, midiNote) {
        if(midiNote > 127 || midiNote < 0)
        {
            console.warn(`Received a noteOn for note`, midiNote, "Ignoring.");
            return;
        }
        this.eventHandler.callEvent("noteoff", {
            midiNote: midiNote,
            channel: channel
        });
        if(this.highPerformanceMode)
        {
            this.midiChannels[channel].stopNote(midiNote, true);
            return;
        }
        this.midiChannels[channel].stopNote(midiNote);
    }

    /**
     * Stops all notes
     * @param force {boolean} if we should instantly kill the note, defaults to false
     */
    stopAll(force=false) {
        console.log("%cStop all received!", consoleColors.info);
        for (let channel of this.midiChannels) {
            for(const note of channel.notes)
            {
                this.eventHandler.callEvent("noteoff", {
                    midiNote: note,
                    channel: channel.channelNumber - 1
                });
            }
            channel.stopAll(force);
        }
    }

    /**
     * Changes the given controller
     * @param channel {number} 0-15 the channel to change the controller
     * @param controllerNumber {number} 0-127 the MIDI CC number
     * @param controllerValue {number} 0-127 the controller value
     */
    controllerChange(channel, controllerNumber, controllerValue)
    {
        switch (controllerNumber) {
            case midiControllers.allNotesOff:
            case midiControllers.allSoundOff:
                this.stopAll();
                break;

            case midiControllers.bankSelect:
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

            case midiControllers.lsbForControl0BankSelect:
                if(this.system === 'xg')
                {
                    if(this.midiChannels[channel].bank === 127)
                    {
                        this.midiChannels[channel].percussionChannel = true;
                        this.eventHandler.callEvent("drumchange",{
                            channel: channel,
                            isDrumChannel: true
                        });
                    }
                    this.midiChannels[channel].bank = controllerValue;
                    this.eventHandler.callEvent("drumchange",{
                        channel: channel,
                        isDrumChannel: false
                    });
                }
                break;


            default:
                this.midiChannels[channel].controllerChange(controllerNumber, controllerValue);
                break;
        }
        this.eventHandler.callEvent("controllerchange", {
            channel: channel,
            controllerNumber: controllerNumber,
            controllerValue: controllerValue
        });
    }

    /**
     * Resets all controllers (for every channel)
     */
    resetControllers()
    {
        console.log("%cResetting all controllers!", consoleColors.info);
        for(const ch of this.midiChannels)
        {
            // reset
            ch.resetControllers();
            ch.bank = 0;
            if(ch.channelNumber - 1 === DEFAULT_PERCUSSION) {
                ch.setPreset(this.percussionPreset);
                ch.percussionChannel = true;
                this.eventHandler.callEvent("drumchange",{
                    channel: ch.channelNumber - 1,
                    isDrumChannel: true
                });
            }
            else
            {
                ch.percussionChannel = false;
                ch.setPreset(this.defaultPreset);
                this.eventHandler.callEvent("drumchange",{
                    channel: ch.channelNumber - 1,
                    isDrumChannel: false
                });
            }

            // call all the event listeners
            const chNr = ch.channelNumber - 1;
            this.eventHandler.callEvent("programchange", {channel: chNr, preset: ch.preset})

            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.mainVolume, controllerValue: 100});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.pan, controllerValue: 64});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.expressionController, controllerValue: 127});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.modulationWheel, controllerValue: 0});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.effects3Depth, controllerValue: 0});

            this.eventHandler.callEvent("pitchwheel", {channel: chNr, MSB: 64, LSB: 0})
        }
        this.system = "gm2";
        this.volumeController.gain.value = DEFAULT_GAIN;
        this.panController.pan.value = 0;
    }

    /**
     * Sets the pitch of the given channel
     * @param channel {number} 0-16 the channel to change pitch
     * @param MSB {number} SECOND byte of the MIDI pitchWheel message
     * @param LSB {number} FIRST byte of the MIDI pitchWheel message
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.midiChannels[channel].setPitchBend(MSB, LSB);
        this.eventHandler.callEvent("pitchwheel", {
            channel: channel,
            MSB: MSB,
            LSB: LSB
        });
    }

    /**
     * Transposes the synthetizer's pitch by given semitones amount (percussion channels do not get affected)
     * @param semitones {number} the semitones to transpose by. Can be a floating point number for more precision
     */
    transpose(semitones)
    {
        this.midiChannels.forEach(c => c.transposeChannel(semitones));
    }

    /**
     * Sets the main volume
     * @param volume {number} 0-1 the volume
     */
    setMainVolume(volume)
    {
        this.volumeController.gain.value = volume * DEFAULT_GAIN;
    }

    /**
     * Changes the patch for a given channel
     * @param channel {number} 0-15 the channel to change
     * @param programNumber {number} 0-127 the MIDI patch number
     */
    programChange(channel, programNumber)
    {
        const channelObj = this.midiChannels[channel];
        // always 128 for percussion
        const bank = (channelObj.percussionChannel ? 128 : channelObj.bank);

        // find the preset
        let preset = this.soundFont.getPreset(bank, programNumber);
        channelObj.setPreset(preset);
        this.eventHandler.callEvent("programchange", {
            channel: channel,
            preset: preset
        });
    }

    /**
     * Call after replacing synth.soundFont
     */
    reloadSoundFont()
    {
        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);
        for(let i = 0; i < 16; i++)
        {
            if(this.midiChannels[i].resetSamples)
            {
                this.midiChannels[i].resetSamples();
            }
            this.midiChannels[i].lockPreset = false;
            this.programChange(i, this.midiChannels[i].preset.program);
        }
    }

    /**
     * Sends a MIDI Sysex message
     * @param messageData {ShiftableByteArray} the message's data (excluding the F0 byte, but including the F7 at the end)
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
                    if(messageData[4])
                    {
                        const vol = messageData[5] << 7 | messageData[4];
                        this.volumeController.gain.value = vol / 16384 * DEFAULT_GAIN;
                    }
                    else
                    {
                        const vol = messageData[5];
                        this.volumeController.gain.value = vol / 127 * DEFAULT_GAIN;
                    }
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

                        this.eventHandler.callEvent("drumchange",{
                            channel: channel,
                            isDrumChannel: this.midiChannels[channel].percussionChannel
                        });
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
                    this.volumeController.gain.value = messageData[7] / 100 * DEFAULT_GAIN;
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
     * @returns {number} the audioContext's current time
     */
    get currentTime()
    {
        return this.context.currentTime;
    }

    get voicesAmount()
    {
        return this.midiChannels.reduce((amt, chan) => amt + chan.voicesAmount, 0);
    }
}