import { SpessaSynthInfo } from "../../../utils/loggin.js";
import { consoleColors } from "../../../utils/other.js";
import { ChannelSnapshot } from "./channel_snapshot.js";

/**
 * Represents a snapshot of the synthesizer's state.
 */
export class SynthesizerSnapshot
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
     * The effect configuration object.
     * @type {SynthConfig}
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
            workletProcessor.midiAudioChannels.map((_, i) =>
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
        
        // effect config is stored on the main thread, leave it empty
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
        workletProcessor.setSystem(snapshot.system);
        
        // restore pan and volume
        workletProcessor.setMasterGain(snapshot.mainVolume);
        workletProcessor.setMasterPan(snapshot.pan);
        workletProcessor.transposeAllChannels(snapshot.transposition);
        workletProcessor.interpolationType = snapshot.interpolation;
        workletProcessor.keyModifierManager.setMappings(snapshot.keyMappings);
        
        // add channels if more needed
        while (workletProcessor.midiAudioChannels.length < snapshot.channelSnapshots.length)
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

