import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE, VOICE_CAP } from '../synthetizer.js'
import {
    createWorkletChannel,
} from './worklet_utilities/worklet_processor_channel.js'

import { SoundFont2 } from '../../soundfont/soundfont.js'
import { handleMessage } from './message_protocol/handle_message.js'
import { systemExclusive } from './worklet_methods/system_exclusive.js'
import { noteOn } from './worklet_methods/note_on.js'
import { dataEntryCoarse, dataEntryFine } from './worklet_methods/data_entry.js'
import { killNote, noteOff, stopAll, stopAllChannels } from './worklet_methods/note_off.js'
import {
    controllerChange, muteChannel, setMasterGain, setMasterPan, setMIDIVolume,
} from './worklet_methods/controller_control.js'
import { callEvent, post, sendChannelProperties } from './message_protocol/message_sending.js'
import {
    channelPressure,
    pitchWheel, polyPressure,
    setChannelTuning,
    setMasterTuning, setModulationDepth,
    transposeAllChannels,
    transposeChannel,
} from './worklet_methods/tuning_control.js'
import {
    programChange,
    reloadSoundFont,
    sampleDump,
    sendPresetList,
    setDrums,
    setPreset,
} from './worklet_methods/program_control.js'
import { disableAndLockVibrato, setVibrato } from './worklet_methods/vibrato_control.js'
import { WorkletSequencer } from '../../sequencer/worklet_sequencer/worklet_sequencer.js'
import { SpessaSynthInfo } from '../../utils/loggin.js'
import { applySynthesizerSnapshot, sendSynthesizerSnapshot } from './worklet_methods/snapshot.js'
import { consoleColors } from '../../utils/other.js'
import { PAN_SMOOTHING_FACTOR, releaseVoice, renderVoice, voiceKilling } from './worklet_methods/voice_control.js'
import { returnMessageType } from './message_protocol/worklet_message.js'
import { stbvorbis } from '../../externals/stbvorbis_sync.min.js'
import { VOLUME_ENVELOPE_SMOOTHING_FACTOR } from './worklet_utilities/volume_envelope.js'
import { resetAllControllers, resetControllers, resetParameters } from './worklet_methods/reset_controllers.js'


/**
 * worklet_processor.js
 * purpose: manages the synthesizer (and worklet sequencer) from the AudioWorkletGlobalScope and renders the audio data
 */

export const MIN_NOTE_LENGTH = 0.07; // if the note is released faster than that, it forced to last that long

export const SYNTHESIZER_GAIN = 1.0;

class SpessaSynthProcessor extends AudioWorkletProcessor {
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param options {{
     * processorOptions: {
     *      midiChannels: number,
     *      soundfont: ArrayBuffer,
     *      enableEventSystem: boolean,
     *      startRenderingData: {
     *          parsedMIDI: MIDI,
     *          snapshot: SynthesizerSnapshot
     *      }
     * }}}
     */
    constructor(options) {
        super();

        this._outputsAmount = options.processorOptions.midiChannels;

        this.enableEventSystem = options.processorOptions.enableEventSystem;

        /**
         * @type {function}
         */
        this.processTickCallback = undefined;

        this.sequencer = new WorkletSequencer(this);

        this.transposition = 0;

        /**
         * The volume gain, set by user
         * @type {number}
         */
        this.masterGain = SYNTHESIZER_GAIN;

        this.midiVolume = 1;

        /**
         * Maximum number of voices allowed at once
         * @type {number}
         */
        this.voiceCap = VOICE_CAP;

        /**
         * -1 to 1
         * @type {number}
         */
        this.pan = 0.0;
        /**
         * the pan of the left channel
         * @type {number}
         */
        this.panLeft = 0.5 * this.currentGain;

        this.highPerformanceMode = false;

        /**
         * the pan of the right channel
         * @type {number}
         */
        this.panRight = 0.5 * this.currentGain;
        /**
         * @type {SoundFont2}
         */
        try
        {
            this.soundfont = new SoundFont2(options.processorOptions.soundfont);
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

        this.defaultPreset = this.soundfont.getPreset(0, 0);
        this.drumPreset = this.soundfont.getPreset(128, 0);

        /**
         * @type {Float32Array[]}
         */
        this.workletDumpedSamplesList = [];
        /**
         * contains all the channels with their voices on the processor size
         * @type {WorkletProcessorChannel[]}
         */
        this.workletProcessorChannels = [];
        for (let i = 0; i < this._outputsAmount; i++) {
            this.createWorkletChannel(false);
        }

        this.workletProcessorChannels[DEFAULT_PERCUSSION].preset = this.drumPreset;
        this.workletProcessorChannels[DEFAULT_PERCUSSION].drumChannel = true;

        // in seconds, time between two samples (very, very short)
        this.sampleTime = 1 / sampleRate;

        // these smoothing factors were tested on 44100Hz, adjust them here
        this.volumeEnvelopeSmoothingFactor = VOLUME_ENVELOPE_SMOOTHING_FACTOR * (sampleRate / 44100);
        this.panSmoothingFactor = PAN_SMOOTHING_FACTOR * (sampleRate / 44100);

        /**
         * Controls the system
         * @typedef {"gm"|"gm2"|"gs"|"xg"} SynthSystem
         * @type {SynthSystem}
         */
        this.system = DEFAULT_SYNTH_MODE;

        this.totalVoicesAmount = 0;

        this.port.onmessage = e => this.handleMessage(e.data);

        // if sent, start rendering
        if(options.processorOptions.startRenderingData)
        {
            if (options.processorOptions.startRenderingData.snapshot)
            {
                this.applySynthesizerSnapshot(options.processorOptions.startRenderingData.snapshot);
                this.resetAllControllers();
            }

            SpessaSynthInfo("%cRendering enabled! Starting render.", consoleColors.info)
            if (options.processorOptions.startRenderingData.parsedMIDI) {
                this.sequencer.loadNewSongList([options.processorOptions.startRenderingData.parsedMIDI]);
                this.sequencer.loop = false;
            }
        }

        stbvorbis.isInitialized.then(() => {
            this.post({
                messageType: returnMessageType.ready,
                messageData: undefined
            });
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

    debugMessage()
    {
        SpessaSynthInfo({
            channels: this.workletProcessorChannels,
            voicesAmount: this.totalVoicesAmount,
            outputAmount: this._outputsAmount,
            dumpedSamples: this.workletDumpedSamplesList
        });
    }

    /**
     * Syntesizes the voice to buffers
     * @param inputs {Float32Array[][]} required by WebAudioAPI
     * @param outputs {Float32Array[][]} the outputs to write to, only the first 2 channels are populated
     * @returns {boolean} true
     */
    process(inputs, outputs) {
        if(this.processTickCallback)
        {
            this.processTickCallback();
        }

        // for every channel
        let totalCurrentVoices = 0;
        this.workletProcessorChannels.forEach((channel, index) => {
            if(channel.voices.length < 1 || channel.isMuted)
            {
                // skip the channels
                return;
            }
            const outputIndex = (index % this._outputsAmount) + 2;
            const outputChannels = outputs[outputIndex];
            const reverbChannels = outputs[0];
            const chorusChannels = outputs[1];
            const tempV = channel.voices;

            // reset voices
            channel.voices = [];

            // for every voice
            tempV.forEach(v => {
                // render voice
                this.renderVoice(channel, v, outputChannels, reverbChannels, chorusChannels);
                if(!v.finished)
                {
                    // if not finished, add it back
                    channel.voices.push(v);
                }
            });

            totalCurrentVoices += tempV.length;
        });

        // if voice count changed, update voice amount
        if(totalCurrentVoices !== this.totalVoicesAmount)
        {
            this.totalVoicesAmount = totalCurrentVoices;
            this.sendChannelProperties();
        }
        return true;
    }
}

// include other methods
// voice related
SpessaSynthProcessor.prototype.renderVoice = renderVoice;
SpessaSynthProcessor.prototype.releaseVoice = releaseVoice;
SpessaSynthProcessor.prototype.voiceKilling = voiceKilling;

// message port related
SpessaSynthProcessor.prototype.handleMessage = handleMessage;
SpessaSynthProcessor.prototype.post = post;
SpessaSynthProcessor.prototype.sendChannelProperties = sendChannelProperties;
SpessaSynthProcessor.prototype.callEvent = callEvent;

// system exlcusive related
SpessaSynthProcessor.prototype.systemExclusive = systemExclusive;

// note messages related
SpessaSynthProcessor.prototype.noteOn = noteOn;
SpessaSynthProcessor.prototype.noteOff = noteOff;
SpessaSynthProcessor.prototype.polyPressure = polyPressure;
SpessaSynthProcessor.prototype.killNote = killNote;
SpessaSynthProcessor.prototype.stopAll = stopAll;
SpessaSynthProcessor.prototype.stopAllChannels = stopAllChannels;
SpessaSynthProcessor.prototype.muteChannel = muteChannel;

// custom vibrato related
SpessaSynthProcessor.prototype.setVibrato = setVibrato;
SpessaSynthProcessor.prototype.disableAndLockVibrato = disableAndLockVibrato;

// data entry related
SpessaSynthProcessor.prototype.dataEntryCoarse = dataEntryCoarse;
SpessaSynthProcessor.prototype.dataEntryFine = dataEntryFine;

// channel related
SpessaSynthProcessor.prototype.createWorkletChannel = createWorkletChannel;
SpessaSynthProcessor.prototype.controllerChange = controllerChange;
SpessaSynthProcessor.prototype.channelPressure = channelPressure;
SpessaSynthProcessor.prototype.resetAllControllers = resetAllControllers;
SpessaSynthProcessor.prototype.resetControllers = resetControllers;
SpessaSynthProcessor.prototype.resetParameters = resetParameters;

// master parameter related
SpessaSynthProcessor.prototype.setMasterGain = setMasterGain;
SpessaSynthProcessor.prototype.setMasterPan = setMasterPan;
SpessaSynthProcessor.prototype.setMIDIVolume = setMIDIVolume;

// tuning related
SpessaSynthProcessor.prototype.transposeAllChannels = transposeAllChannels;
SpessaSynthProcessor.prototype.transposeChannel = transposeChannel;
SpessaSynthProcessor.prototype.setChannelTuning = setChannelTuning;
SpessaSynthProcessor.prototype.setMasterTuning = setMasterTuning;
SpessaSynthProcessor.prototype.setModulationDepth = setModulationDepth;
SpessaSynthProcessor.prototype.pitchWheel = pitchWheel;

// program related
SpessaSynthProcessor.prototype.programChange = programChange;
SpessaSynthProcessor.prototype.setPreset = setPreset;
SpessaSynthProcessor.prototype.setDrums = setDrums;
SpessaSynthProcessor.prototype.reloadSoundFont = reloadSoundFont;
SpessaSynthProcessor.prototype.sampleDump = sampleDump;
SpessaSynthProcessor.prototype.sendPresetList = sendPresetList;

// snapshot related
SpessaSynthProcessor.prototype.sendSynthesizerSnapshot = sendSynthesizerSnapshot;
SpessaSynthProcessor.prototype.applySynthesizerSnapshot = applySynthesizerSnapshot;


export { SpessaSynthProcessor }