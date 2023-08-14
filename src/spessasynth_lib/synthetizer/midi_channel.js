import {Voice} from "./buffer_voice/voice.js";
import {Preset} from "../soundfont/chunk/presets.js";

const CHANNEL_LOUDNESS = 0.5;

const BRIGHTNESS_MAX_FREQ = 22050;
const BRIGHTNESS_MIN_FREQ = 300;
const REVERB_TIME_S = 1;

const dataEntryStates = {
    Idle: 0,
    RPCoarse: 1,
    RPFine: 2,
    NRPCoarse: 3,
    NRPFine: 4,
    DataCoarse: 5,
    DataFine: 6
};

export class MidiChannel {
    /**
     * creates a midi channel
     * @param targetNode {AudioNode}
     * @param defaultPreset {Preset}
     * @param channelNumber {number}
     * @param percussionChannel {boolean}
     */
    constructor(targetNode, defaultPreset, channelNumber = -1, percussionChannel = false) {
        this.ctx = targetNode.context;
        this.outputNode = targetNode;
        this.channelNumber = channelNumber
        this.percussionChannel = percussionChannel;

        this.preset = defaultPreset;
        this.bank = this.preset.bank;

        /**
         * @type {number[]}
         */
        this.heldNotes = [];

        this.panner = new StereoPannerNode(this.ctx);

        this.gainController = new GainNode(this.ctx, {
            gain: 1
        });

        this.brightnessController = new BiquadFilterNode(this.ctx, {
            type: "lowpass",
            frequency: BRIGHTNESS_MAX_FREQ
        });

        const revLength = Math.round(this.ctx.sampleRate * REVERB_TIME_S);
        const revbuff = new AudioBuffer({
            numberOfChannels: 2,
            sampleRate: this.ctx.sampleRate,
            length: revLength
        });

        const revLeft = revbuff.getChannelData(0);
        const revRight = revbuff.getChannelData(1);
        for(let i = 0; i < revLength; i++)
        {
            // clever reverb algorithm from here:
            // https://github.com/g200kg/webaudio-tinysynth/blob/master/webaudio-tinysynth.js#L1342
            if(i / revLength < Math.random())
            {
                revLeft[i] = Math.exp(-3 * i / revLength) * (Math.random() - 0.5) / 2;
                revRight[i] = Math.exp(-3 * i / revLength) * (Math.random() - 0.5) / 2;
            }
        }

        this.convolver = new ConvolverNode(this.ctx, {
            buffer: revbuff
        });
        this.reverb = new GainNode(this.ctx, {
            gain: 0
        });

        // note -> panner   -> brightness -> gain -> out
        //           \-> conv -> rev -/
        this.panner.connect(this.convolver);
        this.panner.connect(this.brightnessController);

        this.convolver.connect(this.reverb);
        this.reverb.connect(this.brightnessController);

        this.brightnessController.connect(this.gainController);
        this.gainController.connect(this.outputNode)
        this.resetControllers();


        /**
         * Current playing notes
         * @type {Voice[]}
         */
        this.playingNotes = [];
        /**
         * Notes that are stopping and are about to get deleted
         * @type {Voice[]}
         */
        this.stoppingNotes = [];


        /**
         * In semitones, does not get affected by resetControllers()
         * @type {number}
         */
        this.channelTranspose = 0;

        /**
         * Controls if the channel will be affected by progam change
         * @type {boolean}
         */
        this.lockPreset = false;
    }

    pressHoldPedal()
    {
        this.holdPedal = true;
    }

    releaseHoldPedal()
    {
        this.holdPedal = false;
        for(let note of this.heldNotes)
        {
            this.stopNote(note);
        }
        this.heldNotes = [];
    }

    /**
     * @param reverb {number} reverb amount, ranges from 0 to 127
     */
    setReverb(reverb)
    {
        this.reverb.gain.value = reverb / 64;
        if(reverb === 0)
        {
            try {
                this.panner.disconnect(this.convolver);
            }
            catch {}
        }
        else
        {
            this.panner.connect(this.convolver);
        }
    }

    /**
     * Changes preset
     * @param preset {Preset}
     */
    setPreset(preset)
    {
        if(this.lockPreset)
        {
            return;
        }
        this.preset = preset;
        if(this.preset.bank === 128)
        {
            this.percussionChannel = true;
            this.channelTranspose = 0;
        }
        else
        {
            this.percussionChannel = false;
        }
    }

    /**
     * Changes audio pan
     * @param pan {number}
     */
    setPan(pan)
    {
        this.panner.pan.setTargetAtTime(pan, this.outputNode.context.currentTime, 0.001);
    }

    setExpression(val)
    {
        this.channelExpression = val;
        this.gainController.gain.value = this.getGain();
    }

    /**
     * @param midiNote {number} 0-127
     * @param velocity {number} 0-127
     * @param debugInfo {boolean} for debugging set to true
     */
    playNote(midiNote, velocity, debugInfo = false) {
        if(!velocity)
        {
            throw "No velocity given!";
        }
        if (velocity === 0) {
            // stop if velocity 0
            this.stopNote(midiNote);
            return;
        }

        let note = new Voice(midiNote, velocity, this.panner, this.preset, this.vibrato, this.channelTuningRatio);

        let exclusives = note.startNote(debugInfo);
        const bendRatio = (this.pitchBend / 8192) * this.channelPitchBendRange;
        note.bendNote(bendRatio + this.channelTranspose);

        for(const exclusive of exclusives)
        {
            if(exclusive === 0)
            {
                continue;
            }
            // playing notes
            this.playingNotes.forEach(n => {
                if(n.exclusives.has(exclusive))
                {
                    n.disconnectNote();
                    this.playingNotes.splice(this.playingNotes.indexOf(n), 1);
                }
            });

            // stopping notes
            this.stoppingNotes.forEach(n => {
                if(n.exclusives.has(exclusive))
                {
                    n.disconnectNote();
                    this.stoppingNotes.splice(this.stoppingNotes.indexOf(n), 1);
                }
            });
        }

        this.playingNotes.push(note);
    }

    setPitchBend(bendMSB, bendLSB) {
        // bend all the notes
        this.pitchBend = (bendLSB | (bendMSB << 7)) - 8192;
        const semitones = (this.pitchBend / 8192) * this.channelPitchBendRange;
        for (let note of this.playingNotes) {
            note.bendNote(semitones + this.channelTranspose);
        }
    }

    get voicesAmount()
    {
        return this.playingNotes.length + this.stoppingNotes.length + this.heldNotes.length;
    }

    /**
     * @param brightness {number} 0-127
     */
    setBrightness(brightness)
    {
        this.brightness = brightness;
        this.brightnessController.frequency.value = (this.brightness / 127) * (BRIGHTNESS_MAX_FREQ - BRIGHTNESS_MIN_FREQ) + BRIGHTNESS_MIN_FREQ;
    }

    setVolume(volume) {
        this.channelVolume = volume / 127;
        this.gainController.gain.value = this.getGain();
    }

    setRPCoarse(value)
    {
        this.RPValue = value;
        this.dataEntryState = dataEntryStates.RPCoarse;
    }

    setRPFine(value)
    {
        this.RPValue = this.RPValue << 7 | value;
        this.dataEntryState = dataEntryStates.RPFine;
    }

    setNRPCoarse(value)
    {
        this.NRPCoarse = value;
        this.dataEntryState = dataEntryStates.NRPCoarse;
    }

    setNRPFine(value)
    {
        this.NRPFine = value;
        this.dataEntryState = dataEntryStates.NRPFine;
    }

    /**
     * Executes a data entry for an NRP for a sc88pro NRP (because touhou yes) and RPN tuning
     * @param dataValue {number} dataEntryCoarse MSB
     */
    dataEntryCoarse(dataValue)
    {
        let addDefaultVibrato = () =>
        {
            if(this.vibrato.delay === 0 && this.vibrato.rate === 0 && this.vibrato.depth === 0)
            {
                this.vibrato.depth = 64;
                this.vibrato.rate = 7;
                this.vibrato.delay = 0.3;
            }
        }

        switch(this.dataEntryState)
        {
            default:
            case dataEntryStates.Idle:
                break;

            //https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
            case dataEntryStates.NRPFine:
                switch(this.NRPCoarse)
                {
                    default:
                        break;

                    case 1:
                        switch(this.NRPFine)
                        {
                            default:
                                break;

                            // vibrato rate
                            case 8:
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.vibrato.rate = (dataValue / 64) * 8;
                                console.log(`Vibrato rate for ${this.channelNumber}:`, dataValue, "=>", this.vibrato.rate, "total:", this.vibrato);
                                break;

                            // vibrato depth
                            case 9:
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.vibrato.depth = dataValue / 2;
                                console.log(`Vibrato depth for ${this.channelNumber}:`, dataValue, "=>", this.vibrato.depth, "total:", this.vibrato);
                                break;

                            // vibrato delay
                            case 10:
                                if(dataValue === 64)
                                {
                                    return;
                                }
                                addDefaultVibrato();
                                this.vibrato.delay = (dataValue / 64) / 3;
                                console.log(`Vibrato delay for ${this.channelNumber}`, dataValue, "=>", this.vibrato.delay, "total:", this.vibrato);
                                break;
                        }
                        break;
                }
                break;

            case dataEntryStates.RPCoarse:
            case dataEntryStates.RPFine:
                switch(this.RPValue)
                {
                    default:
                        break;

                    // pitch bend range
                    case 0x0000:
                        this.channelPitchBendRange = dataValue;
                        //console.log(`Channel ${this.channelNumber} bend range. Semitones:`, dataValue);
                        break;

                    // coarse tuning
                    case 0x0002:
                        // semitones
                        this.channelTuningRatio = Math.pow(2,  (dataValue - 64) / 12);
                        //console.log(`Channel ${this.channelNumber} coarse tuning. Type:`, this.RPValue, "Value:", dataValue);
                        break;

                    case 0x3FFF:
                        this.resetParameters();
                        break;

                }

        }
    }

    /**
     * @returns {number}
     */
    getGain(){
        return CHANNEL_LOUDNESS * this.channelVolume * this.channelExpression;
    }

    /**
     * Stops the note
     * @param midiNote {number} 0-127
     * @param highPerf {boolean} if set to true, the note will be silenced in 50ms
     */
    stopNote(midiNote, highPerf=false) {
        // TODO: fix holdPedal
        if(this.holdPedal)
        {
            this.heldNotes.push(midiNote);
            return;
        }


        let notes = this.playingNotes.filter(n => n.midiNote === midiNote);
        if(notes.length < 1)
        {
            return
        }
        for(let note of notes) {

            // add note as a fading one
            this.stoppingNotes.push(note);

            // and remove it from the main array
            this.playingNotes.splice(this.playingNotes.indexOf(note), 1);

            if(highPerf)
            {
                note.killNote().then(() => {
                    note.disconnectNote();
                    delete this.stoppingNotes.splice(this.stoppingNotes.indexOf(note), 1);
                });
            }
            else {
                note.stopNote().then(() => {
                    note.disconnectNote();
                    delete this.stoppingNotes.splice(this.stoppingNotes.indexOf(note), 1);
                });
            }
        }
    }

    stopAll()
    {
        for(let midiNote = 0; midiNote < 128; midiNote++)
        {
            this.stopNote(midiNote);
        }
    }

    resetControllers()
    {
        this.channelVolume = 1;
        this.channelExpression = 1;
        this.channelTuningRatio = 1;
        this.channelPitchBendRange = 2;
        this.holdPedal = false;
        this.gainController.gain.value = 1;
        this.panner.pan.value = 0;
        this.pitchBend = 0;
        this.brightness = 127;
        this.brightnessController.frequency.value = BRIGHTNESS_MAX_FREQ;
        this.reverb.gain.value = 0;

        this.vibrato = {depth: 0, rate: 0, delay: 0};
        this.resetParameters();
    }

    transposeChannel(semitones)
    {
        if(this.percussionChannel)
        {
            return;
        }
        this.channelTranspose = semitones;
        const semi = (this.pitchBend / 8192) * this.channelPitchBendRange;
        for (let note of this.playingNotes) {
            note.bendNote(semi + this.channelTranspose);
        }
    }

    resetParameters()
    {
        /**
         * @type {number}
         */
        this.NRPCoarse = 0;
        /**
         * @type {number}
         */
        this.NRPFine = 0;
        /**
         * @type {number}
         */
        this.RPValue = 0;
        /**
         * @type {string}
         */
        this.dataEntryState = dataEntryStates.Idle;
    }
}