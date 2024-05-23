import { MidiChannel } from './midi_channel.js'
import { DEFAULT_PERCUSSION } from '../synthetizer.js'

/**
 * native_system.js
 * purpose: wrapper around an array of MidiChannels for compatibility reasons
 *
 */

export class NativeSystem
{
    /**
     * creates a whole instance of the native system
     * NOTE: this wrapper is only for compatibility reasons for the native system.
     * It just wraps around a list of MidiChannels
     * @param targetNode {AudioNode} the output node
     * @param reverbNode {AudioNode}
     * @param chorusNode {AudioNode}
     * @param defaultPreset {Preset}
     * @param percussionPreset {Preset}
     * @param channelsAmount {number}
     */
    constructor(targetNode,
                reverbNode,
                chorusNode,
                defaultPreset,
                percussionPreset,
                channelsAmount) {
        // set the constants
        this.ctx = targetNode.context;
        this.outputNode = targetNode;
        this.reverbNode = reverbNode;
        this.chorusNode = chorusNode;
        this.percussionPreset = percussionPreset;
        this.defaultPreset = defaultPreset;

        /**
         * the amount of midi channels
         * @type {number}
         */
        this.channelsAmount = 0;

        /**
         * create the channels
         * @type {MidiChannel[]}
          */
        this.midiChannels  = [];
        for (let i = 0; i < channelsAmount; i++) {
            this.createNewChannel();
        }

        this.midiChannels[DEFAULT_PERCUSSION].percussionChannel = true;
        this.midiChannels[DEFAULT_PERCUSSION].bank = 128;
        this.midiChannels[DEFAULT_PERCUSSION].setPreset(percussionPreset);
    }

    createNewChannel()
    {
        this.midiChannels.push(new MidiChannel(
            this.outputNode,
            this.reverbNode,
            this.chorusNode,
            this.defaultPreset,
            this.channelsAmount + 1
            ));
        this.channelsAmount++;
    }

    /**
     * Connects the individual audio outputs to the given audio nodes. In the app it's used by the renderer.
     * @param audioNodes {AudioNode[]}
     */
    connectIndividualOutputs(audioNodes)
    {
        if(audioNodes.length !== this.channelsAmount)
        {
            console.trace();
            throw `input nodes amount differs from the system's outputs amount!
            Expected ${this.channelsAmount} got ${audioNodes.length}`;
        }
        for (let outputNumber = 0; outputNumber < this.channelsAmount; outputNumber++) {
            // + 2 because chorus and reverb come first!
            this.midiChannels[outputNumber].gainController.connect(audioNodes[outputNumber]);
        }
    }

    /**
     * kills the system, disconnecting everything
     */
    killSystem()
    {
        for(let i = 0; i < this.midiChannels.length; i++)
        {
            this.killChannel(i);
        }
        delete this.midiChannels;
    }

    /**
     * Kills the channel, disconnecting everything
     * @param channel {number}
     */
    killChannel(channel)
    {
        this.midiChannels[channel].killChannel();
    }

    /**
     * locks the controller, preventing it from being changed
     * @param channel {number}
     * @param controllerNumber {number}
     */
    lockController(channel, controllerNumber)
    {
        this.midiChannels[channel].lockController(controllerNumber);
    }

    /**
     * unlocks the controller
     * @param channel {number}
     * @param controllerNumber {number}
     */
    unlockController(channel, controllerNumber)
    {
        this.midiChannels[channel].unlockController(controllerNumber);
    }

    /**
     * only for compatibility reason, native system does not support this
     * @param amount {number}
     */
    requestNoteRemoval(amount)
    {
        // pass
    }

    /**
     * @param channel {number}
     * @param isLocked {boolean}
     */
    setVibratoLock(channel, isLocked)
    {
        this.midiChannels[channel].lockVibrato = isLocked;
    }

    /**
     * @param channel {number}
     * @param value {{delay: number, depth: number, rate: number}}
     */
    setVibrato(channel, value)
    {
        if(this.midiChannels[channel].lockVibrato)
        {
            return;
        }
        this.midiChannels[channel].vibrato = value;
    }

    /**
     * @param channel {number}
     * @return {{depth: number, delay: number, rate: number}}
     */
    getVibrato(channel)
    {
        return this.midiChannels[channel].vibrato;
    }

    /**
     * @param channel {number}
     */
    muteChannel(channel)
    {
        this.midiChannels[channel].isMuted = true;
        this.midiChannels[channel].stopAll(true);
    }

    /**
     * @param channel {number}
     */
    unmuteChannel(channel)
    {
        this.midiChannels[channel].isMuted = false;
    }

    /**
     * @param channel {number}
     * @param cc {number}
     * @param val {number}
     * @returns {boolean} false if the cc was locked
     */
    controllerChange(channel, cc, val)
    {
        // MidiChannel handles this nrpn stuff automatically
        return this.midiChannels[channel].controllerChange(cc, val);
    }

    /**
     * Changes preset
     * @param channel {number}
     * @param preset {Preset}
     */
    setPreset(channel, preset) {
        this.midiChannels[channel].setPreset(preset);
    }

    /**
     * @param channel {number}
     * @param midiNote {number} 0-127
     * @param velocity {number} 0-127
     * @param debug {boolean}
     * @returns {number} the number of voices that this note adds
     */
    playNote(channel, midiNote, velocity, debug = false) {
        this.midiChannels[channel].playNote(midiNote, velocity, debug);
    }

    /**
     * Stops the note
     * @param channel {number}
     * @param midiNote {number} 0-127
     * @param highPerf {boolean} if set to true, the note will be silenced in 50ms
     */
    stopNote(channel, midiNote, highPerf=false) {
        this.midiChannels[channel].stopNote(midiNote, highPerf);
    }

    /**
     * @param channel {number}
     * @param bendMSB {number}
     * @param bendLSB {number}
     */
    setPitchBend(channel, bendMSB, bendLSB) {
        this.midiChannels[channel].setPitchBend(bendMSB, bendLSB);
    }

    // RPN and NRPN methods are ommited as they are in the midi_channel.js and used only internally

    /**
     * stops all notes on all channels
     * @param force {boolean}
     */
    stopAllChannels(force = false) {
        this.midiChannels.forEach(channel => channel.stopAll(force))
    }

    /**
     * @param channel {number}
     * @param force {boolean}
     */
    stopAll(channel, force=false)
    {
        this.midiChannels[channel].stopAll(force);
    }

    /**
     * Transposes all channels by given amount of semitones
     * @param semitones {number} Can be float
     * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
     */
    transposeAll(semitones, force=false)
    {
        for (let i = 0; i < this.channelsAmount; i++) {
            this.midiChannels[i].transposeChannel(semitones, force);
        }
    }

    /**
     * Transposes the channel by given amount of semitones
     * @param channel {number}
     * @param semitones {number} Can be float
     * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
     */
    transposeChannel(channel, semitones, force=false)
    {
        this.midiChannels[channel].transposeChannel(semitones, force);
    }

    /**
     * @param channel {number}
     */
    resetControllers(channel)
    {
        this.midiChannels[channel].resetControllers();
    }

    // reset parameters is internal

    resetSamples()
    {
        // pass, not applicable
    }

    get voicesAmount()
    {
        return this.midiChannels.reduce((total, channel) => total + channel.voicesAmount,0)
    }

}