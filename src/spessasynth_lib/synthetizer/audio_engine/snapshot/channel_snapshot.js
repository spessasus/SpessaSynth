/**
 * Represents a snapshot of a single channel's state in the synthesizer.
 */
export class ChannelSnapshot
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
     * If the bank is LSB. For restoring.
     * @type {boolean}
     */
    isBankLSB;
    
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
     * Indicates the MIDI system when the preset was locked
     * @type {SynthSystem}
     */
    lockedSystem;
    
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
        const channelObject = workletProcessor.midiAudioChannels[channelNumber];
        const channelSnapshot = new ChannelSnapshot();
        // program data
        channelSnapshot.program = channelObject.preset.program;
        channelSnapshot.bank = channelObject.getBankSelect();
        channelSnapshot.isBankLSB = channelSnapshot.bank !== channelObject.bank;
        channelSnapshot.lockPreset = channelObject.lockPreset;
        channelSnapshot.lockedSystem = channelObject.lockedSystem;
        channelSnapshot.patchName = channelObject.preset.presetName;
        
        // controller data
        channelSnapshot.midiControllers = channelObject.midiControllers;
        channelSnapshot.lockedControllers = channelObject.lockedControllers;
        channelSnapshot.customControllers = channelObject.customControllers;
        
        // vibrato data
        channelSnapshot.channelVibrato = channelObject.channelVibrato;
        channelSnapshot.lockVibrato = channelObject.lockGSNRPNParams;
        
        // tuning and transpose data
        channelSnapshot.channelTransposeKeyShift = channelObject.channelTransposeKeyShift;
        channelSnapshot.channelOctaveTuning = channelObject.channelOctaveTuning;
        
        // other data
        channelSnapshot.isMuted = channelObject.isMuted;
        channelSnapshot.velocityOverride = channelObject.velocityOverride;
        channelSnapshot.drumChannel = channelObject.drumChannel;
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
        const channelObject = workletProcessor.midiAudioChannels[channelNumber];
        channelObject.muteChannel(channelSnapshot.isMuted);
        channelObject.setDrums(channelSnapshot.drumChannel);
        
        // restore controllers
        channelObject.midiControllers = channelSnapshot.midiControllers;
        channelObject.lockedControllers = channelSnapshot.lockedControllers;
        channelObject.customControllers = channelSnapshot.customControllers;
        channelObject.updateChannelTuning();
        
        // restore vibrato and transpose
        channelObject.channelVibrato = channelSnapshot.channelVibrato;
        channelObject.lockGSNRPNParams = channelSnapshot.lockVibrato;
        channelObject.channelTransposeKeyShift = channelSnapshot.channelTransposeKeyShift;
        channelObject.channelOctaveTuning = channelSnapshot.channelOctaveTuning;
        channelObject.velocityOverride = channelSnapshot.velocityOverride;
        
        // restore preset and lock
        channelObject.setPresetLock(false);
        channelObject.setBankSelect(channelSnapshot.bank, channelSnapshot.isBankLSB);
        channelObject.programChange(channelSnapshot.program);
        channelObject.setPresetLock(channelSnapshot.lockPreset);
        channelObject.lockedSystem = channelSnapshot.lockedSystem;
    }
}