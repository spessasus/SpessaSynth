import { midiControllers } from '../../midi_parser/midi_message.js';
import { generatorTypes } from '../../soundfont/chunk/generators.js';
import { getOscillatorData } from './worklet_utilities/wavetable_oscillator.js'
import { computeModulators } from './worklet_utilities/worklet_modulator.js'
import {
    absCentsToHz, HALF_PI,
    timecentsToSeconds,
} from './worklet_utilities/unit_converter.js'
import { getLFOValue } from './worklet_utilities/lfo.js';
import { arrayToHexString, consoleColors } from '../../utils/other.js'
import { panVoice } from './worklet_utilities/stereo_panner.js'
import { applyVolumeEnvelope } from './worklet_utilities/volume_envelope.js'
import { applyLowpassFilter } from './worklet_utilities/lowpass_filter.js'
import { getModEnvValue } from './worklet_utilities/modulation_envelope.js'
import { DEFAULT_PERCUSSION, DEFAULT_SYNTH_MODE, VOICE_CAP } from '../synthetizer.js'
import {
    CONTROLLER_TABLE_SIZE,
    CUSTOM_CONTROLLER_TABLE_SIZE,
    customControllers, customResetArray,
    resetArray,
} from './worklet_utilities/worklet_processor_channel.js'
import { returnMessageType, workletMessageType } from './worklet_utilities/worklet_message.js'
import { WORKLET_PROCESSOR_NAME } from '../synthetizer.js'
import { SoundFont2 } from '../../soundfont/soundfont_parser.js'
import { getWorkletVoices } from './worklet_utilities/worklet_voice.js'

/**
 * worklet_processor.js
 * purpose: manages the synthesizer from the AudioWorkletGlobalScope and renders the audio data
 */
const MIN_NOTE_LENGTH = 0.07; // if the note is released faster than that, it forced to last that long

const SYNTHESIZER_GAIN = 1.0;

// noinspection JSUnresolvedReference
class SpessaSynth extends AudioWorkletProcessor {
    /**
     * Creates a new worklet synthesis system. contains all channels
     * @param options {{
     * processorOptions: {
     *      midiChannels: number,
     *      soundfont: ArrayBuffer,
     * }}}
     */
    constructor(options) {
        super();

        this._outputsAmount = options.processorOptions.midiChannels;

        /**
         * The volume gain
         * @type {number}
         */
        this.mainVolume = SYNTHESIZER_GAIN;

        /**
         * -1 to 1
         * @type {number}
         */
        this.pan = 0.0;
        /**
         * the pan of the left channel
         * @type {number}
         */
        this.panLeft = 0.5 * this.mainVolume;

        /**
         * the pan of the right channel
         * @type {number}
         */
        this.panRight = 0.5 * this.mainVolume;
        /**
         * @type {SoundFont2}
         */
        this.soundfont = new SoundFont2(options.processorOptions.soundfont);

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
            this.createWorkletChannel();
        }

        this.workletProcessorChannels[DEFAULT_PERCUSSION].preset = this.drumPreset;
        this.workletProcessorChannels[DEFAULT_PERCUSSION].drumChannel = true;

        // in seconds, time between two samples (very, very short)
        this.sampleTime = 1 / sampleRate;

        /**
         * Controls the system
         * @type {"gm"|"gm2"|"gs"|"xg"}
         */
        this.system = DEFAULT_SYNTH_MODE;

        this.totalVoicesAmount = 0;

        this.port.onmessage = e => this.handleMessage(e.data);
    }

    createWorkletChannel()
    {
        const channel = {
            midiControllers: new Int16Array(CONTROLLER_TABLE_SIZE),
            lockedControllers: Array(CONTROLLER_TABLE_SIZE).fill(false),
            customControllers: new Float32Array(CUSTOM_CONTROLLER_TABLE_SIZE),

            voices: [],
            sustainedVoices: [],
            cachedVoices: [],
            preset: this.defaultPreset,

            channelVibrato: {delay: 0, depth: 0, rate: 0},
            holdPedal: false,
            isMuted: false,
            drumChannel: false,
            program: 0,

        }
        for (let i = 0; i < 128; i++) {
            channel.cachedVoices.push([]);
        }
        this.workletProcessorChannels.push(channel);
        this.resetControllers(this.workletProcessorChannels.length - 1, []);
    }

    debugMessage()
    {
        console.debug({
            channels: this.workletProcessorChannels,
            voicesAmount: this.totalVoicesAmount,
            outputAmount: this._outputsAmount,
            dumpedSamples: this.workletDumpedSamplesList
        });
    }

    /**
     * Append the voices
     * @param channel {number}
     * @param midiNote {number}
     * @param velocity {number}
     */
    noteOn(channel, midiNote, velocity)
    {
        // get voices
        const voices = getWorkletVoices(
            channel,
            midiNote,
            velocity,
            this.workletProcessorChannels[channel].preset,
            currentTime,
            sampleRate,
            data => this.sampleDump(data.channel, data.sampleID, data.sampleData),
            this.workletProcessorChannels[channel].cachedVoices,
            false);
        const channelVoices = this.workletProcessorChannels[channel].voices;
        voices.forEach(voice => {
            const exclusive = voice.generators[generatorTypes.exclusiveClass];
            if(exclusive !== 0)
            {
                channelVoices.forEach(v => {
                    if(v.generators[generatorTypes.exclusiveClass] === exclusive)
                    {
                        this.releaseVoice(v);
                        v.generators[generatorTypes.releaseVolEnv] = -7200; // make the release nearly instant
                        computeModulators(v, this.workletProcessorChannels[channel].midiControllers);
                    }
                })
            }
            computeModulators(voice, this.workletProcessorChannels[channel].midiControllers);
            voice.currentAttenuationDb = 100;
        })
        channelVoices.push(...voices);

        this.totalVoicesAmount += voices.length;
        // cap the voices
        if(this.totalVoicesAmount > VOICE_CAP)
        {
            this.voiceKilling(this.totalVoicesAmount - VOICE_CAP);
        }
        else {
            this.updateVoicesAmount();
        }
        this.callEvent("noteon", {
            midiNote: voices[0].midiNote,
            channel: channel,
            velocity: voices[0].velocity,
        });
    }

    /**
     * Release a note
     * @param channel {number}
     * @param midiNote {number}
     */
    noteOff(channel, midiNote)
    {
        const channelVoices = this.workletProcessorChannels[channel].voices;
        channelVoices.forEach(v => {
            if(v.midiNote !== midiNote || v.isInRelease === true)
            {
                return;
            }
            // if hold pedal, move to sustain
            if(this.workletProcessorChannels[channel].holdPedal) {
                this.workletProcessorChannels[channel].sustainedVoices.push(v);
            }
            else
            {
                this.releaseVoice(v);
            }
        });
        this.callEvent("noteoff", {
            midiNote: midiNote,
            channel: channel
        });
    }

    /**
     * Stops a note nearly instantly
     * @param channel {number}
     * @param midiNote {number}
     */
    killNote(channel, midiNote)
    {
        this.workletProcessorChannels[channel].voices.forEach(v => {
            if(v.midiNote !== midiNote)
            {
                return;
            }
            v.modulatedGenerators[generatorTypes.releaseVolEnv] = -12000; // set release to be very short
            this.releaseVoice(v);
        });
    }

    /**
     * saves a sample
     * @param channel {number}
     * @param sampleID {number}
     * @param sampleData {Float32Array}
     */
    sampleDump(channel, sampleID, sampleData)
    {
        this.workletDumpedSamplesList[sampleID] = sampleData;
        // the sample maybe was loaded after the voice was sent... adjust the end position!

        // not for all channels because the system tells us for what channel this voice was dumped! yay!
        this.workletProcessorChannels[channel].voices.forEach(v => {
            if(v.sample.sampleID !== sampleID)
            {
                return;
            }
            v.sample.end = sampleData.length - 1 + v.generators[generatorTypes.endAddrOffset] + (v.generators[generatorTypes.endAddrsCoarseOffset] * 32768);
            // calculate for how long the sample has been playing and move the cursor there
            v.sample.cursor = (v.sample.playbackStep * sampleRate) * (currentTime - v.startTime);
            if(v.sample.loopingMode === 0) // no loop
            {
                if (v.sample.cursor >= v.sample.end)
                {
                    v.finished = true;
                    return;
                }
            }
            else
            {
                // go through modulo (adjust cursor if the sample has looped
                if(v.sample.cursor > v.sample.loopEnd)
                {
                    v.sample.cursor = v.sample.cursor % (v.sample.loopEnd - v.sample.loopStart) + v.sample.loopStart - 1;
                }
            }
            // set start time to current!
            v.startTime = currentTime;
        })

    }

    /**
     * stops all notes
     * @param channel {number}
     * @param force {boolean}
     */
    stopAll(channel, force = false)
    {
        const channelVoices = this.workletProcessorChannels[channel].voices;
        if(force)
        {
            // force stop all
            channelVoices.length = 0;
            this.workletProcessorChannels[channel].sustainedVoices.length = 0;
            this.updateVoicesAmount();
        }
        else
        {
            channelVoices.forEach(v => {
                if(v.isInRelease) return;
                this.releaseVoice(v);
            });
            this.workletProcessorChannels[channel].sustainedVoices.forEach(v => {
                this.releaseVoice(v);
            })
        }
    }

    /**
     * executes a program change
     * @param channel {number}
     * @param programNumber {number}
     * @param userChange {boolean}
     */
    programChange(channel, programNumber, userChange=false)
    {
        /**
         * @type {WorkletProcessorChannel}
         */
        const channelObject = this.workletProcessorChannels[channel];
        // always 128 for percussion
        const bank = (channelObject.drumChannel ? 128 : channelObject.midiControllers[midiControllers.bankSelect]);
        console.log(bank, channelObject)
        const preset = this.soundfont.getPreset(bank, programNumber);
        this.setPreset(channel, preset);
        this.callEvent("programchange",{
            channel: channel,
            preset: preset,
            userCalled: userChange
        });
    }

    /**
     * @param channel {number}
     * @param preset {Preset}
     */
    setPreset(channel, preset)
    {
        this.workletProcessorChannels[channel].preset = preset;
    }

    /**
     * Transposes the channel by given amount of semitones
     * @param channel {number}
     * @param semitones {number} Can be float
     * @param force {boolean} defaults to false, if true transposes the channel even if it's a drum channel
     */
    transposeChannel(channel, semitones, force=false)
    {
        const channelObject = this.workletProcessorChannels[channel];
        if(channelObject.drumChannel && !force)
        {
            return;
        }
        channelObject.customControllers[customControllers.channelTranspose] = semitones * 100;
    }

    /**
     * Sets the channel's tuning
     * @param channel {number}
     * @param cents {number}
     */
    setChannelTuning(channel, cents)
    {
        const channelObject = this.workletProcessorChannels[channel];
        cents = Math.round(cents);
        channelObject.customControllers[customControllers.channelTuning] = cents;
        console.info(`%cChannel ${channel} tuning. Cents: %c${cents}`,
            consoleColors.info,
            consoleColors.value);
    }

    /**
     * Executes a system exclusive
     * @param messageData {number[]} - the message data without f0
     */
    systemExclusive(messageData)
    {
        const type = messageData[0];
        switch (type)
        {
            default:
                console.info(`%cUnrecognized SysEx: %c${arrayToHexString(messageData)}`,
                    consoleColors.warn,
                    consoleColors.unrecognized);
                break;

            // non realtime
            case 0x7E:
                // gm system
                if(messageData[2] === 0x09)
                {
                    if(messageData[3] === 0x01)
                    {
                        console.info("%cGM system on", consoleColors.info);
                        this.system = "gm";
                    }
                    else if(messageData[3] === 0x03)
                    {
                        console.info("%cGM2 system on", consoleColors.info);
                        this.system = "gm2";
                    }
                    else
                    {
                        console.info("%cGM system off, defaulting to GS", consoleColors.info);
                        this.system = "gs";
                    }
                }
                break;

            // realtime
            case 0x7F:
                if(messageData[2] === 0x04 && messageData[3] === 0x01)
                {
                    // main volume
                    const vol = messageData[5] << 7 | messageData[4];
                    this.setMainVolume(vol / 16384);
                    console.info(`%cMaster Volume. Volume: %c${vol}`,
                        consoleColors.info,
                        consoleColors.value);
                }
                else
                if(messageData[2] === 0x04 && messageData[3] === 0x03)
                {
                    // fine tuning
                    const tuningValue = ((messageData[5] << 7) | messageData[6]) - 8192;
                    const cents = Math.floor(tuningValue / 81.92); // [-100;+99] cents range
                    this.setMasterTuning(cents);
                    console.info(`%cMaster Fine Tuning. Cents: %c${cents}`,
                        consoleColors.info,
                        consoleColors.value)
                }
                else
                if(messageData[2] === 0x04 && messageData[3] === 0x04)
                {
                    // coarse tuning
                    // lsb is ignored
                    const semitones = messageData[5] - 64;
                    const cents = semitones * 100;
                    this.setMasterTuning(cents);
                    console.info(`%cMaster Coarse Tuning. Cents: %c${cents}`,
                        consoleColors.info,
                        consoleColors.value)
                }
                else
                {
                    console.info(
                        `%cUnrecognized MIDI Real-time message: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized)
                }
                break;

            // this is a roland sysex
            // http://www.bandtrax.com.au/sysex.htm
            // https://cdn.roland.com/assets/media/pdf/AT-20R_30R_MI.pdf
            case 0x41:
                // messagedata[1] is device id (ignore as we're everything >:) )
                if(messageData[2] === 0x42 && messageData[3] === 0x12)
                {
                    // this is a GS sysex
                    // messageData[5] and [6] is the system parameter, messageData[7] is the value
                    const messageValue = messageData[7];
                    if(messageData[6] === 0x7F)
                    {
                        // GS mode set
                        if(messageValue === 0x00) {
                            // this is a GS reset
                            console.info("%cGS system on", consoleColors.info);
                            this.system = "gs";
                        }
                        else if(messageValue === 0x7F)
                        {
                            // GS mode off
                            console.info("%cGS system off, switching to GM2", consoleColors.info);
                            this.system = "gm2";
                        }
                        return;
                    }
                    else
                    if(messageData[4] === 0x40)
                    {
                        // this is a system parameter
                        if((messageData[5] & 0x10) > 0)
                        {
                            // this is an individual part (channel) parameter
                            // determine the channel 0 means channel 10 (default), 1 means 1 etc.
                            const channel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][messageData[5] & 0x0F]; // for example 1A means A = 11, which corresponds to channel 12 (counting from 1)
                            switch (messageData[6])
                            {
                                default:
                                    break;

                                case 0x15:
                                    // this is the Use for Drum Part sysex (multiple drums)
                                    this.setDrums(channel, messageValue > 0 && messageData[5] >> 4); // if set to other than 0, is a drum channel
                                    console.info(
                                        `%cChannel %c${channel}%c ${messageValue > 0 && messageData[5] >> 4 ?
                                            "is now a drum channel"
                                            :
                                            "now isn't a drum channel"
                                        }%c via: %c${arrayToHexString(messageData)}`,
                                        consoleColors.info,
                                        consoleColors.value,
                                        consoleColors.recognized,
                                        consoleColors.info,
                                        consoleColors.value);
                                    return;

                                case 0x16:
                                    // this is the pitch key shift sysex
                                    const keyShift = messageValue - 64;
                                    this.transposeChannel(channel, keyShift);
                                    console.info(`%cChannel %c${channel}%c pitch shift. Semitones %c${keyShift}%c, with %c${arrayToHexString(messageData)}`,
                                        consoleColors.info,
                                        consoleColors.recognized,
                                        consoleColors.info,
                                        consoleColors.value,
                                        consoleColors.info,
                                        consoleColors.value);
                                    return;

                                case 0x40:
                                case 0x41:
                                case 0x42:
                                case 0x43:
                                case 0x44:
                                case 0x45:
                                case 0x46:
                                case 0x47:
                                case 0x48:
                                case 0x49:
                                case 0x4A:
                                case 0x4B:
                                    // scale tuning
                                    const cents = messageValue - 64;
                                    console.info(`%cChannel %c${channel}%c tuning. Cents %c${cents}%c, with %c${arrayToHexString(messageData)}`,
                                        consoleColors.info,
                                        consoleColors.recognized,
                                        consoleColors.info,
                                        consoleColors.value,
                                        consoleColors.info,
                                        consoleColors.value);
                                    this.setChannelTuning(channel, cents);
                            }
                        }
                        else
                            // this is a global system parameter
                        if(messageData[5] === 0x00 && messageData[6] === 0x06)
                        {
                            // roland master pan
                            console.info(`%cRoland GS Master Pan set to: %c${messageValue}%c with: %c${arrayToHexString(messageData)}`,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info,
                                consoleColors.value);
                            this.setMasterPan((messageValue - 64) / 64);
                            return;
                        }
                        else
                        if(messageData[5] === 0x00 && messageData[6] === 0x05)
                        {
                            // roland master key shift (transpose)
                            const transpose = messageValue - 64;
                            console.info(`%cRoland GS Master Key-Shift set to: %c${transpose}%c with: %c${arrayToHexString(messageData)}`,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info,
                                consoleColors.value);
                            this.setMasterTuning(transpose * 100);
                            return;
                        }
                        else
                        if(messageData[5] === 0x00 && messageData[6] === 0x04)
                        {
                            // roland GS master volume
                            console.info(`%cRoland GS Master Volume set to: %c${messageValue}%c with: %c${arrayToHexString(messageData)}`,
                                consoleColors.info,
                                consoleColors.value,
                                consoleColors.info,
                                consoleColors.value);
                            this.setMainVolume(messageValue / 127);
                            return;
                        }
                    }
                    // this is some other GS sysex...
                    console.info(`%cUnrecognized Roland %cGS %cSysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.recognized,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                    return;
                }
                else
                if(messageData[2] === 0x16 && messageData[3] === 0x12 && messageData[4] === 0x10)
                {
                    // this is a roland master volume message
                    this.setMainVolume(messageData[7] / 100);
                    console.info(`%cRoland Master Volume control set to: %c${messageData[7]}%c via: %c${arrayToHexString(messageData)}`,
                        consoleColors.info,
                        consoleColors.value,
                        consoleColors.info,
                        consoleColors.value);
                    return;
                }
                else
                {
                    // this is something else...
                    console.info(`%cUnrecognized Roland SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                    return;
                }

            // yamaha
            case 0x43:
                // XG on
                if(messageData[2] === 0x4C && messageData[5] === 0x7E && messageData[6] === 0x00)
                {
                    console.info("%cXG system on", consoleColors.info);
                    this.system = "xg";
                }
                else
                {
                    console.info(`%cUnrecognized Yamaha SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                }
                break;


        }
    }


    /**
     * Toggles drums on a given channel
     * @param channel {number}
     * @param isDrum {boolean}
     */
    setDrums(channel, isDrum)
    {
        const channelObject = this.workletProcessorChannels[channel];
        if(isDrum)
        {
            channelObject.drumChannel = true;
            this.setPreset(channel, this.soundFont.getPreset(128, channelObject.preset.program));
        }
        else
        {
            channelObject.percussionChannel = false;
            this.setPreset(channel, this.soundFont.getPreset(0, channelObject.preset.program));
        }
        this.callEvent("drumchange",{
            channel: channel,
            isDrumChannel: channelObject.drumChannel
        });
    }

    /**
     * Sets the worklet's master tuning
     * @param cents {number}
     */
    setMasterTuning(cents)
    {
        cents = Math.round(cents);
        for (let i = 0; i < this.channelsAmount; i++) {
            this.workletProcessorChannels[i].customControllers[customControllers.masterTuning] = cents;
        }
    }

    /**
     * @param message {WorkletMessage}
     */
    handleMessage(message)
    {
        const data = message.messageData;
        const channel = message.channelNumber;
        switch (message.messageType) {
            case workletMessageType.noteOn:
                this.noteOn(channel, data[0], data[1]);
                break;

            case workletMessageType.noteOff:
                this.noteOff(channel, data);
                break;

            case workletMessageType.ccChange:
                this.controllerChange(channel, data[0], data[1]);
                break;

            case workletMessageType.customcCcChange:
                // custom controller change
                this.workletProcessorChannels[channel].customControllers[data[0]] = data[1];
                break;

            case workletMessageType.killNote:
                this.killNote(channel, data);
                break;

            case workletMessageType.programChange:
                this.programChange(channel, data[0], data[1]);
                break;

            case workletMessageType.ccReset:
                this.resetControllers(channel, data);
                break;

            case workletMessageType.systemExclusive:
                this.systemExclusive(data);
                break;

            case workletMessageType.setChannelVibrato:
                this.workletProcessorChannels[channel].channelVibrato.delay = data.delay;
                this.workletProcessorChannels[channel].channelVibrato.depth = data.depth;
                this.workletProcessorChannels[channel].channelVibrato.rate = data.rate;
                break;

            case workletMessageType.clearCache:
                if(this.workletDumpedSamplesList.length > 0) {
                    this.workletDumpedSamplesList = [];
                }
                break;

            case workletMessageType.stopAll:
                this.stopAll(channel, data === 1);
                break;

            case workletMessageType.killNotes:
                this.voiceKilling(data);
                break;

            case workletMessageType.muteChannel:
                this.workletProcessorChannels[channel].isMuted = data;
                break;

            case workletMessageType.addNewChannel:
                this.createWorkletChannel();
                break;

            case workletMessageType.debugMessage:
                this.debugMessage();
                break;

            case workletMessageType.setMainVolume:
                this.setMainVolume(data);
                break;

            case workletMessageType.setMasterPan:
                this.setMasterPan(data);
                break;

            case workletMessageType.setDrums:
                this.setDrums(channel, data);
                break;

            case workletMessageType.getPresetList:
                this.post({
                    messageType: returnMessageType.presetList,
                    messageData: this.soundfont.presets.map(p => {
                        return {presetName: p.presetName, bank: p.bank, program: p.program};
                    })
                });
                break;

            default:
                break;
        }
    }


    /**
     * @param volume {number} 0-1
     */
    setMainVolume(volume)
    {
        this.mainVolume = volume * SYNTHESIZER_GAIN;
        this.setMasterPan(this.pan);
    }

    /**
     * @param pan {number} -1 to 1
     */
    setMasterPan(pan)
    {
        this.pan = pan;
        // clamp to 0-1 (0 is left)
        pan = (pan / 2) + 0.5;
        this.panLeft = (1 - pan) * this.mainVolume;
        this.panRight = (pan) * this.mainVolume;
    }

    /**
     * @param channel {number}
     * @param controllerNumber {number}
     * @param controllerValue {number}
     */
    controllerChange(channel, controllerNumber, controllerValue)
    {
        console.log(controllerNumber, controllerValue);
        let hasChanged = true;
        /**
         * @type {WorkletProcessorChannel}
         */
        const channelObject = this.workletProcessorChannels[channel];
        switch (controllerNumber) {
            case midiControllers.allNotesOff:
                this.stopAll(channel);
                break;

            case midiControllers.allSoundOff:
                this.stopAll(channel, true);
                break;

            case midiControllers.bankSelect:
                let bankNr = controllerValue;
                switch (this.system)
                {
                    case "gm":
                        // gm ignores bank select
                        console.info(`%cIgnoring the Bank Select (${controllerValue}), as the synth is in GM mode.`, consoleColors.info);
                        return;

                    case "xg":
                        // for xg, if msb is 127, then it's drums
                        if (bankNr === 127)
                        {
                            channelObject.drumChannel = true;
                            this.callEvent("drumchange", {
                                channel: channel,
                                isDrumChannel: true
                            });
                        }
                        break;

                    case "gm2":
                        if(bankNr === 120)
                        {
                            channelObject.drumChannel = true;
                            this.callEvent("drumchange", {
                                channel: channel,
                                isDrumChannel: true
                            });
                        }
                }

                if(channelObject.drumChannel)
                {
                    // 128 for percussion channel
                    bankNr = 128;
                }
                if(bankNr === 128 && !channelObject.drumChannel)
                {
                    // if channel is not for percussion, default to bank current
                    bankNr = channelObject.midiControllers[midiControllers.bankSelect];
                }

                channelObject.midiControllers[midiControllers.bankSelect] = bankNr;
                break;

            case midiControllers.lsbForControl0BankSelect:
                if(this.system === 'xg')
                {
                    if(channelObject.midiControllers[midiControllers.bankSelect] === 0)
                    {
                        channelObject.midiControllers[midiControllers.bankSelect] = controllerValue;
                    }
                }
                else
                if(this.system === "gm2")
                {
                    channelObject.midiControllers[midiControllers.bankSelect] = controllerValue;
                }
                break;


            default:
                // special case: hold pedal
                if(controllerNumber === midiControllers.sustainPedal) {
                    if (controllerValue >= 64)
                    {
                        channelObject.holdPedal = true;
                    }
                    else
                    {
                        channelObject.holdPedal = false;
                        channelObject.sustainedVoices.forEach(v => {
                            this.releaseVoice(v)
                        });
                        channelObject.sustainedVoices = [];
                    }
                }
                channelObject.midiControllers[controllerNumber] = controllerValue;
                channelObject.voices.forEach(v => computeModulators(v, channelObject.midiControllers));
                break;
        }
        if(hasChanged) {
            this.callEvent("controllerchange", {
                channel: channel,
                controllerNumber: controllerNumber,
                controllerValue: controllerValue >> 7 // turn internal 14 bit value into a 7 bit one
            });
        }
        console.log(controllerNumber, channelObject.midiControllers[controllerNumber]);
    }

    voiceKilling(amount)
    {
        // kill the smallest velocity voices
        let voicesOrderedByVelocity = this.workletProcessorChannels.map(channel => channel.voices);

        /**
         * @type {WorkletVoice[]}
         */
        voicesOrderedByVelocity = voicesOrderedByVelocity.flat();
        voicesOrderedByVelocity.sort((v1, v2) => v1.velocity - v2.velocity);
        if(voicesOrderedByVelocity.length < amount)
        {
            amount = voicesOrderedByVelocity.length;
        }
        for (let i = 0; i < amount; i++) {
            const voice = voicesOrderedByVelocity[i];
            this.workletProcessorChannels[voice.channelNumber].voices
                .splice(this.workletProcessorChannels[voice.channelNumber].voices.indexOf(voice), 1);
            this.totalVoicesAmount--;
        }
        this.updateVoicesAmount();
    }

    /**
     * Calls synth event from the worklet side
     * @param eventName {EventTypes} the event name
     * @param eventData {any}
     */
    callEvent(eventName, eventData)
    {
        this.post({
            messageType: returnMessageType.eventCall,
            messageData: {
                eventName: eventName,
                eventData: eventData
            }
        })
    }

    /**
     *
     * @param data {WorkletReturnMessage}
     */
    post(data)
    {
        this.port.postMessage(data);
    }

    updateVoicesAmount()
    {
        this.post({
            messageType: returnMessageType.reportedVoicesAmount,
            messageData: this.workletProcessorChannels.map(c => c.voices.length)
        });
    }

    /**
     * Stops the voice
     * @param voice {WorkletVoice} the voice to stop
     */
    releaseVoice(voice)
    {
        voice.releaseStartTime = currentTime;
        // check if the note is shorter than the min note time, if so, extend it
        if(voice.releaseStartTime - voice.startTime < MIN_NOTE_LENGTH)
        {
            voice.releaseStartTime = voice.startTime + MIN_NOTE_LENGTH;
        }
    }

    /**
     * Syntesizes the voice to buffers
     * @param inputs {Float32Array[][]} required by WebAudioAPI
     * @param outputs {Float32Array[][]} the outputs to write to, only the first 2 channels are populated
     * @returns {boolean} true
     */
    process(inputs, outputs) {
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

                // if not finished, add it back
                if(!v.finished)
                {
                    channel.voices.push(v);
                }
            });

            totalCurrentVoices += tempV.length;
        });

        // if voice count changed, update voice amount
        if(totalCurrentVoices !== this.totalVoicesAmount)
        {
            this.totalVoicesAmount = totalCurrentVoices;
            this.updateVoicesAmount();
        }

        return true;
    }

    /**
     * Renders a voice to the stereo output buffer
     * @param channel {WorkletProcessorChannel} the voice's channel
     * @param voice {WorkletVoice} the voice to render
     * @param output {Float32Array[]} the output buffer
     * @param reverbOutput {Float32Array[]} output for reverb
     * @param chorusOutput {Float32Array[]} output for chorus
     */
    renderVoice(channel, voice, output, reverbOutput, chorusOutput)
    {
        // if no matching sample, perhaps it's still being loaded..?
        if(this.workletDumpedSamplesList[voice.sample.sampleID] === undefined)
        {
            return;
        }

        // check if release
        if(!voice.isInRelease) {
            // if not in release, check if the release time is
            if (currentTime >= voice.releaseStartTime) {
                voice.releaseStartModEnv = voice.currentModEnvValue;
                voice.isInRelease = true;
            }
        }


        // if the initial attenuation is more than 100dB, skip the voice (it's silent anyways)
        if(voice.modulatedGenerators[generatorTypes.initialAttenuation] > 2500)
        {
            if(voice.isInRelease)
            {
                voice.finished = true;
            }
            return;
        }

        // TUNING

        // calculate tuning
        let cents = voice.modulatedGenerators[generatorTypes.fineTune]
            + channel.customControllers[customControllers.channelTuning]
            + channel.customControllers[customControllers.channelTranspose]
            + channel.customControllers[customControllers.masterTuning];
        let semitones = voice.modulatedGenerators[generatorTypes.coarseTune];

        // calculate tuning by key
        cents += (voice.targetKey - voice.sample.rootKey) * voice.modulatedGenerators[generatorTypes.scaleTuning];

        // vibrato LFO
        const vibratoDepth = voice.modulatedGenerators[generatorTypes.vibLfoToPitch];
        if(vibratoDepth > 0)
        {
            const vibStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayVibLFO]);
            const vibFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqVibLFO]);
            const lfoVal = getLFOValue(vibStart, vibFreqHz, currentTime);
            if(lfoVal)
            {
                cents += lfoVal * (vibratoDepth * channel.customControllers[customControllers.modulationMultiplier]);
            }
        }

        // lowpass frequency
        let lowpassCents = voice.modulatedGenerators[generatorTypes.initialFilterFc];

        // mod LFO
        const modPitchDepth = voice.modulatedGenerators[generatorTypes.modLfoToPitch];
        const modVolDepth = voice.modulatedGenerators[generatorTypes.modLfoToVolume];
        const modFilterDepth = voice.modulatedGenerators[generatorTypes.modLfoToFilterFc];
        let modLfoCentibels = 0;
        if(modPitchDepth + modFilterDepth + modVolDepth > 0)
        {
            const modStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayModLFO]);
            const modFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqModLFO]);
            const modLfoValue = getLFOValue(modStart, modFreqHz, currentTime);
            cents += modLfoValue * (modPitchDepth * channel.customControllers[customControllers.modulationMultiplier]);
            modLfoCentibels = modLfoValue * modVolDepth;
            lowpassCents += modLfoValue * modFilterDepth;
        }

        // channel vibrato (GS NRPN)
        if(channel.channelVibrato.depth > 0)
        {
            const channelVibrato = getLFOValue(voice.startTime + channel.channelVibrato.delay, channel.channelVibrato.rate, currentTime);
            if(channelVibrato)
            {
                cents += channelVibrato * channel.channelVibrato.depth;
            }
        }

        // mod env
        const modEnvPitchDepth = voice.modulatedGenerators[generatorTypes.modEnvToPitch];
        const modEnvFilterDepth = voice.modulatedGenerators[generatorTypes.modEnvToFilterFc];
        const modEnv = getModEnvValue(voice, currentTime);
        lowpassCents += modEnv * modEnvFilterDepth;
        cents += modEnv * modEnvPitchDepth;

        // finally calculate the playback rate
        const centsTotal = ~~(cents + semitones * 100);
        if(centsTotal !== voice.currentTuningCents)
        {
            voice.currentTuningCents = centsTotal;
            voice.currentTuningCalculated = Math.pow(2, centsTotal / 1200);
        }

        // PANNING
        const pan = ( (Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan] )) + 500) / 1000) ; // 0 to 1

        // SYNTHESIS
        const bufferOut = new Float32Array(output[0].length);

        // wavetable oscillator
        getOscillatorData(voice, this.workletDumpedSamplesList[voice.sample.sampleID], bufferOut);


        // lowpass filter
        applyLowpassFilter(voice, bufferOut, lowpassCents);

        // volenv
        applyVolumeEnvelope(voice, bufferOut, currentTime, modLfoCentibels, this.sampleTime);

        // pan the voice and write out
        const panLeft = Math.cos(HALF_PI * pan) * this.panLeft;
        const panRight = Math.sin(HALF_PI * pan) *  this.panRight;
        panVoice(
            panLeft,
            panRight,
            bufferOut,
            output,
            reverbOutput, voice.modulatedGenerators[generatorTypes.reverbEffectsSend],
            chorusOutput, voice.modulatedGenerators[generatorTypes.chorusEffectsSend]);
    }

    /**
     * Resets all controllers
     * @param channel {number}
     * @param excluded {number[]}
     */
    resetControllers(channel, excluded)
    {
        // save excluded controllers as reset doesn't affect them
        let excludedCCvalues = excluded.map(ccNum => {
            return {
                ccNum: ccNum,
                ccVal: this.workletProcessorChannels[channel].midiControllers[ccNum]
            }
        });

        // reset the array
        this.workletProcessorChannels[channel].midiControllers.set(resetArray);
        this.workletProcessorChannels[channel].channelVibrato = {rate: 0, depth: 0, delay: 0};
        this.workletProcessorChannels[channel].holdPedal = false;

        excludedCCvalues.forEach((cc) => {
            this.workletProcessorChannels[channel].midiControllers[cc.ccNum] = cc.ccVal;
        });

        // reset custom controllers
        // special case: transpose does not get affected
        const transpose = this.workletProcessorChannels[channel].customControllers[customControllers.channelTranspose];
        this.workletProcessorChannels[channel].customControllers.set(customResetArray);
        this.workletProcessorChannels[channel].customControllers[customControllers.channelTranspose] = transpose;

    }

}


// noinspection JSUnresolvedReference
registerProcessor(WORKLET_PROCESSOR_NAME, SpessaSynth);
console.log("%cProcessor succesfully registered!", consoleColors.recognized);