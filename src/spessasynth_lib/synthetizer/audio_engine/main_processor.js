import { SpessaSynthSequencer } from "../../sequencer/sequencer_engine/sequencer_engine.js";
import { SpessaSynthInfo } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";
import { voiceKilling } from "./engine_methods/stopping_notes/voice_killing.js";
import { ALL_CHANNELS_OR_DIFFERENT_ACTION, returnMessageType } from "./message_protocol/worklet_message.js";
import { stbvorbis } from "../../externals/stbvorbis_sync/stbvorbis_sync.min.js";
import { VOLUME_ENVELOPE_SMOOTHING_FACTOR } from "./engine_components/volume_envelope.js";
import { callEvent } from "./message_protocol/message_sending.js";
import { systemExclusive } from "./engine_methods/system_exclusive.js";
import { masterParameterType, setMasterParameter } from "./engine_methods/controller_control/master_parameters.js";
import { resetAllControllers } from "./engine_methods/controller_control/reset_controllers.js";
import { WorkletSoundfontManager } from "./engine_components/soundfont_manager.js";
import { interpolationTypes } from "./engine_components/wavetable_oscillator.js";
import { KeyModifierManager } from "./engine_components/key_modifier_manager.js";
import { getVoices } from "./engine_components/voice.js";
import { PAN_SMOOTHING_FACTOR } from "./engine_components/stereo_panner.js";
import { stopAllChannels } from "./engine_methods/stopping_notes/stop_all_channels.js";
import { setEmbeddedSoundFont } from "./engine_methods/soundfont_management/set_embedded_sound_font.js";
import { reloadSoundFont } from "./engine_methods/soundfont_management/reload_sound_font.js";
import { clearSoundFont } from "./engine_methods/soundfont_management/clear_sound_font.js";
import { sendPresetList } from "./engine_methods/soundfont_management/send_preset_list.js";
import { getPreset } from "./engine_methods/soundfont_management/get_preset.js";
import { transposeAllChannels } from "./engine_methods/tuning_control/transpose_all_channels.js";
import { setMasterTuning } from "./engine_methods/tuning_control/set_master_tuning.js";
import { applySynthesizerSnapshot } from "./snapshot/apply_synthesizer_snapshot.js";
import { createMidiChannel } from "./engine_methods/create_midi_channel.js";
import { FILTER_SMOOTHING_FACTOR } from "./engine_components/lowpass_filter.js";
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE, VOICE_CAP } from "../synth_constants.js";
import { fillWithDefaults } from "../../utils/fill_with_defaults.js";
import { DEFAULT_SEQUENCER_OPTIONS } from "../../sequencer/worklet_wrapper/default_sequencer_options.js";
import { getEvent, messageTypes } from "../../midi/midi_message.js";
import { IndexedByteArray } from "../../utils/indexed_array.js";


/**
 * @typedef {"gm"|"gm2"|"gs"|"xg"} SynthSystem
 */

/**
 * main_processor.js
 * purpose: the core synthesis engine
 */

// if the note is released faster than that, it forced to last that long
// this is used mostly for drum channels, where a lot of midis like to send instant note off after a note on
export const MIN_NOTE_LENGTH = 0.03;
// this sounds way nicer for an instant hi-hat cutoff
export const MIN_EXCLUSIVE_LENGTH = 0.07;

export const SYNTHESIZER_GAIN = 1.0;


// the core synthesis engine of spessasynth.
class SpessaSynthProcessor
{
    
    /**
     * Cached voices for all presets for this synthesizer.
     * Nesting goes like this:
     * this.cachedVoices[bankNumber][programNumber][midiNote][velocity] = a list of Voices for that.
     * @type {Voice[][][][][]}
     */
    cachedVoices = [];
    
    /**
     * Synth's device id: -1 means all
     * @type {number}
     */
    deviceID = ALL_CHANNELS_OR_DIFFERENT_ACTION;
    
    /**
     * Synth's event queue from the main thread
     * @type {{callback: function(), time: number}[]}
     */
    eventQueue = [];
    
    /**
     * Interpolation type used
     * @type {interpolationTypes}
     */
    interpolationType = interpolationTypes.fourthOrder;
    
    /**
     * The sequencer attached to this processor
     * @type {SpessaSynthSequencer}
     */
    sequencer = new SpessaSynthSequencer(this);
    
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
     * @type {KeyModifierManager}
     */
    keyModifierManager = new KeyModifierManager();
    
    /**
     * Overrides the main soundfont (embedded, for example)
     * @type {BasicSoundBank}
     */
    overrideSoundfont = undefined;
    
    /**
     * contains all the channels with their voices on the processor size
     * @type {MidiAudioChannel[]}
     */
    midiAudioChannels = [];
    
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
     * Synth's default (reset) preset
     * @type {BasicPreset}
     */
    defaultPreset;
    
    defaultPresetUsesOverride = false;
    
    /**
     * Synth's default (reset) drum preset
     * @type {BasicPreset}
     */
    drumPreset;
    
    defaultDrumsUsesOverride = false;
    
    /**
     * Controls if the worklet processor is fully initialized
     * @type {Promise<boolean>}
     */
    processorInitialized = stbvorbis.isInitialized;
    
    /**
     * Current audio time
     * @type {number}
     */
    currentSynthTime = 0;
    
    /**
     * in hertz
     * @type {number}
     */
    sampleRate;
    
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param midiChannels {number}
     * @param soundfont {ArrayBuffer}
     * @param enableEventSystem {boolean}
     * @param startRenderingData {StartRenderingDataConfig}
     * @param postCallback {function(data: WorkletReturnMessage)}
     * @param sampleRate {number}
     * @param initialTime {number}
     * @param effectsEnabled {boolean}
     */
    constructor(midiChannels,
                soundfont,
                sampleRate,
                postCallback,
                effectsEnabled = true,
                enableEventSystem = true,
                startRenderingData = {},
                initialTime = 0)
    {
        /**
         * Midi output count
         * @type {number}
         */
        this.midiOutputsCount = midiChannels;
        /**
         * are the chorus and reverb effects enabled?
         * @type {boolean}
         */
        this.effectsEnabled = effectsEnabled;
        let initialChannelCount = this.midiOutputsCount;
        /**
         * @type {function(WorkletReturnMessage)}
         */
        this.postCallback = postCallback;
        
        this.currentSynthTime = initialTime;
        this.sampleRate = sampleRate;
        
        /**
         * Sample time in seconds
         * @type {number}
         */
        this.sampleTime = 1 / sampleRate;
        
        this.enableEventSystem = enableEventSystem && typeof postCallback === "function";
        
        
        for (let i = 0; i < 128; i++)
        {
            this.tunings.push([]);
        }
        
        try
        {
            /**
             * @type {WorkletSoundfontManager}
             */
            this.soundfontManager = new WorkletSoundfontManager(
                soundfont,
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
        
        this.getDefaultPresets();
        
        
        for (let i = 0; i < initialChannelCount; i++)
        {
            this.createWorkletChannel(false);
        }
        
        this.midiAudioChannels[DEFAULT_PERCUSSION].preset = this.drumPreset;
        this.midiAudioChannels[DEFAULT_PERCUSSION].drumChannel = true;
        
        // these smoothing factors were tested on 44,100 Hz, adjust them to target sample rate here
        this.volumeEnvelopeSmoothingFactor = VOLUME_ENVELOPE_SMOOTHING_FACTOR * (44100 / sampleRate);
        this.panSmoothingFactor = PAN_SMOOTHING_FACTOR * (44100 / sampleRate);
        this.filterSmoothingFactor = FILTER_SMOOTHING_FACTOR * (44100 / sampleRate);
        
        /**
         * The snapshot that synth was restored from
         * @type {SynthesizerSnapshot|undefined}
         * @private
         */
        this._snapshot = startRenderingData?.snapshot;
        
        // if sent, start rendering
        if (startRenderingData)
        {
            if (this._snapshot !== undefined)
            {
                this.applySynthesizerSnapshot(this._snapshot);
                this.resetAllControllers();
            }
            
            SpessaSynthInfo("%cRendering enabled! Starting render.", consoleColors.info);
            if (startRenderingData.parsedMIDI)
            {
                if (startRenderingData?.loopCount !== undefined)
                {
                    this.sequencer.loopCount = startRenderingData?.loopCount;
                    this.sequencer.loop = true;
                }
                else
                {
                    this.sequencer.loop = false;
                }
                // set voice cap to unlimited
                this.voiceCap = Infinity;
                this.processorInitialized.then(() =>
                {
                    /**
                     * set options
                     * @type {SequencerOptions}
                     */
                    const seqOptions = fillWithDefaults(
                        startRenderingData.sequencerOptions,
                        DEFAULT_SEQUENCER_OPTIONS
                    );
                    this.sequencer.skipToFirstNoteOn = seqOptions.skipToFirstNoteOn;
                    this.sequencer.preservePlaybackState = seqOptions.preservePlaybackState;
                    // autoplay is ignored
                    this.sequencer.loadNewSongList([startRenderingData.parsedMIDI]);
                });
            }
        }
        
        this.postReady();
    }
    
    /**
     * @returns {number}
     */
    get currentGain()
    {
        return this.masterGain * this.midiVolume;
    }
    
    getDefaultPresets()
    {
        // override this to XG, to set the default preset to NOT be XG drums!
        const sys = this.system;
        this.system = "xg";
        this.defaultPreset = this.getPreset(0, 0);
        this.defaultPresetUsesOverride = this.overrideSoundfont?.presets?.indexOf(this.defaultPreset) >= 0;
        this.system = sys;
        this.drumPreset = this.getPreset(128, 0);
        this.defaultDrumsUsesOverride = this.overrideSoundfont?.presets?.indexOf(this.drumPreset) >= 0;
    }
    
    /**
     * @param value {SynthSystem}
     */
    setSystem(value)
    {
        this.system = value;
        this.post({
            messageType: returnMessageType.masterParameterChange,
            messageData: [masterParameterType.midiSystem, this.system]
        });
    }
    
    /**
     * @param bank {number}
     * @param program {number}
     * @param midiNote {number}
     * @param velocity {number}
     * @returns {Voice[]|undefined}
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
     * @param voices {Voice[]}
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
     * @param force {boolean}
     */
    post(data, force = false)
    {
        if (!this.enableEventSystem && !force)
        {
            return;
        }
        if (this.postCallback)
        {
            this.postCallback(data);
        }
    }
    
    postReady()
    {
        // ensure stbvorbis is fully initialized
        this.processorInitialized.then(() =>
        {
            // post-ready cannot be constrained by the event system
            this.post({
                messageType: returnMessageType.isFullyInitialized,
                messageData: undefined
            }, true);
            SpessaSynthInfo("%cSpessaSynth is ready!", consoleColors.recognized);
        });
    }
    
    debugMessage()
    {
        SpessaSynthInfo({
            channels: this.midiAudioChannels,
            voicesAmount: this.totalVoicesAmount
        });
    }
    
    // noinspection JSUnusedGlobalSymbols
    /**
     * Renders float32 audio data to stereo outputs; buffer size of 128 is recommended
     * All float arrays must have the same length
     * @param outputs {Float32Array[]} output stereo channels (L, R)
     * @param reverb {Float32Array[]} reverb stereo channels (L, R)
     * @param chorus {Float32Array[]} chorus stereo channels (L, R)
     */
    renderAudio(outputs, reverb, chorus)
    {
        this.renderAudioSplit(reverb, chorus, Array(16).fill(outputs));
    }
    
    /**
     * Renders the float32 audio data of each channel; buffer size of 128 is recommended
     * All float arrays must have the same length
     * @param reverbChannels {Float32Array[]} reverb stereo channels (L, R)
     * @param chorusChannels {Float32Array[]} chorus stereo channels (L, R)
     * @param separateChannels {Float32Array[][]} a total of 16 stereo pairs (L, R) for each MIDI channel
     */
    renderAudioSplit(reverbChannels, chorusChannels, separateChannels)
    {
        // process the sequencer playback
        this.sequencer.processTick();
        
        // process event queue
        const time = this.currentSynthTime;
        while (this.eventQueue[0]?.time <= time)
        {
            this.eventQueue.shift().callback();
        }
        const revL = reverbChannels[0];
        const revR = reverbChannels[1];
        const chrL = chorusChannels[0];
        const chrR = chorusChannels[1];
        
        // for every channel
        this.totalVoicesAmount = 0;
        this.midiAudioChannels.forEach((channel, index) =>
        {
            if (channel.voices.length < 1 || channel.isMuted)
            {
                // there's nothing to do!
                return;
            }
            let voiceCount = channel.voices.length;
            const ch = index % 16;
            
            // render to the appropriate output
            channel.renderAudio(
                separateChannels[ch][0], separateChannels[ch][1],
                revL, revR,
                chrL, chrR
            );
            
            this.totalVoicesAmount += channel.voices.length;
            // if voice count changed, update voice amount
            if (channel.voices.length !== voiceCount)
            {
                channel.sendChannelProperty();
            }
        });
        
        // advance the time appropriately
        this.currentSynthTime += separateChannels[0][0].length * this.sampleTime;
    }
    
    destroySynthProcessor()
    {
        this.midiAudioChannels.forEach(c =>
        {
            delete c.midiControllers;
            delete c.voices;
            delete c.sustainedVoices;
            delete c.lockedControllers;
            delete c.preset;
            delete c.customControllers;
        });
        delete this.cachedVoices;
        delete this.midiAudioChannels;
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
        this.midiAudioChannels[channel].controllerChange(controllerNumber, controllerValue, force);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @param velocity {number}
     */
    noteOn(channel, midiNote, velocity)
    {
        this.midiAudioChannels[channel].noteOn(midiNote, velocity);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     */
    noteOff(channel, midiNote)
    {
        this.midiAudioChannels[channel].noteOff(midiNote);
    }
    
    /**
     * @param channel {number}
     * @param midiNote {number}
     * @param pressure {number}
     */
    polyPressure(channel, midiNote, pressure)
    {
        this.midiAudioChannels[channel].polyPressure(midiNote, pressure);
    }
    
    /**
     * @param channel {number}
     * @param pressure {number}
     */
    channelPressure(channel, pressure)
    {
        this.midiAudioChannels[channel].channelPressure(pressure);
    }
    
    /**
     * @param channel {number}
     * @param MSB {number}
     * @param LSB {number}
     */
    pitchWheel(channel, MSB, LSB)
    {
        this.midiAudioChannels[channel].pitchWheel(MSB, LSB);
    }
    
    /**
     * @param channel {number}
     * @param programNumber {number}
     */
    programChange(channel, programNumber)
    {
        this.midiAudioChannels[channel].programChange(programNumber);
    }
    
    /**
     * @param message {Uint8Array}
     * @param channelOffset {number}
     * @param force {boolean} cool stuff
     * @param options {SynthMethodOptions}
     */
    processMessage(message, channelOffset, force, options)
    {
        const call = () =>
        {
            const statusByteData = getEvent(message[0]);
            
            const channel = statusByteData.channel + channelOffset;
            // process the event
            switch (statusByteData.status)
            {
                case messageTypes.noteOn:
                    const velocity = message[2];
                    if (velocity > 0)
                    {
                        this.noteOn(channel, message[1], velocity);
                    }
                    else
                    {
                        this.noteOff(channel, message[1]);
                    }
                    break;
                
                case messageTypes.noteOff:
                    if (force)
                    {
                        this.midiAudioChannels[channel].killNote(message[1]);
                    }
                    else
                    {
                        this.noteOff(channel, message[1]);
                    }
                    break;
                
                case messageTypes.pitchBend:
                    this.pitchWheel(channel, message[2], message[1]);
                    break;
                
                case messageTypes.controllerChange:
                    this.controllerChange(channel, message[1], message[2], force);
                    break;
                
                case messageTypes.programChange:
                    this.programChange(channel, message[1]);
                    break;
                
                case messageTypes.polyPressure:
                    this.polyPressure(channel, message[0], message[1]);
                    break;
                
                case messageTypes.channelPressure:
                    this.channelPressure(channel, message[1]);
                    break;
                
                case messageTypes.systemExclusive:
                    this.systemExclusive(new IndexedByteArray(message.slice(1)), channelOffset);
                    break;
                
                case messageTypes.reset:
                    this.stopAllChannels(true);
                    this.resetAllControllers();
                    break;
                
                default:
                    break;
            }
        };
        
        const time = options.time;
        if (time > this.currentSynthTime)
        {
            this.eventQueue.push({
                callback: call.bind(this),
                time: time
            });
            this.eventQueue.sort((e1, e2) => e1.time - e2.time);
        }
        else
        {
            call();
        }
    }
    
    /**
     * @param volume {number} 0 to 1
     */
    setMIDIVolume(volume)
    {
        // GM2 specification, section 4.1: volume is squared.
        // though, according to my own testing, Math.E seems like a better choice
        this.midiVolume = Math.pow(volume, Math.E);
        this.setMasterParameter(masterParameterType.masterPan, this.pan);
    }
}

// include other methods
// voice related
SpessaSynthProcessor.prototype.voiceKilling = voiceKilling;
SpessaSynthProcessor.prototype.getVoices = getVoices;

// message port related
SpessaSynthProcessor.prototype.callEvent = callEvent;

// system-exclusive related
SpessaSynthProcessor.prototype.systemExclusive = systemExclusive;

// channel related
SpessaSynthProcessor.prototype.stopAllChannels = stopAllChannels;
SpessaSynthProcessor.prototype.createWorkletChannel = createMidiChannel;
SpessaSynthProcessor.prototype.resetAllControllers = resetAllControllers;

// master parameter related
SpessaSynthProcessor.prototype.setMasterParameter = setMasterParameter;

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
SpessaSynthProcessor.prototype.applySynthesizerSnapshot = applySynthesizerSnapshot;

export { SpessaSynthProcessor };