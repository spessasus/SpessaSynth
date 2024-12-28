import { returnMessageType } from "../message_protocol/worklet_message.js";
import { SpessaSynthInfo } from "../../../utils/loggin.js";
import { consoleColors } from "../../../utils/other.js";
import { getBankSelect, setBankSelect } from "../worklet_utilities/worklet_processor_channel.js";

/**
 * Represents a snapshot of a single channel's state in the synthesizer.
 */
class ChannelSnapshot
{
    /**
     * The channel's MIDI program number.
     * @type {number}
     */
    program;
    
    /**
     * The channel's bank number.
     * @type {number}
     */
    bank;
    
    /**
     * The name of the patch currently loaded in the channel.
     * @type {string}
     */
    patchName;
    
    /**
     * Indicates whether the channel's program change is disabled.
     * @type {boolean}
     */
    lockPreset;
    
    /**
     * The array of all MIDI controllers (in 14-bit values) with the modulator sources at the end.
     * @type {Int16Array}
     */
    midiControllers;
    
    /**
     * An array of booleans, indicating if the controller with a current index is locked.
     * @type {boolean[]}
     */
    lockedControllers;
    
    /**
     * Array of custom (not SF2) control values such as RPN pitch tuning, transpose, modulation depth, etc.
     * @type {Float32Array}
     */
    customControllers;
    
    /**
     * Indicates whether the channel vibrato is locked.
     * @type {boolean}
     */
    lockVibrato;
    
    /**
     * The channel's vibrato settings.
     * @type {Object}
     * @property {number} depth - Vibrato depth, in gain.
     * @property {number} delay - Vibrato delay from note on in seconds.
     * @property {number} rate - Vibrato rate in Hz.
     */
    channelVibrato;
    
    /**
     * Key shift for the channel.
     * @type {number}
     */
    channelTransposeKeyShift;
    
    /**
     * The channel's octave tuning in cents.
     * @type {Int8Array}
     */
    channelOctaveTuning;
    
    /**
     * Tuning of individual keys in cents.
     * @type {Int16Array}
     */
    keyCentTuning;
    
    /**
     * Indicates whether the channel is muted.
     * @type {boolean}
     */
    isMuted;
    
    /**
     * Overrides velocity if greater than 0, otherwise disabled.
     * @type {number}
     */
    velocityOverride;
    
    /**
     * Indicates whether the channel is a drum channel.
     * @type {boolean}
     */
    drumChannel;
    
    /**
     * Creates a snapshot of a single channel's state in the synthesizer.
     * @param workletProcessor {SpessaSynthProcessor}
     * @param channelNumber {number}
     * @returns {ChannelSnapshot}
     */
    static getChannelSnapshot(workletProcessor, channelNumber)
    {
        const channel = workletProcessor.workletProcessorChannels[channelNumber];
        const channelSnapshot = new ChannelSnapshot();
        // program data
        channelSnapshot.program = channel.preset.program;
        channelSnapshot.bank = getBankSelect(channel);
        channelSnapshot.lockPreset = channel.lockPreset;
        channelSnapshot.patchName = channel.preset.presetName;
        
        // controller data
        channelSnapshot.midiControllers = channel.midiControllers;
        channelSnapshot.lockedControllers = channel.lockedControllers;
        channelSnapshot.customControllers = channel.customControllers;
        
        // vibrato data
        channelSnapshot.channelVibrato = channel.channelVibrato;
        channelSnapshot.lockVibrato = channel.lockGSNRPNParams;
        
        // tuning and transpose data
        channelSnapshot.channelTransposeKeyShift = channel.channelTransposeKeyShift;
        channelSnapshot.channelOctaveTuning = channel.channelOctaveTuning;
        channelSnapshot.keyCentTuning = channel.keyCentTuning;
        
        // other data
        channelSnapshot.isMuted = channel.isMuted;
        channelSnapshot.velocityOverride = channel.velocityOverride;
        channelSnapshot.drumChannel = channel.drumChannel;
        return channelSnapshot;
    }
    
    /**
     * Applies the snapshot to the specified channel.
     * @param workletProcessor {SpessaSynthProcessor}
     * @param channelNumber {number}
     * @param channelSnapshot {ChannelSnapshot}
     */
    static applyChannelSnapshot(workletProcessor, channelNumber, channelSnapshot)
    {
        const channelObject = workletProcessor.workletProcessorChannels[channelNumber];
        workletProcessor.muteChannel(channelNumber, channelSnapshot.isMuted);
        workletProcessor.setDrums(channelNumber, channelSnapshot.drumChannel);
        
        // restore controllers
        channelObject.midiControllers = channelSnapshot.midiControllers;
        channelObject.lockedControllers = channelSnapshot.lockedControllers;
        channelObject.customControllers = channelSnapshot.customControllers;
        
        // restore vibrato and transpose
        channelObject.channelVibrato = channelSnapshot.channelVibrato;
        channelObject.lockGSNRPNParams = channelSnapshot.lockVibrato;
        channelObject.channelTransposeKeyShift = channelSnapshot.channelTransposeKeyShift;
        channelObject.channelOctaveTuning = channelSnapshot.channelOctaveTuning;
        channelObject.velocityOverride = channelSnapshot.velocityOverride;
        
        // restore preset and lock
        channelObject.lockPreset = false;
        setBankSelect(channelObject, channelSnapshot.bank);
        workletProcessor.programChange(channelNumber, channelSnapshot.program);
        channelObject.lockPreset = channelSnapshot.lockPreset;
    }
}

/**
 * Represents a snapshot of the synthesizer's state.
 */
class SynthesizerSnapshot
{
    /**
     * The individual channel snapshots.
     * @type {ChannelSnapshot[]}
     */
    channelSnapshots;
    
    /**
     * Key modifiers.
     * @type {KeyModifier[][]}
     */
    keyMappings;
    
    /**
     * Main synth volume (set by MIDI), from 0 to 1.
     * @type {number}
     */
    mainVolume;
    
    /**
     * Master stereo panning, from -1 to 1.
     * @type {number}
     */
    pan;
    
    /**
     * The synth's interpolation type.
     * @type {interpolationTypes}
     */
    interpolation;
    
    /**
     * The synth's system. Values can be "gs", "gm", "gm2" or "xg".
     * @type {SynthSystem}
     */
    system;
    
    /**
     * The current synth transposition in semitones. Can be a float.
     * @type {number}
     */
    transposition;
    
    /**
     * The effects configuration object.
     * @type {EffectsConfig}
     */
    effectsConfig;
    
    
    /**
     * Creates a snapshot of the synthesizer's state.
     * @param workletProcessor {SpessaSynthProcessor}
     * @returns {SynthesizerSnapshot}
     */
    static createSynthesizerSnapshot(workletProcessor)
    {
        const snapshot = new SynthesizerSnapshot();
        // channel snapshots
        snapshot.channelSnapshots =
            workletProcessor.workletProcessorChannels.map((_, i) =>
                ChannelSnapshot.getChannelSnapshot(workletProcessor, i));
        
        // key mappings
        snapshot.keyMappings = workletProcessor.keyModifierManager.getMappings();
        // pan and volume
        snapshot.mainVolume = workletProcessor.midiVolume;
        snapshot.pan = workletProcessor.pan;
        
        // others
        snapshot.system = workletProcessor.system;
        snapshot.interpolation = workletProcessor.interpolationType;
        snapshot.transposition = workletProcessor.transposition;
        
        // effects config is stored on the main thread, leave it empty
        snapshot.effectsConfig = {};
        return snapshot;
        
    }
    
    /**
     * Applies the snapshot to the synthesizer.
     * @param workletProcessor {SpessaSynthProcessor}
     * @param snapshot {SynthesizerSnapshot}
     */
    static applySnapshot(workletProcessor, snapshot)
    {
        // restore system
        workletProcessor.system = snapshot.system;
        
        // restore pan and volume
        workletProcessor.setMasterGain(snapshot.mainVolume);
        workletProcessor.setMasterPan(snapshot.pan);
        workletProcessor.transposeAllChannels(snapshot.transposition);
        workletProcessor.interpolationType = snapshot.interpolation;
        workletProcessor.keyModifierManager.setMappings(snapshot.keyMappings);
        
        // add channels if more needed
        while (workletProcessor.workletProcessorChannels.length < snapshot.channelSnapshots.length)
        {
            workletProcessor.createWorkletChannel();
        }
        
        // restore channels
        snapshot.channelSnapshots.forEach((channelSnapshot, index) =>
        {
            ChannelSnapshot.applyChannelSnapshot(workletProcessor, index, channelSnapshot);
        });
        
        SpessaSynthInfo("%cFinished restoring controllers!", consoleColors.info);
    }
}

/**
 * sends a snapshot of the current controller values of the synth (used to copy that data to OfflineAudioContext when rendering)
 * @this {SpessaSynthProcessor}
 */
export function sendSynthesizerSnapshot()
{
    this.post({
        messageType: returnMessageType.synthesizerSnapshot,
        messageData: SynthesizerSnapshot.createSynthesizerSnapshot(this)
    });
}

/**
 * Applies the snapshot to the synth
 * @param snapshot {SynthesizerSnapshot}
 * @this {SpessaSynthProcessor}
 */
export function applySynthesizerSnapshot(snapshot)
{
    SynthesizerSnapshot.applySnapshot(this, snapshot);
    SpessaSynthInfo("%cFinished applying snapshot!", consoleColors.info);
}