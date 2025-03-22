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
import { setMasterGain, setMasterPan, setMIDIVolume } from "./worklet_methods/controller_control/master_parameters.js";
import { resetAllControllers } from "./worklet_methods/controller_control/reset_controllers.js";
import { WorkletSoundfontManager } from "./worklet_methods/worklet_soundfont_manager/worklet_soundfont_manager.js";
import { interpolationTypes } from "./worklet_utilities/wavetable_oscillator.js";
import { WorkletKeyModifierManager } from "./worklet_methods/worklet_key_modifier.js";
import { getWorkletVoices } from "./worklet_utilities/worklet_voice.js";
import { PAN_SMOOTHING_FACTOR } from "./worklet_utilities/stereo_panner.js";
import { stopAllChannels } from "./worklet_methods/stopping_notes/stop_all_channels.js";
import { setEmbeddedSoundFont } from "./worklet_methods/soundfont_management/set_embedded_sound_font.js";
import { reloadSoundFont } from "./worklet_methods/soundfont_management/reload_sound_font.js";
import { clearSoundFont } from "./worklet_methods/soundfont_management/clear_sound_font.js";
import { sendPresetList } from "./worklet_methods/soundfont_management/send_preset_list.js";
import { getPreset } from "./worklet_methods/soundfont_management/get_preset.js";
import { transposeAllChannels } from "./worklet_methods/tuning_control/transpose_all_channels.js";
import { setMasterTuning } from "./worklet_methods/tuning_control/set_master_tuning.js";
import { sendSynthesizerSnapshot } from "./snapshot/send_synthesizer_snapshot.js";
import { applySynthesizerSnapshot } from "./snapshot/apply_synthesizer_snapshot.js";
import { createWorkletChannel } from "./worklet_methods/create_worklet_channel.js";
import { FILTER_SMOOTHING_FACTOR } from "./worklet_utilities/lowpass_filter.js";
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE, VOICE_CAP } from "../synth_constants.js";


/**
 * @typedef {"gm"|"gm2"|"gs"|"xg"} SynthSystem
 */

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
     * Cached voices for all presets for this synthesizer.
     * Nesting goes like this:
     * this.cachedVoices[bankNumber][programNumber][midiNote][velocity] = a list of workletvoices for that.
     * @type {WorkletVoice[][][][][]}
     */
    cachedVoices = [];
    
    
    /**
     * If the worklet is alive
     * @type {boolean}
     */
    alive = true;
    
    /**
     * Synth's device id: -1 means all
     * @type {number}
     */
    deviceID = ALL_CHANNELS_OR_DIFFERENT_ACTION;
    
    
    /**
     * Interpolation type used
     * @type {interpolationTypes}
     */
    interpolationType = interpolationTypes.fourthOrder;
    
    /**
     * The sequencer attached to this processor
     * @type {WorkletSequencer}
     */
    sequencer = new WorkletSequencer(this);
    
    /**
     * Global transposition in semitones
     * @type {number}
     */
    transposition = 0;
    
    /**
     * this.tunings[program][key] = tuning
     * @type {MTSProgramTuning[]}
     */
    tunings = [];
    
    
    /**
     * Bank offset for things like embedded RMIDIS. Added for every program change
     * @type {number}
     */
    soundfontBankOffset = 0;
    
    
    /**
     * The volume gain, set by user
     * @type {number}
     */
    masterGain = SYNTHESIZER_GAIN;
    
    /**
     * The volume gain, set by MIDI sysEx
     * @type {number}
     */
    midiVolume = 1;
    
    /**
     * Reverb linear gain
     * @type {number}
     */
    reverbGain = 1;
    /**
     * Chorus linear gain
     * @type {number}
     */
    chorusGain = 1;
    
    /**
     * Maximum number of voices allowed at once
     * @type {number}
     */
    voiceCap = VOICE_CAP;
    
    /**
     * (-1 to 1)
     * @type {number}
     */
    pan = 0.0;
    /**
     * the pan of the left channel
     * @type {number}
     */
    panLeft = 0.5;
    
    /**
     * the pan of the right channel
     * @type {number}
     */
    panRight = 0.5;
    
    /**
     * forces note killing instead of releasing
     * @type {boolean}
     */
    highPerformanceMode = false;
    
    /**
     * Handlese custom key overrides: velocity and preset
     * @type {WorkletKeyModifierManager}
     */
    keyModifierManager = new WorkletKeyModifierManager();
    
    /**
     * Overrides the main soundfont (embedded, for example)
     * @type {BasicSoundBank}
     */
    overrideSoundfont = undefined;
    
    /**
     * contains all the channels with their voices on the processor size
     * @type {WorkletProcessorChannel[]}
     */
    workletProcessorChannels = [];
    
    /**
     * Controls the bank selection & SysEx
     * @type {SynthSystem}
     */
    system = DEFAULT_SYNTH_MODE;
    
    /**
     * Current total voices amount
     * @type {number}
     */
    totalVoicesAmount = 0;
    
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
        
        
        for (let i = 0; i < 127; i++)
        {
            this.tunings.push([]);
        }
        
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
        
        
        for (let i = 0; i < options.processorOptions.midiChannels; i++)
        {
            this.createWorkletChannel(false);
        }
        
        this.workletProcessorChannels[DEFAULT_PERCUSSION].preset = this.drumPreset;
        this.workletProcessorChannels[DEFAULT_PERCUSSION].drumChannel = true;
        
        // these smoothing factors were tested on 44,100 Hz, adjust them to target sample rate here
        this.volumeEnvelopeSmoothingFactor = VOLUME_ENVELOPE_SMOOTHING_FACTOR * (44100 / sampleRate);
        this.panSmoothingFactor = PAN_SMOOTHING_FACTOR * (44100 / sampleRate);
        this.filterSmoothingFactor = FILTER_SMOOTHING_FACTOR * (44100 / sampleRate);
        
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
     * @param bank {number}
     * @param program {number}
     * @param midiNote {number}
     * @param velocity {number}
     * @returns {WorkletVoice[]|undefined}
     */
    getCachedVoice(bank, program, midiNote, velocity)
    {
        return this.cachedVoices?.[bank]?.[program]?.[midiNote]?.[velocity];
    }
    
    /**
     * @param bank {number}
     * @param program {number}
     * @param midiNote {number}
     * @param velocity {number}
     * @param voices {WorkletVoice[]}
     */
    setCachedVoice(bank, program, midiNote, velocity, voices)
    {
        // make sure that it exists
        if (!this.cachedVoices)
        {
            this.cachedVoices = [];
        }
        if (!this.cachedVoices[bank])
        {
            this.cachedVoices[bank] = [];
        }
        if (!this.cachedVoices[bank][program])
        {
            this.cachedVoices[bank][program] = [];
        }
        if (!this.cachedVoices[bank][program][midiNote])
        {
            this.cachedVoices[bank][program][midiNote] = [];
        }
        
        // cache
        this.cachedVoices[bank][program][midiNote][velocity] = voices;
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
            delete c.lockedControllers;
            delete c.preset;
            delete c.customControllers;
        });
        delete this.cachedVoices;
        delete this.workletProcessorChannels;
        delete this.sequencer.midiData;
        delete this.sequencer;
        this.soundfontManager.destroyManager();
        delete this.soundfontManager;
    }
    
    /**
     * @param channel {number}
     * @param controllerNumber {number}
     * @param controllerValue {number}
     * @param force {boolean}
     */
    controllerChange(channel, controllerNumber, controllerValue, force = false)
    {
        this.workletProcessorChannels[channel].controllerChange(controllerNumber, controllerValue, force);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @param velocity {number}
     * @param enableDebug {boolean}
     * @param sendEvent {boolean}
     */
    noteOn(channel, midiNote, velocity, enableDebug = false, sendEvent = true)
    {
        this.workletProcessorChannels[channel].noteOn(midiNote, velocity, enableDebug, sendEvent);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     */
    noteOff(channel, midiNote)
    {
        this.workletProcessorChannels[channel].noteOff(midiNote);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @param pressure {number}
     */
    polyPressure(channel, midiNote, pressure)
    {
        this.workletProcessorChannels[channel].polyPressure(midiNote, pressure);
    }
    
    /**
     * @param channel {number}
     * @param pressure {number}
     */
    channelPressure(channel, pressure)
    {
        this.workletProcessorChannels[channel].channelPressure(pressure);
    }
    
    /**
     * @param channel {number}
     * @param MSB {number}
     * @param LSB {number}
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.workletProcessorChannels[channel].pitchWheel(MSB, LSB);
    }
    
    /**
     * @param channel {number}
     * @param programNumber {number}
     * @param userChange {boolean}
     */
    programChange(channel, programNumber, userChange = false)
    {
        this.workletProcessorChannels[channel].programChange(programNumber, userChange);
    }
}

// include other methods
// voice related
SpessaSynthProcessor.prototype.voiceKilling = voiceKilling;
SpessaSynthProcessor.prototype.getWorkletVoices = getWorkletVoices;

// message port related
SpessaSynthProcessor.prototype.handleMessage = handleMessage;
SpessaSynthProcessor.prototype.sendChannelProperties = sendChannelProperties;
SpessaSynthProcessor.prototype.callEvent = callEvent;

// system-exclusive related
SpessaSynthProcessor.prototype.systemExclusive = systemExclusive;

// channel related
SpessaSynthProcessor.prototype.stopAllChannels = stopAllChannels;
SpessaSynthProcessor.prototype.createWorkletChannel = createWorkletChannel;
SpessaSynthProcessor.prototype.resetAllControllers = resetAllControllers;

// master parameter related
SpessaSynthProcessor.prototype.setMasterGain = setMasterGain;
SpessaSynthProcessor.prototype.setMasterPan = setMasterPan;
SpessaSynthProcessor.prototype.setMIDIVolume = setMIDIVolume;

// tuning related
SpessaSynthProcessor.prototype.transposeAllChannels = transposeAllChannels;
SpessaSynthProcessor.prototype.setMasterTuning = setMasterTuning;

// program related
SpessaSynthProcessor.prototype.getPreset = getPreset;
SpessaSynthProcessor.prototype.reloadSoundFont = reloadSoundFont;
SpessaSynthProcessor.prototype.clearSoundFont = clearSoundFont;
SpessaSynthProcessor.prototype.setEmbeddedSoundFont = setEmbeddedSoundFont;
SpessaSynthProcessor.prototype.sendPresetList = sendPresetList;

// snapshot related
SpessaSynthProcessor.prototype.sendSynthesizerSnapshot = sendSynthesizerSnapshot;
SpessaSynthProcessor.prototype.applySynthesizerSnapshot = applySynthesizerSnapshot;

export { SpessaSynthProcessor };