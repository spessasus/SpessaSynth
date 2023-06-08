import {PresetNote} from "./notes/preset_note.js";
import {Preset} from "../../soundfont/chunk/presets.js";

const CHANNEL_LOUDNESS = 1.0;

const dataEntryStates = {
    Idle: "Idle",
    RPCoarse: "RPCoarse",
    RPFine: "RPFine",
    NRPCoarse: "NRPCoarse",
    NRPFine: "NRPFine",
    DataCoarse: "DataCoarse",
    DataFine: "DataFine"
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

        this.panner = this.ctx.createStereoPanner();
        this.gainController =this.ctx.createGain();

        this.resetControllers();

        // note -> panner -> gain -> out

        this.panner.connect(this.gainController);

        this.gainController.connect(this.outputNode);
        this.gainController.gain.value = this.getGain();

        /**
         * Current playing notes
         * @type {PresetNote[]}
         */
        this.playingNotes = [];
        /**
         * Notes that are stopping and are about to get deleted
         * @type {PresetNote[]}
         */
        this.stoppingNotes = [];

    }

    // /**
    //  * Sets the reverb impulse
    //  * @param buffer {AudioBuffer}
    //  */
    // setReverbBuffer(buffer)
    // {
    //     this.reverb.buffer = buffer;
    // }

    // /**
    //  * Sets reverb
    //  * @param value {number} reverb amount. 0-127
    //  */
    // setReverb(value)
    // {
    //     console.log(`Reverb for ${this.channelNumber}:`, (value / 127) * 100, "%");
    //     this.reverbWet.gain.value = value / 127;
    // }

    createNote(midiNote, hP)
    {
        return new PresetNote(midiNote, this.panner, this.preset, this.vibrato, this.channelTuningRatio, hP);
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
     * Changes preset
     * @param preset {Preset}
     */
    changePreset(preset)
    {
        this.preset = preset
    }

    /**
     * Changes audio pan
     * @param pan {number}
     */
    changePan(pan)
    {
        this.panner.pan.setValueAtTime(pan, 0);
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
     * @param highPerf {boolean} if set to true, note is limeted to 2 samples max
     */
    playNote(midiNote, velocity, debugInfo = false, highPerf = false) {
        if(!velocity)
        {
            throw "No velocity given!";
        }
        if (velocity === 0) {
            // stop if velocity 0
            this.stopNote(midiNote);
            return;
        }

        let note = this.createNote(midiNote, highPerf);

        // calculate gain
        let gain = (velocity / 127);

        /*let exclusives =*/ note.startNote(gain, debugInfo);

        // if(exclusives.length > 0)
        // {
        //     for(let id of exclusives) {
        //         this.stopExclusiveNotes(id);
        //     }
        // }

        this.playingNotes.push(note);
    }

    setPitchBend(bendMSB, bendLSB) {
        // bend all the notes
        const bend = (bendLSB | (bendMSB << 7)) - 8192;
        const bendRatio = (bend / 8192) * this.channelPitchBendRange;
        for (let note of this.playingNotes) {
            note.bendNote(bendRatio);
        }
    }

    get voicesAmount()
    {
        return this.playingNotes.length + this.stoppingNotes.length + this.heldNotes.length;
    }

    setVolume(volume) {
        this.channelVolume = volume / 127;
        this.gainController.gain.setValueAtTime(this.getGain(),
            this.ctx.currentTime + 0.0001);
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
                this.vibrato.delay = 1;
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
                                this.vibrato.delay = (64 / dataValue) / 2;
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
                        console.log(`Channel ${this.channelNumber} bend range. Semitones:`, dataValue);
                        break;

                    // coarse and fine tuning
                    case 0x0001:
                    case 0x0002:
                        this.channelTuningRatio = Math.pow(2,  (dataValue - 64) / 12);
                        console.log(`Channel ${this.channelNumber} tuning. Type:`, this.RPValue, "Value:", dataValue);
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
        this.channelPitchBendRange = 12;
        this.holdPedal = false;
        this.gainController.gain.value = 1;
        this.panner.pan.value = 0;

        this.vibrato = {depth: 0, rate: 0, delay: 0};
        this.resetParameters();
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