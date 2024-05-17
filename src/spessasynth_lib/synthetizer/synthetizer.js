import {MidiChannel} from "./native_system/midi_channel.js";
import {SoundFont2} from "../soundfont/soundfont_parser.js";
import {ShiftableByteArray} from "../utils/shiftable_array.js";
import { arrayToHexString, consoleColors } from '../utils/other.js';
import { getEvent, messageTypes, midiControllers } from '../midi_parser/midi_message.js'
import { WorkletChannel } from './worklet_system/worklet_channel.js'
import { EventHandler } from '../utils/synth_event_handler.js'
import { FancyChorus } from './fancy_chorus.js'

const VOICES_CAP = 450;

export const DEFAULT_GAIN = 1;
export const DEFAULT_PERCUSSION = 9;
export const DEFAULT_CHANNEL_COUNT = 16;
export const REVERB_TIME_S = 2;
export const DEFAULT_SYNTH_MODE = "gm2";
export const DEFAULT_SYNTHESIS_MODE = "worklet";

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

        /**
         * Allows to set up custom event listeners for the synthesizer
         * @type {EventHandler}
         */
        this.eventHandler = new EventHandler();

        this.volumeController = new GainNode(this.context, {
            gain: DEFAULT_GAIN
        });

        this.panController = new StereoPannerNode(this.context, {
            pan: 0
        });

        // create reverb processor
        const revLength = Math.round(this.context.sampleRate * REVERB_TIME_S);
        const revbuff = new AudioBuffer({
            numberOfChannels: 2,
            sampleRate: this.context.sampleRate,
            length: revLength
        });
        const revLeft = revbuff.getChannelData(0);
        const revRight = revbuff.getChannelData(1);
        for(let i = 0; i < revLength; i++)
        {
            // clever reverb algorithm from here:
            // https://github.com/g200kg/webaudio-tinysynth/blob/master/webaudio-tinysynth.js#L1342
            if(i / revLength < Math.random())
            {
                revLeft[i] = Math.exp(-3 * i / revLength) * (Math.random() - 0.5) / 2;
                revRight[i] = Math.exp(-3 * i / revLength) * (Math.random() - 0.5) / 2;
            }
        }

        this.reverbProcessor = new ConvolverNode(this.context, {
            buffer: revbuff
        });

        this.reverbProcessor.connect(this.volumeController);
        this.volumeController.connect(this.panController);
        this.panController.connect(targetNode);
        this.chorusProcessor = new FancyChorus(this.volumeController);

        /**
         * For Black MIDI's - forces release time to 50ms
         * @type {boolean}
         */
        this.highPerformanceMode = false;

        /**
         * Controls the system
         * @type {"gm"|"gm2"|"gs"|"xg"}
         */
        this.system = DEFAULT_SYNTH_MODE;

        /**
         * the system that synth uses
         * @type {"worklet"|"legacy"}
         * @private
         */
        this._synthesisMode = DEFAULT_SYNTHESIS_MODE;
        if(window.isSecureContext === false)
        {
            this._synthesisMode = "legacy";
            console.log("%cDetected insecure context. Worklet system is unavailable, switching to legacy instead.", consoleColors.warn);
        }

        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);

        this.createDefaultChannels();
        console.log("%cSpessaSynth is ready!", consoleColors.recognized);
    }

    createDefaultChannels()
    {
        /**
         *  create 16 channels
         * @type {WorkletChannel[]|MidiChannel[]}
         */
        this.midiChannels = [];

        /**
         * The synth's transposition, in semitones.
         * @type {number}
         */
        this.transposition = 0;

        for (let i = 0; i < DEFAULT_CHANNEL_COUNT; i++) {
            this._addChannelInternal();
        }


        // change percussion channel to the percussion preset
        this.midiChannels[DEFAULT_PERCUSSION].percussionChannel = true;
        this.midiChannels[DEFAULT_PERCUSSION].setPreset(this.percussionPreset);
        this.midiChannels[DEFAULT_PERCUSSION].bank = 128;
    }

    /**
     * @private
     */
    _addChannelInternal()
    {
        if(this._synthesisMode === "worklet")
        {
            this.midiChannels.push(new WorkletChannel(this.volumeController, this.reverbProcessor, this.chorusProcessor.input, this.defaultPreset, this.midiChannels.length + 1, false));
        }
        else
        {
            this.midiChannels.push(new MidiChannel(this.volumeController, this.reverbProcessor, this.chorusProcessor.input, this.defaultPreset, this.midiChannels.length + 1, false));
        }
    }

    /**
     * Adds a new channel to the synthesizer
     */
    addNewChannel()
    {
        this._addChannelInternal();
        this.eventHandler.callEvent("newchannel", this.midiChannels[this.midiChannels.length - 1]);
    }

    /**
     * Starts playing a note
     * @param channel {number} 0-15 the channel to play the note
     * @param midiNote {number} 0-127 the key number of the note
     * @param velocity {number} 0-127 the velocity of the note (generally controls loudness)
     * @param enableDebugging {boolean} set to true to log technical details to console
     */
    noteOn(channel, midiNote, velocity, enableDebugging = false) {
        if (velocity === 0) {
            this.noteOff(channel, midiNote);
            return;
        }

        if((this.highPerformanceMode && this.voicesAmount > 200 && velocity < 40)
        ||
            (this.highPerformanceMode && velocity < 10))
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
        const amt = this.voicesAmount;
        if(amt > this.voiceCap)
        {
            // find the non percussion channel with the largest amount of voices
            const channel = this.midiChannels.reduce((prev, current) => {
                return (prev && prev.voicesAmount > current.voicesAmount && !prev.percussionChannel) ? prev : current
            });
            channel.requestNoteRemoval(amt - this.voiceCap);
        }

        this.eventHandler.callEvent("noteon", {
            midiNote: midiNote,
            channel: channel,
            velocity: velocity,
        });
    }

    /*
     * Prevents any further changes to the vibrato via NRPN messages and sets it to disabled
     */
    lockAndResetChannelVibrato()
    {
        this.midiChannels.forEach(c => {
            c.lockVibrato = false;
            c.vibrato = {depth: 0, rate: 0, delay: 0};
            c.lockVibrato = true;
        });
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
            // do not kill percussion notes
            this.midiChannels[channel].stopNote(midiNote, !this.midiChannels[channel].percussionChannel);
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
            channel.stopAll(force);
        }
        this.eventHandler.callEvent("stopall", {});
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
                    console.log("%cIgnoring the Bank Select, as the synth is in GM mode.", consoleColors.info);
                    return;
                }
                let bankNr = controllerValue;
                const channelObject = this.midiChannels[channel];

                // for xg, if msb is 127, then it's drums
                if(bankNr === 127 && this.system === "xg")
                {
                    channelObject.percussionChannel = true;
                    this.eventHandler.callEvent("drumchange",{
                        channel: channel,
                        isDrumChannel: true
                    });
                }
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
                    this.midiChannels[channel].bank = controllerValue;
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
            if(!ch.lockPreset) {
                ch.bank = 0;
                if ((ch.channelNumber - 1) % 16 === DEFAULT_PERCUSSION) {
                    ch.setPreset(this.percussionPreset);
                    ch.percussionChannel = true;
                    this.eventHandler.callEvent("drumchange", {
                        channel: ch.channelNumber - 1,
                        isDrumChannel: true
                    });
                } else {
                    ch.percussionChannel = false;
                    ch.setPreset(this.defaultPreset);
                    this.eventHandler.callEvent("drumchange", {
                        channel: ch.channelNumber - 1,
                        isDrumChannel: false
                    });
                }
            }

            // call all the event listeners
            const chNr = ch.channelNumber - 1;
            this.eventHandler.callEvent("programchange", {channel: chNr, preset: ch.preset})

            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.mainVolume, controllerValue: 100});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.pan, controllerValue: 64});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.expressionController, controllerValue: 127});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.modulationWheel, controllerValue: 0});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.effects3Depth, controllerValue: 0});
            this.eventHandler.callEvent("controllerchange", {channel: chNr, controllerNumber: midiControllers.effects1Depth, controllerValue: 0});

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
        this.transposition = semitones;
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
     * Reloads the sounfont.
     * @param soundFont {SoundFont2} the soundfont to another one
     */
    reloadSoundFont(soundFont)
    {
        this.soundFont = soundFont;
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
     * Sends a MIDI Sysex message to the synthesizer
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

            // non realtime
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

            // realtime
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
                        const channel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][messageData[5] & 0x0F]; // for example 1A means A = 11, which corresponds to channel 12 (counting from 1)

                        this.setDrums(channel, messageData[7] > 0 && messageData[5] >> 4); // if set to other than 0, is a drum channel
                        console.log(
                            `%cChannel %c${channel}%c ${this.midiChannels[channel].percussionChannel ? 
                                "is now a drum channel" 
                                : 
                                "now isn't a drum channel"
                            }%c via: %c${arrayToHexString(messageData)}`,
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
     * Toggles drums on a given channel
     * @param channel {number}
     * @param isDrum {boolean}
     */
    setDrums(channel, isDrum)
    {
        const channelObject = this.midiChannels[channel];
        if(isDrum)
        {
            channelObject.percussionChannel = true;
            channelObject.setPreset(this.soundFont.getPreset(128, channelObject.preset.program));
        }
        else
        {
            channelObject.percussionChannel = false;
            channelObject.setPreset(this.soundFont.getPreset(0, channelObject.preset.program));
        }
        this.eventHandler.callEvent("drumchange",{
            channel: channel,
            isDrumChannel: channelObject.percussionChannel
        });
        this.eventHandler.callEvent("programchange",{
            channel: channel,
            preset: channelObject.preset
        });
    }

    /**
     * sends a raw MIDI message to the synthesizer
     * @param message {Array<number>} the midi message, each number is a byte
     */
    sendMessage(message)
    {
        // discard as soon as possible if high perf
        const statusByteData = getEvent(message[0]);


        // process the event
        switch (statusByteData.status)
        {
            case messageTypes.noteOn:
                const velocity = message[2];
                if(velocity > 0) {
                    this.noteOn(statusByteData.channel, message[1], velocity);
                }
                else
                {
                    this.noteOff(statusByteData.channel, message[1]);
                }
                break;

            case messageTypes.noteOff:
                this.noteOff(statusByteData.channel, message[1]);
                break;

            case messageTypes.pitchBend:
                this.pitchWheel(statusByteData.channel, message[2], message[1]);
                break;

            case messageTypes.controllerChange:
                this.controllerChange(statusByteData.channel, message[1], message[2]);
                break;

            case messageTypes.programChange:
                this.programChange(statusByteData.channel, message[1]);
                break;

            case messageTypes.systemExclusive:
                this.systemExclusive(new ShiftableByteArray(message.slice(1)));
                break;

            case messageTypes.reset:
                this.stopAll();
                this.resetControllers();
                break;

            default:
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

    /**
     * @returns {number} the current amount of voices playing
     */
    get voicesAmount()
    {
        return this.midiChannels.reduce((amt, chan) => amt + chan.voicesAmount, 0);
    }

    get synthesisMode()
    {
        return this._synthesisMode;
    }

    /**
     * @param value {"worklet"|"legacy"}
     */
    set synthesisMode(value)
    {
        if (value !== "worklet" && value !== "legacy")
        {
            throw TypeError("invalid type!");
        }
        this._synthesisMode = value;
        const channelsAmount =  this.midiChannels.length;
        for (let i = 0; i < channelsAmount; i++) {
            this.midiChannels[i].stopAll(true);
            this.midiChannels[i].killChannel();
            delete this.midiChannels[i];
        }
        this.createDefaultChannels();
    }

    reverbateEverythingBecauseWhyNot()
    {
        for (let i = 0; i < this.midiChannels.length; i++) {
            this.controllerChange(i, midiControllers.effects1Depth, 127);
        }
        return "That's the spirit!";
    }
}