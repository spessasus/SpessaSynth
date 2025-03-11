import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE, VOICE_CAP } from "../synthetizer.js";
import { WorkletSequencer } from "../../sequencer/worklet_sequencer/worklet_sequencer.js";
import { SpessaSynthInfo } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";
import { voiceKilling } from "./worklet_methods/stopping_notes/voice_killing.js";
import { ALL_CHANNELS_OR_DIFFERENT_ACTION, returnMessageType } from "./message_protocol/worklet_message.js";
import { stbvorbis } from "../../externals/stbvorbis_sync/stbvorbis_sync.min.js";
import { VOLUME_ENVELOPE_SMOOTHING_FACTOR } from "./worklet_utilities/volume_envelope.js";
import { handleMessage } from "./message_protocol/handle_message.js";
import { callEvent, sendChannelProperties } from "./message_protocol/message_sending.js";
import { systemExclusive } from "./worklet_methods/system_exclusive.js";
import { noteOn } from "./worklet_methods/note_on.js";
import { noteOff } from "./worklet_methods/stopping_notes/note_off.js";
import { setOctaveTuning } from "./worklet_methods/tuning_control/set_octave_tuning.js";
import { setMasterGain, setMasterPan, setMIDIVolume } from "./worklet_methods/controller_control/master_parameters.js";
import { setVibrato } from "./worklet_methods/data_entry/set_nrpn_vibrato.js";
import { dataEntryFine } from "./worklet_methods/data_entry/data_entry_fine.js";
import { createWorkletChannel } from "./worklet_utilities/worklet_processor_channel.js";
import { resetAllControllers } from "./worklet_methods/controller_control/reset_controllers.js";
import { setPreset } from "./worklet_methods/soundfont_management/set_preset.js";
import { WorkletSoundfontManager } from "./worklet_methods/worklet_soundfont_manager/worklet_soundfont_manager.js";
import { interpolationTypes } from "./worklet_utilities/wavetable_oscillator.js";
import { WorkletKeyModifierManager } from "./worklet_methods/worklet_key_modifier.js";
import { getWorkletVoices } from "./worklet_utilities/worklet_voice.js";
import { PAN_SMOOTHING_FACTOR } from "./worklet_utilities/stereo_panner.js";
import { releaseVoice } from "./worklet_methods/stopping_notes/release_voice.js";
import { controllerChange } from "./worklet_methods/controller_control/controller_change.js";
import { muteChannel } from "./worklet_methods/mute_channel.js";
import { stopAllOnChannel } from "./worklet_methods/stopping_notes/stop_all_on_channel.js";
import { stopAllChannels } from "./worklet_methods/stopping_notes/stop_all_channels.js";
import { programChange } from "./worklet_methods/program_change.js";
import { setEmbeddedSoundFont } from "./worklet_methods/soundfont_management/set_embedded_sound_font.js";
import { reloadSoundFont } from "./worklet_methods/soundfont_management/reload_sound_font.js";
import { clearSoundFont } from "./worklet_methods/soundfont_management/clear_sound_font.js";
import { sendPresetList } from "./worklet_methods/soundfont_management/send_preset_list.js";
import { setDrums } from "./worklet_methods/controller_control/set_drums.js";
import { getPreset } from "./worklet_methods/soundfont_management/get_preset.js";
import { dataEntryCoarse } from "./worklet_methods/data_entry/data_entry_coarse.js";
import { killNote } from "./worklet_methods/stopping_notes/kill_note.js";
import { transposeAllChannels } from "./worklet_methods/tuning_control/transpose_all_channels.js";
import { transposeChannel } from "./worklet_methods/tuning_control/transpose_channel.js";
import { setChannelTuning } from "./worklet_methods/tuning_control/set_channel_tuning.js";
import { setChannelTuningSemitones } from "./worklet_methods/tuning_control/set_channel_tuning_semitones.js";
import { setMasterTuning } from "./worklet_methods/tuning_control/set_master_tuning.js";
import { setModulationDepth } from "./worklet_methods/tuning_control/set_modulation_depth.js";
import { pitchWheel } from "./worklet_methods/tuning_control/pitch_wheel.js";
import { channelPressure } from "./worklet_methods/tuning_control/channel_pressure.js";
import { polyPressure } from "./worklet_methods/tuning_control/poly_pressure.js";
import { disableAndLockGSNRPN } from "./worklet_methods/data_entry/disable_and_lock_nrpn.js";
import { sendSynthesizerSnapshot } from "./snapshot/send_synthesizer_snapshot.js";
import { applySynthesizerSnapshot } from "./snapshot/apply_synthesizer_snapshot.js";


/**
 * worklet_processor.js
 * purpose: manages the synthesizer (and worklet sequencer) from the AudioWorkletGlobalScope and renders the audio data
 */

// if the note is released faster than that, it forced to last that long
// this is used mostly for drum channels, where a lot of midis like to send instant note off after a note on
export const MIN_NOTE_LENGTH = 0.03;
// this sounds way nicer for an instant hi-hat cutoff
export const MIN_EXCLUSIVE_LENGTH = 0.07;

export const SYNTHESIZER_GAIN = 1.0;


// noinspection JSUnresolvedReference
class SpessaSynthProcessor extends AudioWorkletProcessor
{
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param options {{
     * processorOptions: {
     *      midiChannels: number,
     *      soundfont: ArrayBuffer,
     *      enableEventSystem: boolean,
     *      startRenderingData: StartRenderingDataConfig
     * }}}
     */
    constructor(options)
    {
        super();
        this.oneOutputMode = options.processorOptions?.startRenderingData?.oneOutput === true;
        this._outputsAmount = this.oneOutputMode ? 1 : options.processorOptions.midiChannels;
        
        this.enableEventSystem = options.processorOptions.enableEventSystem;
        
        /**
         * If the worklet is alive
         * @type {boolean}
         */
        this.alive = true;
        
        /**
         * Synth's device id: -1 means all
         * @type {number}
         */
        this.deviceID = ALL_CHANNELS_OR_DIFFERENT_ACTION;
        
        /**
         * Interpolation type used
         * @type {interpolationTypes}
         */
        this.interpolationType = interpolationTypes.fourthOrder;
        
        this.sequencer = new WorkletSequencer(this);
        
        this.transposition = 0;
        
        /**
         * this.tunings[program][key] = tuning
         * @type {MTSProgramTuning[]}
         */
        this.tunings = [];
        for (let i = 0; i < 127; i++)
        {
            this.tunings.push([]);
        }
        
        /**
         * Bank offset for things like embedded RMIDIS. Added for every program change
         * @type {number}
         */
        this.soundfontBankOffset = 0;
        
        /**
         * The volume gain, set by user
         * @type {number}
         */
        this.masterGain = SYNTHESIZER_GAIN;
        
        this.midiVolume = 1;
        
        this.reverbGain = 1;
        this.chorusGain = 1;
        
        /**
         * Maximum number of voices allowed at once
         * @type {number}
         */
        this.voiceCap = VOICE_CAP;
        
        /**
         * (-1 to 1)
         * @type {number}
         */
        this.pan = 0.0;
        /**
         * the pan of the left channel
         * @type {number}
         */
        this.panLeft = 0.5;
        
        this.highPerformanceMode = false;
        
        /**
         * Handlese custom key overrides: velocity and preset
         * @type {WorkletKeyModifierManager}
         */
        this.keyModifierManager = new WorkletKeyModifierManager();
        
        /**
         * Overrides the main soundfont (embedded, for example)
         * @type {BasicSoundFont}
         */
        this.overrideSoundfont = undefined;
        
        /**
         * the pan of the right channel
         * @type {number}
         */
        this.panRight = 0.5;
        try
        {
            /**
             * @type {WorkletSoundfontManager}
             */
            this.soundfontManager = new WorkletSoundfontManager(
                options.processorOptions.soundfont,
                this.postReady.bind(this)
            );
        }
        catch (e)
        {
            this.post({
                messageType: returnMessageType.soundfontError,
                messageData: e
            });
            throw e;
        }
        this.sendPresetList();
        
        this.defaultPreset = this.getPreset(0, 0);
        this.drumPreset = this.getPreset(128, 0);
        
        /**
         * contains all the channels with their voices on the processor size
         * @type {WorkletProcessorChannel[]}
         */
        this.workletProcessorChannels = [];
        for (let i = 0; i < options.processorOptions.midiChannels; i++)
        {
            this.createWorkletChannel(false);
        }
        
        this.workletProcessorChannels[DEFAULT_PERCUSSION].preset = this.drumPreset;
        this.workletProcessorChannels[DEFAULT_PERCUSSION].drumChannel = true;
        
        // these smoothing factors were tested on 44,100 Hz, adjust them to target sample rate here
        this.volumeEnvelopeSmoothingFactor = VOLUME_ENVELOPE_SMOOTHING_FACTOR * (44100 / sampleRate);
        this.panSmoothingFactor = PAN_SMOOTHING_FACTOR * (44100 / sampleRate);
        
        /**
         * Controls the system
         * @typedef {"gm"|"gm2"|"gs"|"xg"} SynthSystem
         */
        /*
         * @type {SynthSystem}
         */
        this.system = DEFAULT_SYNTH_MODE;
        
        this.totalVoicesAmount = 0;
        
        /**
         * The snapshot that synth was restored from
         * @type {SynthesizerSnapshot|undefined}
         * @private
         */
        this._snapshot = options.processorOptions?.startRenderingData?.snapshot;
        
        this.port.onmessage = e => this.handleMessage(e.data);
        
        // if sent, start rendering
        if (options.processorOptions.startRenderingData)
        {
            if (this._snapshot !== undefined)
            {
                this.applySynthesizerSnapshot(this._snapshot);
                this.resetAllControllers();
            }
            
            SpessaSynthInfo("%cRendering enabled! Starting render.", consoleColors.info);
            if (options.processorOptions.startRenderingData.parsedMIDI)
            {
                if (options.processorOptions.startRenderingData?.loopCount !== undefined)
                {
                    this.sequencer.loopCount = options.processorOptions.startRenderingData?.loopCount;
                    this.sequencer.loop = true;
                }
                else
                {
                    this.sequencer.loop = false;
                }
                // set voice cap to unlimited
                this.voiceCap = Infinity;
                this.sequencer.loadNewSongList([options.processorOptions.startRenderingData.parsedMIDI]);
            }
        }
        
        stbvorbis.isInitialized.then(() =>
        {
            this.postReady();
            SpessaSynthInfo("%cSpessaSynth is ready!", consoleColors.recognized);
        });
    }
    
    /**
     * @returns {number}
     */
    get currentGain()
    {
        return this.masterGain * this.midiVolume;
    }
    
    /**
     * @param data {WorkletReturnMessage}
     */
    post(data)
    {
        if (!this.enableEventSystem)
        {
            return;
        }
        this.port.postMessage(data);
    }
    
    postReady()
    {
        if (!this.enableEventSystem)
        {
            return;
        }
        this.port.postMessage({
            messageType: returnMessageType.ready,
            messageData: undefined
        });
    }
    
    debugMessage()
    {
        SpessaSynthInfo({
            channels: this.workletProcessorChannels,
            voicesAmount: this.totalVoicesAmount,
            outputAmount: this._outputsAmount,
            dumpedSamples: this.workletDumpedSamplesList
        });
    }
    
    // noinspection JSUnusedGlobalSymbols
    /**
     * Syntesizes the voice to buffers
     * @param inputs {Float32Array[][]} required by WebAudioAPI
     * @param outputs {Float32Array[][]} the outputs to write to, only the first two channels are populated
     * @returns {boolean} true
     */
    process(inputs, outputs)
    {
        if (!this.alive)
        {
            return false;
        }
        // process the sequencer playback
        this.sequencer.processTick();
        
        // for every channel
        let totalCurrentVoices = 0;
        this.workletProcessorChannels.forEach((channel, index) =>
        {
            if (channel.voices.length < 1 || channel.isMuted)
            {
                // skip the channels
                return;
            }
            let outputIndex;
            let outputL;
            let outputR;
            let reverbL;
            let reverbR;
            let chorusL;
            let chorusR;
            if (this.oneOutputMode)
            {
                // first output only
                const output = outputs[0];
                // reverb and chorus are disabled. 32 output channels: two for each midi channel
                outputIndex = (index % 16) * 2;
                outputL = output[outputIndex];
                outputR = output[outputIndex + 1];
            }
            else
            {
                // 2 first outputs are reverb and chorus, others are for channels
                outputIndex = (index % this._outputsAmount) + 2;
                outputL = outputs[outputIndex][0];
                outputR = outputs[outputIndex][1];
                reverbL = outputs[0][0];
                reverbR = outputs[0][1];
                chorusL = outputs[1][0];
                chorusR = outputs[1][1];
            }
            
            // for every voice, render it
            channel.renderAudio(
                outputL, outputR,
                reverbL, reverbR,
                chorusL, chorusR
            );
            
            totalCurrentVoices += channel.voices.length;
        });
        
        // if voice count changed, update voice amount
        if (totalCurrentVoices !== this.totalVoicesAmount)
        {
            this.totalVoicesAmount = totalCurrentVoices;
            this.sendChannelProperties();
        }
        return true;
    }
    
    destroyWorkletProcessor()
    {
        this.alive = false;
        this.workletProcessorChannels.forEach(c =>
        {
            delete c.midiControllers;
            delete c.voices;
            delete c.sustainedVoices;
            delete c.cachedVoices;
            delete c.lockedControllers;
            delete c.preset;
            delete c.customControllers;
        });
        delete this.workletProcessorChannels;
        delete this.sequencer.midiData;
        delete this.sequencer;
        this.soundfontManager.destroyManager();
        delete this.soundfontManager;
    }
    
    /**
     * @param chan {number}
     */
    resetControllers(chan)
    {
        this.workletProcessorChannels[chan].resetControllers();
    }
    
    /**
     * @param chan
     */
    resetParameters(chan)
    {
        this.workletProcessorChannels[chan].resetParameters();
    }
}

// include other methods
// voice related
SpessaSynthProcessor.prototype.releaseVoice = releaseVoice;
SpessaSynthProcessor.prototype.voiceKilling = voiceKilling;
SpessaSynthProcessor.prototype.getWorkletVoices = getWorkletVoices;

// message port related
SpessaSynthProcessor.prototype.handleMessage = handleMessage;
SpessaSynthProcessor.prototype.sendChannelProperties = sendChannelProperties;
SpessaSynthProcessor.prototype.callEvent = callEvent;

// system-exclusive related
SpessaSynthProcessor.prototype.systemExclusive = systemExclusive;

// note messages related
SpessaSynthProcessor.prototype.noteOn = noteOn;
SpessaSynthProcessor.prototype.noteOff = noteOff;
SpessaSynthProcessor.prototype.polyPressure = polyPressure;
SpessaSynthProcessor.prototype.killNote = killNote;
SpessaSynthProcessor.prototype.stopAllOnChannel = stopAllOnChannel;
SpessaSynthProcessor.prototype.stopAllChannels = stopAllChannels;
SpessaSynthProcessor.prototype.muteChannel = muteChannel;

// custom vibrato related
SpessaSynthProcessor.prototype.setVibrato = setVibrato;
SpessaSynthProcessor.prototype.disableAndLockGSNRPN = disableAndLockGSNRPN;

// data entry related
SpessaSynthProcessor.prototype.dataEntryCoarse = dataEntryCoarse;
SpessaSynthProcessor.prototype.dataEntryFine = dataEntryFine;

// channel related
SpessaSynthProcessor.prototype.createWorkletChannel = createWorkletChannel;
SpessaSynthProcessor.prototype.controllerChange = controllerChange;
SpessaSynthProcessor.prototype.channelPressure = channelPressure;
SpessaSynthProcessor.prototype.resetAllControllers = resetAllControllers;

// master parameter related
SpessaSynthProcessor.prototype.setMasterGain = setMasterGain;
SpessaSynthProcessor.prototype.setMasterPan = setMasterPan;
SpessaSynthProcessor.prototype.setMIDIVolume = setMIDIVolume;

// tuning related
SpessaSynthProcessor.prototype.transposeAllChannels = transposeAllChannels;
SpessaSynthProcessor.prototype.transposeChannel = transposeChannel;
SpessaSynthProcessor.prototype.setChannelTuning = setChannelTuning;
SpessaSynthProcessor.prototype.setChannelTuningSemitones = setChannelTuningSemitones;
SpessaSynthProcessor.prototype.setMasterTuning = setMasterTuning;
SpessaSynthProcessor.prototype.setModulationDepth = setModulationDepth;
SpessaSynthProcessor.prototype.pitchWheel = pitchWheel;
SpessaSynthProcessor.prototype.setOctaveTuning = setOctaveTuning;

// program related
SpessaSynthProcessor.prototype.programChange = programChange;
SpessaSynthProcessor.prototype.getPreset = getPreset;
SpessaSynthProcessor.prototype.setPreset = setPreset;
SpessaSynthProcessor.prototype.setDrums = setDrums;
SpessaSynthProcessor.prototype.reloadSoundFont = reloadSoundFont;
SpessaSynthProcessor.prototype.clearSoundFont = clearSoundFont;
SpessaSynthProcessor.prototype.setEmbeddedSoundFont = setEmbeddedSoundFont;
SpessaSynthProcessor.prototype.sendPresetList = sendPresetList;

// snapshot related
SpessaSynthProcessor.prototype.sendSynthesizerSnapshot = sendSynthesizerSnapshot;
SpessaSynthProcessor.prototype.applySynthesizerSnapshot = applySynthesizerSnapshot;

export { SpessaSynthProcessor };