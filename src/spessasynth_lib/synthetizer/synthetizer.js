import { SoundFont2 } from '../soundfont/soundfont_parser.js'
import { ShiftableByteArray } from '../utils/shiftable_array.js'
import { arrayToHexString, consoleColors } from '../utils/other.js'
import { getEvent, messageTypes, midiControllers } from '../midi_parser/midi_message.js'
import { WorkletSystem } from './worklet_system/worklet_system.js'
import { EventHandler } from './synth_event_handler.js'
import { FancyChorus } from './audio_effects/fancy_chorus.js'
import { NativeSystem } from './native_system/native_system.js'
import { getReverbProcessor } from './audio_effects/reverb.js'

/**
 * synthesizer.js
 * purpose: responds to midi messages and called functions, managing the channels and passing the messages to them
 */

export const VOICE_CAP = 450;

export const DEFAULT_GAIN = 1;
export const DEFAULT_PERCUSSION = 9;
export const DEFAULT_CHANNEL_COUNT = 16;
export const DEFAULT_SYNTH_MODE = "gs";
export const DEFAULT_SYNTHESIS_MODE = "worklet";

export class Synthetizer {
    /**
     * Creates a new instance of the SpessaSynth synthesizer
     * @param targetNode {AudioNode}
     * @param soundFont {SoundFont2}
     */
     constructor(targetNode, soundFont) {
        console.info("%cInitializing SpessaSynth synthesizer...", consoleColors.info);
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

        /**
         * In cents, master tuning
         * @type {number}
         */
        this.tuning = 0;

        this.reverbProcessor = getReverbProcessor(this.context);
        this.chorusProcessor = new FancyChorus(this.volumeController);

        this.reverbProcessor.connect(this.volumeController);

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
            console.warn("%cDetected insecure context. Worklet system is unavailable, switching to legacy instead.", consoleColors.warn);
        }

        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);

        this.initializeSynthesisSystem();
        console.info("%cSpessaSynth is ready!", consoleColors.recognized);
    }

    initializeSynthesisSystem()
    {
        if(this._synthesisMode === "worklet")
        {
            /**
             * The synth's core synthesis system
             * @type {WorkletSystem}
             */
            this.synthesisSystem = new WorkletSystem(
                this.volumeController,
                this.reverbProcessor,
                this.chorusProcessor.input,
                this.defaultPreset,
                this.percussionPreset,
                DEFAULT_CHANNEL_COUNT);
        }
        else
        {
            this.synthesisSystem = new NativeSystem(
                this.volumeController,
                this.reverbProcessor,
                this.chorusProcessor.input,
                this.defaultPreset,
                this.percussionPreset,
                DEFAULT_CHANNEL_COUNT
            );
        }

        /**
         * The synth's transposition, in semitones.
         * @type {number}
         */
        this.transposition = 0;
    }

    /**
     * Adds a new channel to the synthesizer
     */
    addNewChannel()
    {
        this.synthesisSystem.createNewChannel();
        this.eventHandler.callEvent("newchannel", this.synthesisSystem.midiChannels[this.synthesisSystem.channelsAmount - 1]);
    }

    /*
     * Prevents any further changes to the vibrato via NRPN messages and sets it to disabled
     */
    lockAndResetChannelVibrato()
    {
        for (let i = 0; i < this.synthesisSystem.channelsAmount; i++) {
            this.synthesisSystem.setVibratoLock(i, false);
            this.synthesisSystem.setVibrato(i, {depth: 0, rate: 0, delay: 0});
            this.synthesisSystem.setVibratoLock(i, true);
        }
    }

    /**
     * Starts playing a note
     * @param channel {number} usually 0-15: the channel to play the note
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
        (this.highPerformanceMode && velocity < 10)
        ||
        (this.synthesisSystem.midiChannels[channel].isMuted))
        {
            return;
        }

        if(midiNote > 127 || midiNote < 0)
        {
            console.warn(`Received a noteOn for note`, midiNote, "Ignoring.");
            return;
        }

        this.synthesisSystem.playNote(channel, midiNote, velocity, enableDebugging);

        this.eventHandler.callEvent("noteon", {
            midiNote: midiNote,
            channel: channel,
            velocity: velocity,
        });
    }

    /**
     * Stops playing a note
     * @param channel {number} usually 0-15: the channel of the note
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

        // if high performance mode, kill notes instead of stopping them
        if(this.highPerformanceMode)
        {
            // if the channel is percussion channel, do not kill the notes
            this.synthesisSystem.stopNote(channel, midiNote, !this.synthesisSystem.midiChannels[channel].percussionChannel);
            return;
        }
        this.synthesisSystem.stopNote(channel, midiNote);
    }

    /**
     * Stops all notes
     * @param force {boolean} if we should instantly kill the note, defaults to false
     */
    stopAll(force=false) {
        console.info("%cStop all received!", consoleColors.info);
        this.synthesisSystem.stopAllChannels(force);
        this.eventHandler.callEvent("stopall", {});
    }

    /**
     * Changes the given controller
     * @param channel {number} usually 0-15: the channel to change the controller
     * @param controllerNumber {number} 0-127 the MIDI CC number
     * @param controllerValue {number} 0-127 the controller value
     */
    controllerChange(channel, controllerNumber, controllerValue)
    {
        let hasChanged = true;
        switch (controllerNumber) {
            case midiControllers.allNotesOff:
                this.stopAll();
                break;

            case midiControllers.allSoundOff:
                this.stopAll(true);
                break;

            case midiControllers.bankSelect:
                let bankNr = controllerValue;
                const channelObject = this.synthesisSystem.midiChannels[channel];
                switch (this.system)
                {
                    case "gm":
                        // gm ignores bank select
                        console.info(`%cIgnoring the Bank Select (${controllerValue}), as the synth is in GM mode.`, consoleColors.info);
                        return;

                    case "xg":
                        // for xg, if msb is 127, then it's drums
                        if (bankNr === 127)
                        {
                            channelObject.percussionChannel = true;
                            this.eventHandler.callEvent("drumchange", {
                                channel: channel,
                                isDrumChannel: true
                            });
                        }
                        break;

                    case "gm2":
                        if(bankNr === 120)
                        {
                            channelObject.percussionChannel = true;
                            this.eventHandler.callEvent("drumchange", {
                                channel: channel,
                                isDrumChannel: true
                            });
                        }
                }

                if(channelObject.percussionChannel)
                {
                    // 128 for percussion channel
                    bankNr = 128;
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
                    if(this.synthesisSystem.midiChannels[channel].bank === 0)
                    {
                        this.synthesisSystem.midiChannels[channel].bank = controllerValue;
                    }
                }
                else
                if(this.system === "gm2")
                {
                    this.synthesisSystem.midiChannels[channel].bank = controllerValue;
                }


                break;


            default:
                hasChanged = this.synthesisSystem.controllerChange(channel, controllerNumber, controllerValue);
                break;
        }
        if(hasChanged) {
            this.eventHandler.callEvent("controllerchange", {
                channel: channel,
                controllerNumber: controllerNumber,
                controllerValue: controllerValue
            });
        }
    }

    /**
     * Resets all controllers (for every channel)
     */
    resetControllers()
    {
        console.info("%cResetting all controllers!", consoleColors.info);
        for(let channelNumber = 0; channelNumber < this.synthesisSystem.channelsAmount; channelNumber++)
        {
            // reset
            this.synthesisSystem.resetControllers(channelNumber);
            /**
             * @type {WorkletChannel}
             **/
            const ch = this.synthesisSystem.midiChannels[channelNumber];
            if(!ch.lockPreset) {
                ch.bank = 0;
                if (channelNumber % 16 === DEFAULT_PERCUSSION) {
                    this.synthesisSystem.setPreset(channelNumber, this.percussionPreset);
                    ch.percussionChannel = true;
                    this.eventHandler.callEvent("drumchange", {
                        channel: channelNumber,
                        isDrumChannel: true
                    });
                } else {
                    ch.percussionChannel = false;
                    this.synthesisSystem.setPreset(channelNumber, this.defaultPreset);
                    this.eventHandler.callEvent("drumchange", {
                        channel: channelNumber,
                        isDrumChannel: false
                    });
                }
            }

            // call all the event listeners
            this.eventHandler.callEvent("programchange", {channel: channelNumber, preset: ch.preset})

            let restoreControllerValueEvent = (ccNum, value) =>
            {
                if(this.synthesisSystem.midiChannels[channelNumber].lockedControllers[ccNum])
                {
                    // locked, we did not reset it
                    return;
                }
                this.eventHandler.callEvent("controllerchange", {channel: channelNumber, controllerNumber: ccNum, controllerValue: value});
            }

            restoreControllerValueEvent(midiControllers.mainVolume, 100);
            restoreControllerValueEvent(midiControllers.pan, 64);
            restoreControllerValueEvent(midiControllers.expressionController, 127);
            restoreControllerValueEvent(midiControllers.modulationWheel, 0);
            restoreControllerValueEvent(midiControllers.effects3Depth, 0);
            restoreControllerValueEvent(midiControllers.effects1Depth, 40);

            this.eventHandler.callEvent("pitchwheel", {channel: channelNumber, MSB: 64, LSB: 0})
        }
        this.system = DEFAULT_SYNTH_MODE;
        this.volumeController.gain.value = DEFAULT_GAIN;
        this.panController.pan.value = 0;
        this.tuning = 0;
    }

    /**
     * Sets the pitch of the given channel
     * @param channel {number} usually 0-15: the channel to change pitch
     * @param MSB {number} SECOND byte of the MIDI pitchWheel message
     * @param LSB {number} FIRST byte of the MIDI pitchWheel message
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.synthesisSystem.setPitchBend(channel, MSB, LSB);
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
        this.synthesisSystem.transposeAll(semitones);
        this.transposition = semitones;
    }

    /**
     * Tunes the synthesizer (independent from transpose and gets affected by reset
     * @param cents {number}
     */
    tune(cents)
    {
        this.synthesisSystem.setMasterTuning(cents);
        this.tuning = cents;
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
     * @param channel {number} usually 0-15: the channel to change
     * @param programNumber {number} 0-127 the MIDI patch number
     * @param userChange {boolean} indicates if the program change has been called by user. defaults to false
     */
    programChange(channel, programNumber, userChange=false)
    {
        const channelObj = this.synthesisSystem.midiChannels[channel];
        // always 128 for percussion
        const bank = (channelObj.percussionChannel ? 128 : channelObj.bank);

        // find the preset
        let preset = this.soundFont.getPreset(bank, programNumber);
        this.synthesisSystem.setPreset(channel, preset)
        this.eventHandler.callEvent("programchange", {
            channel: channel,
            preset: preset,
            userCalled: userChange
        });
    }

    /**
     * Causes the given midi channel to ignore controller messages for the given controller number
     * @param channel {number} usually 0-15: the channel to lock
     * @param controllerNumber {number} 0-127 MIDI CC number
     * @param isLocked {boolean} true if locked, false if unlocked
     */
    lockController(channel, controllerNumber, isLocked)
    {
        if(isLocked) {
            this.synthesisSystem.lockController(channel, controllerNumber);
        }
        else
        {
            this.synthesisSystem.unlockController(channel, controllerNumber);
        }
    }

    /**
     * Mutes or unmutes the given channel
     * @param channel {number} usually 0-15: the channel to lock
     * @param isMuted {boolean} indicates if the channel is muted
     */
    muteChannel(channel, isMuted)
    {
        if(isMuted)
        {
            this.synthesisSystem.muteChannel(channel);
        }
        else
        {
            this.synthesisSystem.unmuteChannel(channel);
        }
        this.eventHandler.callEvent("mutechannel", {
            channel: channel,
            isMuted: isMuted
        });
    }

    /**
     * Reloads the sounfont.
     * @param soundFont {SoundFont2} the soundfont to another one
     */
    reloadSoundFont(soundFont)
    {
        this.stopAll(true);
        this.soundFont = soundFont;
        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);

        // check if the system supports clearing samples (only worklet does)
        if(this.synthesisSystem.resetSamples)
        {
            this.synthesisSystem.resetSamples();
        }
        for(let i = 0; i < this.synthesisSystem.channelsAmount; i++)
        {
            this.synthesisSystem.midiChannels[i].lockPreset = false;
            this.programChange(i, this.synthesisSystem.midiChannels[i].preset.program);
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
                console.info(`%cUnrecognized SysEx: %c${arrayToHexString(messageData)}`,
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
                        console.info("%cGM system on", consoleColors.info);
                        this.system = "gm";
                    }
                    else if(messageData[3] === 0x03)
                    {
                        console.info("%cGM2 system on", consoleColors.info);
                        this.system = "gm2";
                    }
                    else
                    {
                        console.info("%cGM system off, defaulting to GS", consoleColors.info);
                        this.system = "gs";
                    }
                }
                break;

            // realtime
            case 0x7F:
                if(messageData[2] === 0x04 && messageData[3] === 0x01)
                {
                    // main volume
                    const vol = messageData[5] << 7 | messageData[4];
                    this.volumeController.gain.value = (vol / 16384) * DEFAULT_GAIN;
                    console.info(`%cMaster Volume. Volume: %c${vol}`,
                        consoleColors.info,
                        consoleColors.value);
                }
                else
                if(messageData[2] === 0x04 && messageData[3] === 0x03)
                {
                    // fine tuning
                    const tuningValue = ((messageData[5] << 7) | messageData[6]) - 8192;
                    const cents = Math.floor(tuningValue / 81.92); // [-100;+99] cents range
                    this.tune(cents);
                    console.info(`%cMaster Fine Tuning. Cents: %c${cents}`,
                        consoleColors.info,
                        consoleColors.value)
                }
                else
                if(messageData[2] === 0x04 && messageData[3] === 0x04)
                {
                    // coarse tuning
                    // lsb is ignored
                    const semitones = messageData[5] - 64;
                    const cents = semitones * 100;
                    this.tune(cents);
                    console.info(`%cMaster Coarse Tuning. Cents: %c${cents}`,
                        consoleColors.info,
                        consoleColors.value)
                }
                else
                {
                    console.info(
                        `%cUnrecognized MIDI Real-time message: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized)
                }
                break;

            // this is a roland sysex
            // http://www.bandtrax.com.au/sysex.htm
            // https://cdn.roland.com/assets/media/pdf/AT-20R_30R_MI.pdf
            case 0x41:
                // messagedata[1] is device id (ignore as we're everything >:) )
                if(messageData[2] === 0x42 && messageData[3] === 0x12)
                {
                    // this is a GS sysex
                    // messageData[5] and [6] is the system parameter, messageData[7] is the value
                    const messageValue = messageData[7];
                    if(messageData[6] === 0x7F)
                    {
                        // GS mode set
                        if(messageValue === 0x00) {
                            // this is a GS reset
                            console.info("%cGS system on", consoleColors.info);
                            this.system = "gs";
                        }
                        else if(messageValue === 0x7F)
                        {
                            // GS mode off
                            console.info("%cGS system off, switching to GM2", consoleColors.info);
                            this.system = "gm2";
                        }
                        return;
                    }
                    else
                    if(messageData[4] === 0x40)
                    {
                        // this is a system parameter
                        if((messageData[5] & 0x10) > 0)
                        {
                            // this is an individual part (channel) parameter
                            // determine the channel 0 means channel 10 (default), 1 means 1 etc.
                            const channel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][messageData[5] & 0x0F]; // for example 1A means A = 11, which corresponds to channel 12 (counting from 1)
                            switch (messageData[6])
                            {
                                default:
                                    break;

                                case 0x15:
                                    // this is the Use for Drum Part sysex (multiple drums)
                                    this.setDrums(channel, messageValue > 0 && messageData[5] >> 4); // if set to other than 0, is a drum channel
                                    console.info(
                                        `%cChannel %c${channel}%c ${this.synthesisSystem.midiChannels[channel].percussionChannel ?
                                            "is now a drum channel"
                                            :
                                            "now isn't a drum channel"
                                        }%c via: %c${arrayToHexString(messageData)}`,
                                        consoleColors.info,
                                        consoleColors.value,
                                        consoleColors.recognized,
                                        consoleColors.info,
                                        consoleColors.value);
                                    return;

                                case 0x16:
                                    // this is the pitch key shift sysex
                                    const keyShift = messageValue - 64;
                                    this.synthesisSystem.transposeChannel(channel, keyShift);
                                    console.info(`%cChannel %c${channel}%c pitch shift. Semitones %c${keyShift}%c, with %c${arrayToHexString(messageData)}`,
                                        consoleColors.info,
                                        consoleColors.recognized,
                                        consoleColors.info,
                                        consoleColors.value,
                                        consoleColors.info,
                                        consoleColors.value);
                                    return;

                                case 0x40:
                                case 0x41:
                                case 0x42:
                                case 0x43:
                                case 0x44:
                                case 0x45:
                                case 0x46:
                                case 0x47:
                                case 0x48:
                                case 0x49:
                                case 0x4A:
                                case 0x4B:
                                    // scale tuning
                                    const cents = messageValue - 64;
                                    console.info(`%cChannel %c${channel}%c tuning. Cents %c${cents}%c, with %c${arrayToHexString(messageData)}`,
                                        consoleColors.info,
                                        consoleColors.recognized,
                                        consoleColors.info,
                                        consoleColors.value,
                                        consoleColors.info,
                                        consoleColors.value);
                                    this.synthesisSystem.setChannelTuning(channel, cents);
                            }
                        }
                        else
                        // this is a global system parameter
                        if(messageData[5] === 0x00 && messageData[6] === 0x06)
                        {
                            // roland master pan
                            console.info(`%cRoland GS Master Pan set to: %c${messageValue}%c with: %c${arrayToHexString(messageData)}`,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info,
                                consoleColors.value);
                            this.panController.pan.value = (messageValue - 64) / 64;
                            return;
                        }
                        else
                        if(messageData[5] === 0x00 && messageData[6] === 0x05)
                        {
                            // roland master key shift (transpose)
                            const transpose = messageValue - 64;
                            console.info(`%cRoland GS Master Key-Shift set to: %c${transpose}%c with: %c${arrayToHexString(messageData)}`,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info,
                                consoleColors.value);
                            this.tune(transpose * 100);
                            return;
                        }
                        else
                        if(messageData[5] === 0x00 && messageData[6] === 0x04)
                        {
                            // roland GS master volume
                            console.info(`%cRoland GS Master Volume set to: %c${messageValue}%c with: %c${arrayToHexString(messageData)}`,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info,
                                consoleColors.value);
                            this.setMainVolume(messageValue / 127);
                            return;
                        }
                    }
                    // this is some other GS sysex...
                    console.info(`%cUnrecognized Roland %cGS %cSysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.recognized,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                    return;
                }
                else
                if(messageData[2] === 0x16 && messageData[3] === 0x12 && messageData[4] === 0x10)
                {
                    // this is a roland master volume message
                    this.volumeController.gain.value = messageData[7] / 100 * DEFAULT_GAIN;
                    console.info(`%cRoland Master Volume control set to: %c${messageData[7]}%c via: %c${arrayToHexString(messageData)}`,
                        consoleColors.info,
                        consoleColors.value,
                        consoleColors.info,
                        consoleColors.value);
                    return;
                }
                else
                {
                    // this is something else...
                    console.info(`%cUnrecognized Roland SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                    return;
                }

            // yamaha
            case 0x43:
                // XG on
                if(messageData[2] === 0x4C && messageData[5] === 0x7E && messageData[6] === 0x00)
                {
                    console.info("%cXG system on", consoleColors.info);
                    this.system = "xg";
                }
                else
                {
                    console.info(`%cUnrecognized Yamaha SysEx: %c${arrayToHexString(messageData)}`,
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
        const channelObject = this.synthesisSystem.midiChannels[channel];
        if(isDrum)
        {
            channelObject.percussionChannel = true;
            this.synthesisSystem.setPreset(channel, this.soundFont.getPreset(128, channelObject.preset.program));
        }
        else
        {
            channelObject.percussionChannel = false;
            this.synthesisSystem.setPreset(channel, this.soundFont.getPreset(0, channelObject.preset.program));
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
     * @param message {ArrayLike<number>} the midi message, each number is a byte
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
                this.stopAll(true);
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
        return this.synthesisSystem.voicesAmount;
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
        this.synthesisSystem.killSystem();
        delete this.synthesisSystem;
        this.initializeSynthesisSystem();
    }

    reverbateEverythingBecauseWhyNot()
    {
        for (let i = 0; i < this.synthesisSystem.channelsAmount; i++) {
            this.controllerChange(i, midiControllers.effects1Depth, 127);
        }
        return "That's the spirit!";
    }
}