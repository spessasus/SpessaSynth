/**
 * A simplified version of the MIDI, accessible at all times from the Sequencer. use getMIDI() to get the actual sequence
 * This class contains all properties that MIDI does, except for tracks, which is the track data.
 */
export class MidiData
{
    /**
     * The time division of the sequence, representing the number of ticks per beat.
     * @type {number}
     */
    timeDivision = 0;
    
    /**
     * The duration of the sequence, in seconds.
     * @type {number}
     */
    duration = 0;
    
    /**
     * The tempo changes in the sequence, ordered from the last change to the first.
     * Each change is represented by an object with a tick position and a tempo value in beats per minute.
     * @type {{ticks: number, tempo: number}[]}
     */
    tempoChanges = [{ ticks: 0, tempo: 120 }];
    
    /**
     * A string containing the copyright information for the MIDI sequence.
     * @type {string}
     */
    copyright = "";
    
    /**
     * The number of tracks in the MIDI sequence.
     * @type {number}
     */
    tracksAmount = 0;
    
    /**
     * An array containing the lyrics of the sequence, stored as binary chunks (Uint8Array).
     * @type {Uint8Array[]}
     */
    lyrics = [];
    
    /**
     * The tick position of the first note-on event in the MIDI sequence.
     * @type {number}
     */
    firstNoteOn = 0;
    
    /**
     * The MIDI key range used in the sequence, represented by a minimum and maximum note value.
     * @type {{min: number, max: number}}
     */
    keyRange = { min: 0, max: 127 };
    
    /**
     * The tick position of the last voice event (such as note-on, note-off, or control change) in the sequence.
     * @type {number}
     */
    lastVoiceEventTick = 0;
    
    /**
     * An array of MIDI port numbers used by each track in the sequence.
     * @type {number[]}
     */
    midiPorts = [0];
    
    /**
     * An array of channel offsets for each MIDI port, using the SpessaSynth method.
     * @type {number[]}
     */
    midiPortChannelOffsets = [0];
    
    /**
     * A list of sets, where each set contains the MIDI channels used by each track in the sequence.
     * @type {Set<number>[]}
     */
    usedChannelsOnTrack = [];
    
    /**
     * The loop points (in ticks) of the sequence, including both start and end points.
     * @type {{start: number, end: number}}
     */
    loop = { start: 0, end: 0 };
    
    /**
     * The name of the MIDI sequence.
     * @type {string}
     */
    midiName = "";
    
    /**
     * A boolean indicating if the sequence's name is the same as the file name.
     * @type {boolean}
     */
    midiNameUsesFileName = false;
    
    /**
     * The file name of the MIDI sequence, if provided by the MIDI class.
     * @type {string}
     */
    fileName = "";
    
    /**
     * The raw, encoded MIDI name, represented as a Uint8Array.
     * @type {Uint8Array}
     */
    rawMidiName = undefined;
    
    /**
     * A boolean indicating if the MIDI file contains an embedded soundfont.
     * If the embedded soundfont is undefined, this will be false.
     * @type {boolean}
     */
    isEmbedded = false;
    
    /**
     * The MIDI file's format, which can be 0, 1, or 2, indicating the type of the MIDI file.
     * @type {number}
     */
    format = 0;
    
    /**
     * The RMID (Resource Interchangeable MIDI) info data, if the file is RMID formatted.
     * Otherwise, this field is undefined.
     * @type {Object<string, IndexedByteArray>}
     */
    RMIDInfo = {};
    
    /**
     * The bank offset used for RMID files.
     * @type {number}
     */
    bankOffset = 0;
    
    /**
     * Constructor that copies data from a BasicMIDI instance, except for tracks and embeddedSoundFont.
     * @param {BasicMIDI} midi - The BasicMIDI instance to copy data from.
     */
    constructor(midi)
    {
        this.timeDivision = midi.timeDivision;
        this.duration = midi.duration;
        this.tempoChanges = midi.tempoChanges;
        this.copyright = midi.copyright;
        this.tracksAmount = midi.tracksAmount;
        this.lyrics = midi.lyrics;
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
        
        // Set isEmbedded based on the presence of an embeddedSoundFont
        this.isEmbedded = midi.embeddedSoundFont !== undefined;
    }
}


/**
 *
 * @type {MidiData}
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
    midiNameUsesFileName: false
};