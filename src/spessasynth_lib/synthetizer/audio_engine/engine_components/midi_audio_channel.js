import {
    CONTROLLER_TABLE_SIZE,
    CUSTOM_CONTROLLER_TABLE_SIZE,
    customControllers,
    dataEntryStates,
    NON_CC_INDEX_OFFSET
} from "./controller_tables.js";
import {
    resetControllers,
    resetControllersRP15Compliant,
    resetParameters
} from "../engine_methods/controller_control/reset_controllers.js";
import { renderVoice } from "../engine_methods/render_voice.js";
import { panVoice } from "./stereo_panner.js";
import { killNote } from "../engine_methods/stopping_notes/kill_note.js";
import { setTuning } from "../engine_methods/tuning_control/set_tuning.js";
import { setModulationDepth } from "../engine_methods/tuning_control/set_modulation_depth.js";
import { dataEntryFine } from "../engine_methods/data_entry/data_entry_fine.js";
import { controllerChange } from "../engine_methods/controller_control/controller_change.js";
import { stopAllNotes } from "../engine_methods/stopping_notes/stop_all_notes.js";
import { muteChannel } from "../engine_methods/mute_channel.js";
import { transposeChannel } from "../engine_methods/tuning_control/transpose_channel.js";
import { dataEntryCoarse } from "../engine_methods/data_entry/data_entry_coarse.js";
import { noteOn } from "../engine_methods/note_on.js";
import { noteOff } from "../engine_methods/stopping_notes/note_off.js";
import { polyPressure } from "../engine_methods/tuning_control/poly_pressure.js";
import { channelPressure } from "../engine_methods/tuning_control/channel_pressure.js";
import { pitchWheel } from "../engine_methods/tuning_control/pitch_wheel.js";
import { setOctaveTuning } from "../engine_methods/tuning_control/set_octave_tuning.js";
import { programChange } from "../engine_methods/program_change.js";
import { chooseBank, isSystemXG, parseBankSelect } from "../../../utils/xg_hacks.js";
import { DEFAULT_PERCUSSION } from "../../synth_constants.js";
import { modulatorSources } from "../../../soundfont/basic_soundfont/modulator.js";

/**
 * This class represents a single MIDI Channel within the synthesizer.
 */
class MidiAudioChannel
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
     * (i.e., not allowed changing).
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
     * Note: Repeaded every 12 notes
     * @type {Int8Array}
     */
    channelOctaveTuning = new Int8Array(128);
    
    /**
     * Will be updated every time something tuning-related gets changed.
     * This is used to avoid a big addition for every voice rendering call.
     * @type {number}
     */
    channelTuningCents = 0;
    
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
     * The bank number of the channel (used for patch changes).
     * @type {number}
     */
    bank = 0;
    
    /**
     * The bank number sent as channel properties.
     * @type {number}
     */
    sentBank = 0;
    
    /**
     * The bank LSB number of the channel (used for patch changes in XG mode).
     * @type {number}
     */
    bankLSB = 0;
    
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
     * Indicates the MIDI system when the preset was locked.
     * @type {SynthSystem}
     */
    lockedSystem = "gs";
    
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
     * @type {Voice[]}
     */
    voices = [];
    
    /**
     * An array of voices that are sustained on the channel.
     * @type {Voice[]}
     */
    sustainedVoices = [];
    
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
    }
    
    get isXGChannel()
    {
        return isSystemXG(this.synth.system) || (this.lockPreset && isSystemXG(this.lockedSystem));
    }
    
    /**
     * @param type {customControllers|number}
     * @param value {number}
     */
    setCustomController(type, value)
    {
        this.customControllers[type] = value;
        this.updateChannelTuning();
    }
    
    updateChannelTuning()
    {
        this.channelTuningCents =
            this.customControllers[customControllers.channelTuning]                     // RPN channel fine tuning
            + this.customControllers[customControllers.channelTransposeFine]            // user tuning (transpose)
            + this.customControllers[customControllers.masterTuning]                    // master tuning, set by sysEx
            + (this.customControllers[customControllers.channelTuningSemitones] * 100); // RPN channel coarse tuning
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
            v, this.synth.currentSynthTime,
            outputLeft, outputRight,
            reverbOutputLeft, reverbOutputRight,
            chorusOutputLeft, chorusOutputRight
        ));
    }
    
    /**
     * @param locked {boolean}
     */
    setPresetLock(locked)
    {
        this.lockPreset = locked;
        if (locked)
        {
            this.lockedSystem = this.synth.system;
        }
    }
    
    /**
     * @param bank {number}
     * @param isLSB {boolean}
     */
    setBankSelect(bank, isLSB = false)
    {
        if (this.lockPreset)
        {
            return;
        }
        if (isLSB)
        {
            this.bankLSB = bank;
        }
        else
        {
            this.bank = bank;
            const bankLogic = parseBankSelect(
                this.getBankSelect(),
                bank,
                this.synth.system,
                false,
                this.drumChannel,
                this.channelNumber
            );
            switch (bankLogic.drumsStatus)
            {
                default:
                case 0:
                    break;
                
                case 1:
                    if (this.channelNumber % 16 === DEFAULT_PERCUSSION)
                    {
                        // cannot disable drums on channel 9
                        this.bank = 127;
                    }
                    break;
                
                case 2:
                    this.setDrums(true);
                    break;
            }
        }
    }
    
    /**
     * @returns {number}
     */
    getBankSelect()
    {
        return chooseBank(this.bank, this.bankLSB, this.drumChannel, this.isXGChannel);
    }
    
    /**
     * Changes a preset of this channel
     * @param preset {BasicPreset}
     */
    setPreset(preset)
    {
        if (this.lockPreset)
        {
            return;
        }
        delete this.preset;
        this.preset = preset;
    }
    
    /**
     * Sets drums on channel.
     * @param isDrum {boolean}
     */
    setDrums(isDrum)
    {
        if (this.lockPreset)
        {
            return;
        }
        if (this.drumChannel === isDrum)
        {
            return;
        }
        if (isDrum)
        {
            // clear transpose
            this.channelTransposeKeyShift = 0;
            this.drumChannel = true;
        }
        else
        {
            this.drumChannel = false;
        }
        this.presetUsesOverride = false;
        this.synth.callEvent("drumchange", {
            channel: this.channelNumber,
            isDrumChannel: this.drumChannel
        });
        this.programChange(this.preset.program);
        this.sendChannelProperty();
    }
    
    /**
     * Sets a custom vibrato
     * @param depth {number} cents
     * @param rate {number} Hz
     * @param delay {number} seconds
     */
    setVibrato(depth, rate, delay)
    {
        if (this.lockGSNRPNParams)
        {
            return;
        }
        this.channelVibrato.rate = rate;
        this.channelVibrato.delay = delay;
        this.channelVibrato.depth = depth;
    }
    
    disableAndLockGSNRPN()
    {
        this.lockGSNRPNParams = true;
        this.channelVibrato.rate = 0;
        this.channelVibrato.delay = 0;
        this.channelVibrato.depth = 0;
    }
    
    
    /**
     * @typedef {Object} ChannelProperty
     * @property {number} voicesAmount - the channel's current voice amount
     * @property {number} pitchBend - the channel's current pitch bend from -8192 do 8192
     * @property {number} pitchBendRangeSemitones - the pitch bend's range, in semitones
     * @property {boolean} isMuted - indicates whether the channel is muted
     * @property {boolean} isDrum - indicates whether the channel is a drum channel
     * @property {number} transposition - the channel's transposition, in semitones
     * @property {number} bank - the bank number of the current preset
     * @property {number} program - the MIDI program number of the current preset
     */
    
    
    /**
     * Sends this channel's property
     */
    sendChannelProperty()
    {
        if (!this.synth.enableEventSystem)
        {
            return;
        }
        /**
         * @type {ChannelProperty}
         */
        const data = {
            voicesAmount: this.voices.length,
            pitchBend: this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheel],
            pitchBendRangeSemitones: this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] / 128,
            isMuted: this.isMuted,
            isDrum: this.drumChannel,
            transposition: this.channelTransposeKeyShift + this.customControllers[customControllers.channelTransposeFine] / 100,
            bank: this.sentBank,
            program: this.preset.program
        };
        this.synth?.callbacks?.channelPropertyChange?.(data, this.channelNumber);
    }
}

// voice
MidiAudioChannel.prototype.renderVoice = renderVoice;
MidiAudioChannel.prototype.panVoice = panVoice;
MidiAudioChannel.prototype.killNote = killNote;
MidiAudioChannel.prototype.stopAllNotes = stopAllNotes;
MidiAudioChannel.prototype.muteChannel = muteChannel;

// MIDI messages
MidiAudioChannel.prototype.noteOn = noteOn;
MidiAudioChannel.prototype.noteOff = noteOff;
MidiAudioChannel.prototype.polyPressure = polyPressure;
MidiAudioChannel.prototype.channelPressure = channelPressure;
MidiAudioChannel.prototype.pitchWheel = pitchWheel;
MidiAudioChannel.prototype.programChange = programChange;

// Tuning
MidiAudioChannel.prototype.setTuning = setTuning;
MidiAudioChannel.prototype.setOctaveTuning = setOctaveTuning;
MidiAudioChannel.prototype.setModulationDepth = setModulationDepth;
MidiAudioChannel.prototype.transposeChannel = transposeChannel;

// CC
MidiAudioChannel.prototype.controllerChange = controllerChange;
MidiAudioChannel.prototype.resetControllers = resetControllers;
MidiAudioChannel.prototype.resetControllersRP15Compliant = resetControllersRP15Compliant;
MidiAudioChannel.prototype.resetParameters = resetParameters;
MidiAudioChannel.prototype.dataEntryFine = dataEntryFine;
MidiAudioChannel.prototype.dataEntryCoarse = dataEntryCoarse;

export { MidiAudioChannel };
