import { MIDISequenceData } from "./midi_sequence.js";

/**
 * A simplified version of the MIDI, accessible at all times from the Sequencer.
 * Use getMIDI() to get the actual sequence.
 * This class contains all properties that MIDI does, except for tracks and the embedded soundfont.
 */
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
        this.timeDivision = midi.timeDivision;
        this.duration = midi.duration;
        this.tempoChanges = midi.tempoChanges;
        this.copyright = midi.copyright;
        this.tracksAmount = midi.tracksAmount;
        this.lyrics = midi.lyrics;
        this.lyricsTicks = midi.lyricsTicks;
        this.firstNoteOn = midi.firstNoteOn;
        this.keyRange = midi.keyRange;
        this.lastVoiceEventTick = midi.lastVoiceEventTick;
        this.midiPorts = midi.midiPorts;
        this.midiPortChannelOffsets = midi.midiPortChannelOffsets;
        this.usedChannelsOnTrack = midi.usedChannelsOnTrack;
        this.loop = midi.loop;
        this.midiName = midi.midiName;
        this.midiNameUsesFileName = midi.midiNameUsesFileName;
        this.fileName = midi.fileName;
        this.rawMidiName = midi.rawMidiName;
        this.format = midi.format;
        this.RMIDInfo = midi.RMIDInfo;
        this.bankOffset = midi.bankOffset;
        this.isKaraokeFile = midi.isKaraokeFile;
        
        // Set isEmbedded based on the presence of an embeddedSoundFont
        this.isEmbedded = midi.embeddedSoundFont !== undefined;
    }
}


/**
 * Temporary MIDI data used when the MIDI is not loaded.
 * @type {MIDIData}
 */
export const DUMMY_MIDI_DATA = {
    duration: 99999,
    firstNoteOn: 0,
    loop: {
        start: 0,
        end: 123456
    },
    
    lastVoiceEventTick: 123456,
    lyrics: [],
    copyright: "",
    midiPorts: [],
    midiPortChannelOffsets: [],
    tracksAmount: 0,
    tempoChanges: [{ ticks: 0, tempo: 120 }],
    fileName: "NOT_LOADED.mid",
    midiName: "Loading...",
    rawMidiName: new Uint8Array([76, 111, 97, 100, 105, 110, 103, 46, 46, 46]), // "Loading..."
    usedChannelsOnTrack: [],
    timeDivision: 0,
    keyRange: { min: 0, max: 127 },
    isEmbedded: false,
    RMIDInfo: {},
    bankOffset: 0,
    midiNameUsesFileName: false,
    format: 0
};