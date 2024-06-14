import { SoundFont2 } from '../soundfont/soundfont_parser.js'
import { ShiftableByteArray } from '../utils/shiftable_array.js'
import { consoleColors } from '../utils/other.js'
import { getEvent, messageTypes, midiControllers } from '../midi_parser/midi_message.js'
import { WorkletSystem } from './worklet_system/worklet_system.js'
import { EventHandler } from './synth_event_handler.js'
import { FancyChorus } from './audio_effects/fancy_chorus.js'
import { getReverbProcessor } from './audio_effects/reverb.js'

/**
 * synthesizer.js
 * purpose: responds to midi messages and called functions, managing the channels and passing the messages to them
 */

export const VOICE_CAP = 450;

export const DEFAULT_PERCUSSION = 9;
export const DEFAULT_CHANNEL_COUNT = 16;
export const DEFAULT_SYNTH_MODE = "gs";

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

        this.reverbProcessor = getReverbProcessor(this.context);
        this.chorusProcessor = new FancyChorus(targetNode);

        this.reverbProcessor.connect(targetNode);

        /**
         * For Black MIDI's - forces release time to 50ms
         * @type {boolean}
         */
        this.highPerformanceMode = false;

        this.defaultPreset = this.soundFont.getPreset(0, 0);
        this.percussionPreset = this.soundFont.getPreset(128, 0);

        this.initializeSynthesisSystem(targetNode);
        console.info("%cSpessaSynth is ready!", consoleColors.recognized);
    }

    initializeSynthesisSystem(targetNode)
    {
        /**
         * The synth's core synthesis system
         * @type {WorkletSystem}
         */
        this.synthesisSystem = new WorkletSystem(
            targetNode,
            this.reverbProcessor,
            this.chorusProcessor.input,
            this.defaultPreset,
            this.percussionPreset,
            DEFAULT_CHANNEL_COUNT,
            this.eventHandler,
            this.soundFont);
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
        this.synthesisSystem.controllerChange(channel, controllerNumber, controllerValue);
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
     * Sets the main volume
     * @param volume {number} 0-1 the volume
     */
    setMainVolume(volume)
    {
        this.synthesisSystem.setMainVolume(volume);
    }

    /**
     * Sets the master stereo panning
     * @param pan {number} -1 to 1, the pan (-1 is left, 0 is midde, 1 is right)
     */
    setMasterPan(pan)
    {
        this.synthesisSystem.setMasterPan(pan);
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
        this.synthesisSystem.systemExclusive(Array.from(messageData));
    }

    /**
     * Toggles drums on a given channel
     * @param channel {number}
     * @param isDrum {boolean}
     */
    setDrums(channel, isDrum)
    {
        this.synthesisSystem.setDrums(channel, isDrum);
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

    reverbateEverythingBecauseWhyNot()
    {
        for (let i = 0; i < this.synthesisSystem.channelsAmount; i++) {
            this.controllerChange(i, midiControllers.effects1Depth, 127);
        }
        return "That's the spirit!";
    }
}