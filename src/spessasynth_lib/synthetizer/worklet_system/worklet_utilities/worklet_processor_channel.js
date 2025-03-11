import { CONTROLLER_TABLE_SIZE, CUSTOM_CONTROLLER_TABLE_SIZE, dataEntryStates } from "./controller_tables.js";
import { resetControllers, resetParameters } from "../worklet_methods/controller_control/reset_controllers.js";
import { renderVoice } from "../worklet_methods/render_voice.js";
import { panVoice } from "./stereo_panner.js";

/**
 * This class represents a single MIDI Channel within the synthesizer.
 */
export class WorkletProcessorChannel
{
    /**
     * An array of MIDI controller values and values used by modulators as the source (e.g., pitch bend, bend range, etc.).
     * These are stored as 14-bit values.
     * Refer to controller_tables.js for the index definitions.
     * @type {Int16Array}
     */
    midiControllers = new Int16Array(CONTROLLER_TABLE_SIZE);
    
    /**
     * An array indicating if a controller, at the equivalent index in the midiControllers array, is locked
     * (i.e., not allowed to change).
     * A locked controller cannot be modified.
     * @type {boolean[]}
     */
    lockedControllers = Array(CONTROLLER_TABLE_SIZE).fill(false);
    
    /**
     * An array of custom (non-SF2) control values such as RPN pitch tuning, transpose, modulation depth, etc.
     * Refer to controller_tables.js for the index definitions.
     * @type {Float32Array}
     */
    customControllers = new Float32Array(CUSTOM_CONTROLLER_TABLE_SIZE);
    
    /**
     * The key shift of the channel (in semitones).
     * @type {number}
     */
    channelTransposeKeyShift = 0;
    
    /**
     * An array of octave tuning values for each note on the channel.
     * Each index corresponds to a note (0 = C, 1 = C#, ..., 11 = B).
     * @type {Int8Array}
     */
    channelOctaveTuning = new Int8Array(12);
    
    /**
     * An array representing the tuning of individual keys in cents.
     * Each index corresponds to a MIDI note number (0-127).
     * @type {Int16Array}
     */
    keyCentTuning = new Int16Array(128);
    
    /**
     * Indicates whether the sustain (hold) pedal is active.
     * @type {boolean}
     */
    holdPedal = false;
    
    /**
     * Indicates whether this channel is a drum channel.
     * @type {boolean}
     */
    drumChannel = false;
    
    /**
     * If greater than 0, overrides the velocity value for the channel, otherwise it's disabled.
     * @type {number}
     */
    velocityOverride = 0;
    
    /**
     * Enables random panning for every note played on this channel.
     * @type {boolean}
     */
    randomPan = false;
    
    /**
     * The current state of the data entry for the channel.
     * @type {dataEntryStates}
     */
    dataEntryState = dataEntryStates.Idle;
    
    /**
     * The current coarse value of the Non-Registered Parameter (NRPN).
     * @type {number}
     */
    NRPCoarse = 0;
    
    /**
     * The current fine value of the Non-Registered Parameter (NRPN).
     * @type {number}
     */
    NRPFine = 0;
    
    /**
     * The current value of the Registered Parameter (RP).
     * @type {number}
     */
    RPValue = 0;
    
    /**
     * The bank number of the channel (used for patch changes).
     * @type {number}
     */
    bank = 0;
    
    /**
     * The preset currently assigned to the channel.
     * @type {BasicPreset}
     */
    preset = undefined;
    
    /**
     * Indicates whether the program on this channel is locked.
     * @type {boolean}
     */
    lockPreset = false;
    
    /**
     * Indicates whether the channel uses a preset from the override soundfont.
     * @type {boolean}
     */
    presetUsesOverride = false;
    
    /**
     * Indicates whether the GS NRPN parameters are enabled for this channel.
     * @type {boolean}
     */
    lockGSNRPNParams = false;
    
    /**
     * The vibrato settings for the channel.
     * @type {Object}
     * @property {number} depth - Depth of the vibrato effect in cents.
     * @property {number} delay - Delay before the vibrato effect starts (in seconds).
     * @property {number} rate - Rate of the vibrato oscillation (in Hz).
     */
    channelVibrato = { delay: 0, depth: 0, rate: 0 };
    
    /**
     * Indicates whether the channel is muted.
     * @type {boolean}
     */
    isMuted = false;
    
    /**
     * An array of voices currently active on the channel.
     * @type {WorkletVoice[]}
     */
    voices = [];
    
    /**
     * An array of voices that are sustained on the channel.
     * @type {WorkletVoice[]}
     */
    sustainedVoices = [];
    
    /**
     * A 3D array (MIDI note -> velocity -> WorkletVoices) for cached voices for each note and velocity.
     * @type {WorkletVoice[][][]}
     */
    cachedVoices = [];
    
    /**
     * The channel's number (0-based index)
     * @type {number}
     */
    channelNumber;
    
    /**
     * Parent processor instance.
     * @type {SpessaSynthProcessor}
     */
    synth;
    
    /**
     * Constructs a new MIDI channel
     * @param synth {SpessaSynthProcessor}
     * @param preset {BasicPreset}
     * @param channelNumber {number}
     */
    constructor(synth, preset, channelNumber)
    {
        this.synth = synth;
        this.preset = preset;
        this.channelNumber = channelNumber;
        for (let i = 0; i < 128; i++)
        {
            this.cachedVoices.push([]);
        }
    }
    
    /**
     * @param outputLeft {Float32Array} the left output buffer
     * @param outputRight {Float32Array} the right output buffer
     * @param reverbOutputLeft {Float32Array} left output for reverb
     * @param reverbOutputRight {Float32Array} right output for reverb
     * @param chorusOutputLeft {Float32Array} left output for chorus
     * @param chorusOutputRight {Float32Array} right output for chorus
     */
    renderAudio(
        outputLeft, outputRight,
        reverbOutputLeft, reverbOutputRight,
        chorusOutputLeft, chorusOutputRight
    )
    {
        this.voices = this.voices.filter(v => !this.renderVoice(
            v,
            outputLeft, outputRight,
            reverbOutputLeft, reverbOutputRight,
            chorusOutputLeft, chorusOutputRight
        ));
    }
}

WorkletProcessorChannel.prototype.renderVoice = renderVoice;
WorkletProcessorChannel.prototype.panVoice = panVoice;

WorkletProcessorChannel.prototype.resetControllers = resetControllers;
WorkletProcessorChannel.prototype.resetParameters = resetParameters;


/**
 * @param sendEvent {boolean}
 * @this {SpessaSynthProcessor}
 */
export function createWorkletChannel(sendEvent = false)
{
    /**
     * @type {WorkletProcessorChannel}
     */
    const channel = new WorkletProcessorChannel(this, this.defaultPreset, this.workletProcessorChannels.length);
    this.workletProcessorChannels.push(channel);
    this.resetControllers(this.workletProcessorChannels.length - 1);
    this.sendChannelProperties();
    if (sendEvent)
    {
        this.callEvent("newchannel", undefined);
    }
}

/**
 * @param channel {WorkletProcessorChannel}
 * @param bank {number}
 */
export function setBankSelect(channel, bank)
{
    if (!channel.lockPreset)
    {
        channel.bank = bank;
    }
}

/**
 * @param channel {WorkletProcessorChannel}
 * @returns {number}
 */
export function getBankSelect(channel)
{
    if (channel.drumChannel)
    {
        return 128;
    }
    return channel.bank;
}

/**
 * This is a channel configuration enum, it is internally sent from Synthetizer via controller change
 * @enum {number}
 */
export const channelConfiguration = {
    velocityOverride: 128 // overrides velocity for the given channel
};
