import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE, VOICE_CAP } from '../synthetizer.js'
import { SoundFont2 } from '../../soundfont/soundfont.js'
import { WorkletSequencer } from '../../sequencer/worklet_sequencer/worklet_sequencer.js'
import { SpessaSynthInfo } from '../../utils/loggin.js'
import { consoleColors } from '../../utils/other.js'
import { PAN_SMOOTHING_FACTOR } from './worklet_methods/voice_control.js'
import { ALL_CHANNELS_OR_DIFFERENT_ACTION, returnMessageType } from './message_protocol/worklet_message.js'
import { stbvorbis } from '../../externals/stbvorbis_sync/stbvorbis_sync.min.js'
import { VOLUME_ENVELOPE_SMOOTHING_FACTOR } from './worklet_utilities/volume_envelope.js'


/**
 * worklet_processor.js
 * purpose: manages the synthesizer (and worklet sequencer) from the AudioWorkletGlobalScope and renders the audio data
 */

export const MIN_NOTE_LENGTH = 0.07; // if the note is released faster than that, it forced to last that long

export const SYNTHESIZER_GAIN = 1.0;

export class SpessaSynthProcessor extends AudioWorkletProcessor
{
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param options {{
     * processorOptions: {
     *      midiChannels: number,
     *      soundfont: ArrayBuffer,
     *      enableEventSystem: boolean,
     *      startRenderingData: {
     *          parsedMIDI: MIDI,
     *          snapshot: SynthesizerSnapshot,
     *          oneOutput: boolean
     *      }
     * }}}
     */
    constructor(options)
    {
        super();
        this.oneOutputMode = options.processorOptions?.startRenderingData?.oneOutput === true;
        this._outputsAmount = this.oneOutputMode ? 1 : options.processorOptions.midiChannels;

        this.enableEventSystem = options.processorOptions.enableEventSystem;

        /**
         * Synth's device id: -1 means all
         * @type {number}
         */
        this.deviceID = ALL_CHANNELS_OR_DIFFERENT_ACTION;

        /**
         * @type {function}
         */
        this.processTickCallback = undefined;

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
         * Overrides the main soundfont (embedded for example
         * @type {SoundFont2}
         */
        this.overrideSoundfont = undefined;

        /**
         * the pan of the right channel
         * @type {number}
         */
        this.panRight = 0.5 * this.currentGain;
        try
        {
            /**
             * @type {SoundFont2}
             */
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

        this.defaultPreset = this.getPreset(0, 0);
        this.drumPreset = this.getPreset(128, 0);

        /**
         * @type {Float32Array[]}
         */
        this.workletDumpedSamplesList = [];
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

        // in seconds, time between two samples (very, very short)
        this.sampleTime = 1 / sampleRate;

        // these smoothing factors were tested on 44100Hz, adjust them here
        this.volumeEnvelopeSmoothingFactor = VOLUME_ENVELOPE_SMOOTHING_FACTOR * (sampleRate / 44100);
        this.panSmoothingFactor = PAN_SMOOTHING_FACTOR * (sampleRate / 44100);

        /**
         * Controls the system
         * @typedef {"gm"|"gm2"|"gs"|"xg"} SynthSystem
         */
        /*
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
            if (options.processorOptions.startRenderingData.parsedMIDI)
            {
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
            let outputIndex;
            let outputLeft;
            let outputRight;
            let reverbChannels;
            let chorusChannels;
            if(this.oneOutputMode)
            {
                // first output only
                const output = outputs[0];
                // reverb and chorus are disabled. 32 output channels: two for each midi channels
                outputIndex = (index % 16) * 2;
                outputLeft = output[outputIndex];
                outputRight = output[outputIndex + 1];
            }
            else
            {
                // 2 first outputs are reverb and chorus, other are for channels
                outputIndex = (index % this._outputsAmount) + 2;
                outputLeft = outputs[outputIndex][0];
                outputRight = outputs[outputIndex][1];
                reverbChannels = outputs[0];
                chorusChannels = outputs[1];
            }

            const tempV = channel.voices;

            // reset voices
            channel.voices = [];

            // for every voice
            tempV.forEach(v => {
                // render voice
                this.renderVoice(
                    channel,
                    v,
                    outputLeft, outputRight,
                    reverbChannels,
                    chorusChannels
                );
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