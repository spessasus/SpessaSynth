import {PresetNote} from "../midi_player/notes/preset_note.js";
import {Preset} from "../soundfont2_parser/chunk/presets.js";
// import {OscillatorNote} from "../midi_player/notes/oscillator_node.js";

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
        this.channelVolume = 1;
        this.channelExpression = 1;
        this.preset = defaultPreset;
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
        this.gainController.connect(targetNode);
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

        /*
        // initialize oscillators
        this.notes = [];

        for (let i = 0; i < 128; i++) {
            this.notes[i] = this.createNote(i);
        }

        setInterval(() => {this.ReplaceInactiveNotes()}, 1200);

         */
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
        /*
        let note = this.notes[midiNote];

        // calculate gain
        let gain = (velocity / 128) * 0.15 * this.channelVolume * this.channelExpression;

        note.gainNode.gain.value = 0;
        note.gainNode.gain
            .setTargetAtTime(gain, this.audioCtx.currentTime, 0.1);

        // start the note
        try
        {
            note.oscillatorNode.start();
        }
        catch(Error)
        {
            // note already started
        }*/

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
        /*
        for (let i = 0; i < 128; i++) {
            let note = this.notes[i];
            note.oscillatorNode.frequency
                .value = this.getFrequency(i, bend);
        }
         */
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
                        this.vibrato.rate = dataValue;
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

                    // case 32:
                    //     console.log("TVF Cutoff frequency", dataValue);
                    //     break;
                    //
                    // case 33:
                    //     console.log("TVF resonance", dataValue);
                    //     break;
                    //
                    // case 99:
                    //     console.log("TVF&TVA Envelope Attack Time", dataValue);
                    //     break;
                    //
                    // case 100:
                    //     console.log("TVF&TVA Envelope Decay Time", dataValue);
                    //     break;
                    //
                    // case 102:
                    //     console.log("TVF&TVA Envelope Release Time", dataValue);
                    //     break;
                }
                break;

            // case 24:
            //     console.log("Drum Instrument Pitch Coarse", dataValue);
            //     break;
            //
            // case 26:
            //     console.log("Drum Instrument TVA Level", dataValue);
            //     break;
            //
            // case 28:
            //     console.log("Drum Instrument Pan", dataValue);
            //     break;
            //
            // case 29:
            //     console.log("Drum Instrument Reverb Send Level", dataValue);
            //     break;
            //
            // case 30:
            //     console.log("Drum Instrument Chorus Send Level", dataValue);
            //     break;
            //
            // case 31:
            //     console.log("Drum Instrument Delay Send Level", dataValue);
            //     break;
        }
    }

    /**
     * @returns {number}
     */
    getGain(){
        return CHANNEL_LOUDNESS * this.channelVolume * this.channelExpression;
    }

    stopNote(midiNote) {
        /*
        let note = this.notes[midiNote];
        // smoothly fade out
        note.gainNode.gain
            .setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
         */

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

    // ReplaceInactiveNotes(){
    //     for(let i = 0; i < 128; i++)
    //     {
    //         let note = this.notes[i];
    //         if(!note.gainNode.gain.value < 0.01)
    //         {
    //             continue;
    //         }
    //         try {
    //             note.oscillatorNode.stop();
    //         }
    //         catch(Error)
    //         {
    //             continue;
    //         }
    //         note.oscillatorNode = this.audioCtx.createOscillator();
    //         note.oscillatorNode.frequency.value = this.getFrequency(i);
    //         note.oscillatorNode.connect(note.gainNode);
    //         note.oscillatorNode.type = "triangle";
    //     }
    // }
}