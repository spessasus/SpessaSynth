import { midiControllers } from '../../../midi_parser/midi_message.js'
import { modulatorSources } from '../../../soundfont/read/modulators.js'
/**
 * @typedef {Object} WorkletProcessorChannel
 * @property {Int16Array} midiControllers - array of MIDI controller values + the values used by modulators as source (pitch bend, bend range etc.)
 * @property {boolean[]} lockedControllers - array indicating if a controller is locked
 * @property {Float32Array} customControllers - array of custom (not sf2) control values such as RPN pitch tuning, transpose, modulation depth, etc.
 *
 * @property {number} channelTranspose - key shift of the channel
 * @property {boolean} holdPedal - indicates whether the hold pedal is active
 * @property {boolean} drumChannel - indicates whether the channel is a drum channel
 *
 * @property {dataEntryStates} dataEntryState - the current state of the data entry
 * @property {number} NRPCoarse - the current coarse value of the Non-Registered Parameter
 * @property {number} NRPFine - the current fine value of the Non-Registered Parameter
 * @property {number} RPValue - the current value of the Registered Parameter
 *
 * @property {Preset} preset - the channel's preset
 * @property {boolean} lockPreset - indicates whether the program on the channel is locked
 *
 * @property {boolean} lockVibrato - indicates whether the custom vibrato is locked
 * @property {Object} channelVibrato - vibrato settings for the channel
 * @property {number} channelVibrato.depth - depth of the vibrato effect (cents)
 * @property {number} channelVibrato.delay - delay before the vibrato effect starts (seconds)
 * @property {number} channelVibrato.rate - rate of the vibrato oscillation (Hz)

 * @property {boolean} isMuted - indicates whether the channel is muted
 * @property {WorkletVoice[]} voices - array of voices currently active on the channel
 * @property {WorkletVoice[]} sustainedVoices - array of voices that are sustained on the channel
 * @property {WorkletVoice[][][]} cachedVoices - first is midi note, second is velocity. output is an array of WorkletVoices
 */

/**
 * @param sendEvent {boolean}
 * @this {SpessaSynthProcessor}
 */
export function createWorkletChannel(sendEvent = false)
{
    /**
     * @type {WorkletProcessorChannel}
     */
    const channel = {
        midiControllers: new Int16Array(CONTROLLER_TABLE_SIZE),
        lockedControllers: Array(CONTROLLER_TABLE_SIZE).fill(false),
        customControllers: new Float32Array(CUSTOM_CONTROLLER_TABLE_SIZE),

        NRPCoarse: 0,
        NRPFine: 0,
        RPValue: 0,
        dataEntryState: dataEntryStates.Idle,

        voices: [],
        sustainedVoices: [],
        cachedVoices: [],
        preset: this.defaultPreset,

        channelTranspose: 0,
        channelVibrato: {delay: 0, depth: 0, rate: 0},
        lockVibrato: false,
        holdPedal: false,
        isMuted: false,
        drumChannel: false,
        lockPreset: false,

    }
    for (let i = 0; i < 128; i++) {
        channel.cachedVoices.push([]);
    }
    this.workletProcessorChannels.push(channel);
    this.resetControllers(this.workletProcessorChannels.length - 1);
    this.sendChannelProperties();
    if(sendEvent)
    {
        this.callEvent("newchannel", undefined);
    }
}

export const NON_CC_INDEX_OFFSET = 128;
export const CONTROLLER_TABLE_SIZE = 147;
// an array with preset default values so we can quickly use set() to reset the controllers
export const resetArray = new Int16Array(CONTROLLER_TABLE_SIZE).fill(0);
// default values (the array is 14 bit so shift the 7 bit values by 7 bits)
resetArray[midiControllers.mainVolume] = 100 << 7;
resetArray[midiControllers.expressionController] = 127 << 7;
resetArray[midiControllers.pan] = 64 << 7;
resetArray[midiControllers.releaseTime] = 64 << 7;
resetArray[midiControllers.brightness] = 64 << 7;
resetArray[midiControllers.effects1Depth] = 40 << 7;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel] = 8192;
resetArray[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] = 2 << 7;

/**
 * @enum {number}
 */
export const dataEntryStates = {
    Idle: 0,
    RPCoarse: 1,
    RPFine: 2,
    NRPCoarse: 3,
    NRPFine: 4,
    DataCoarse: 5,
    DataFine: 6
};


export const customControllers = {
    channelTuning: 0, // cents, RPN for tuning
    channelTranspose: 1, // cents, only the decimal tuning, (e.g. transpose is 4.5, then shift by 4 keys + tune by 50 cents)
    modulationMultiplier: 2, // cents, set by moduldation depth RPN
    masterTuning: 3, // cents, set by system exclusive
}
export const CUSTOM_CONTROLLER_TABLE_SIZE = Object.keys(customControllers).length;
export const customResetArray = new Float32Array(CUSTOM_CONTROLLER_TABLE_SIZE);
customResetArray[customControllers.modulationMultiplier] = 1;
