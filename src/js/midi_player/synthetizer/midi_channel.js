import {PresetNote} from "./notes/preset_note.js";
import {Preset} from "../../soundfont2_parser/chunk/presets.js";

const CHANNEL_LOUDNESS = 1.0;
export class MidiChannel {
    /**
     * creates a midi channel
     * @param targetNode {AudioNode}
     * @param defaultPreset {Preset}
     * @param debug {boolean}
     */
    constructor(targetNode, defaultPreset, debug= false) {
        this.ctx = targetNode.context;
        this.outputNode = targetNode;
        this.channelVolume = 1;
        this.channelExpression = 1;
        this.preset = defaultPreset;
        this.bank = this.preset.midiBankNumber;
        this.panner = this.ctx.createStereoPanner();
        this.debug = debug;
        this.NRPN_MSB = 0;
        this.NRPN_LSB = 0;
        this.vibrato = {depth: 0, rate: 0, delay: 0};

        this.holdPedal = false;
        /**
         * @type {number[]}
         */
        this.heldNotes = [];

        this.gainController =this.ctx.createGain();
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

    createNote(midiNote)
    {
        return new PresetNote(midiNote, this.panner, this.preset, this.vibrato);
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
            this.stopNote(note, 0);
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
        this.gainController.gain.setValueAtTime(this.getGain(),
            this.ctx.currentTime + 0.0001);
    }

    playNote(midiNote, velocity) {
        if(!velocity)
        {
            throw "No velocity given!";
        }
        if (velocity === 0) {
            this.stopNote(midiNote, 127);
            return;
        }

        let note = this.createNote(midiNote);

        // calculate gain
        //let gain = (velocity / 127) * this.channelVolume * this.channelExpression;

        let exclusives = note.startNote(velocity, this.debug);

        if(exclusives.length > 0)
        {
            for(let id of exclusives) {
                this.stopExclusiveNotes(id);
            }
        }

        this.playingNotes.push(note);
    }

    setPitchBend(bendMSB, bendLSB) {
        // bend all the notes
        let bend = (bendLSB + (bendMSB << 7)) - 8192;
        for (let note of this.playingNotes) {
            note.bendNote(bend);
        }
    }

    /**
     * kills the notes with exclusiveclass
     * @param exclusiveId {number}
     */
    stopExclusiveNotes(exclusiveId)
    {
        for(let note of this.playingNotes)
        {
            if(note.preset.exclusiveClasses.includes(exclusiveId) && note.preset !== this.preset)
            {
                note.disconnectNote();
                delete this.playingNotes.splice(this.playingNotes.indexOf(note), 1);
                console.log("killing", note);
            }
        }
    }

    setVolume(volume) {
        this.channelVolume = volume / 127;
        this.gainController.gain.setValueAtTime(this.getGain(),
            this.ctx.currentTime + 0.0001);
    }

    /**
     * Executes a data entry for an NRPN for a sc88pro
     * @param dataValue {number} dataEntry MSB
     */
    dataEntry(dataValue)
    {
        let addDefaultVibrato = () =>
        {
            if(this.vibrato.delay === 0 && this.vibrato.rate === 0 && this.vibrato.depth === 0)
            {
                this.vibrato.depth = 64;
                this.vibrato.rate = 8;
                this.vibrato.delay = 1;
            }
        }
        //https://cdn.roland.com/assets/media/pdf/SC-88PRO_OM.pdf
        switch(this.NRPN_MSB)
        {
            default:
                // console.log("Ignoring NRPN:", this.NRPN_MSB, this.NRPN_LSB);
                break;

            case 1:
                switch(this.NRPN_LSB)
                {
                    default:
                        // console.log("Ignoring NRPN:", this.NRPN_MSB, this.NRPN_LSB);
                        break;

                    case 8:
                        if(dataValue === 64)
                        {
                            return;
                        }
                        addDefaultVibrato();
                        console.log("Vibrato rate", dataValue);
                        this.vibrato.rate = (dataValue / 64) * 8;
                        break;

                    case 9:
                        if(dataValue === 64)
                        {
                            return;
                        }
                        addDefaultVibrato();
                        console.log("Vibrato depth", dataValue);
                        this.vibrato.depth = dataValue / 2;
                        break;

                    case 10:
                        if(dataValue === 64)
                        {
                            return;
                        }
                        addDefaultVibrato();
                        console.log("Vibrato delay", dataValue);
                        this.vibrato.delay = 40 / dataValue
                        break;
                }
                break;
        }
    }

    /**
     * @returns {number}
     */
    getGain(){
        return CHANNEL_LOUDNESS * this.channelVolume * this.channelExpression;
    }

    stopNote(midiNote) {
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

            note.stopNote().then(() => {
                note.disconnectNote();
                delete this.stoppingNotes.splice(this.stoppingNotes.indexOf(note), 1);
            });
        }
    }

    stopAll()
    {
        for(let midiNote = 0; midiNote < 128; midiNote++)
        {
            this.stopNote(midiNote, 64);
        }
    }
}