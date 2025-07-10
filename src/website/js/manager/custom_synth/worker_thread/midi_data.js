import { BasicMIDI, MIDISequenceData } from "spessasynth_core";

export class MIDIData extends MIDISequenceData
{
    
    /**
     * A boolean indicating if the MIDI file contains an embedded soundfont.
     * If the embedded soundfont is undefined, this will be false.
     * @type {boolean}
     */
    isEmbedded = false;
    
    /**
     * Constructor that copies data from a BasicMIDI instance.
     * @param {BasicMIDI} midi - The BasicMIDI instance to copy data from.
     */
    constructor(midi)
    {
        super();
        this._copyFromSequence(midi);
        
        // keep so it doesn't break IPIC
        if (midi["isEmbedded"])
        {
            this.isEmbedded = midi["isEmbedded"];
            return this;
        }
        
        // Set isEmbedded based on the presence of an embeddedSoundFont
        this.isEmbedded = midi.embeddedSoundFont !== undefined;
    }
}