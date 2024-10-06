export class BasicMIDI
{
    constructor()
    {
        /**
         * The time division of the sequence
         * @type {number}
         */
        this.timeDivision = 0;
        /**
         * The duration of the sequence, in seconds
         * @type {number}
         */
        this.duration = 0;
        /**
         * The tempo changes in the sequence, ordered from last to first
         * @type {{ticks: number, tempo: number}[]}
         */
        this.tempoChanges = [{ ticks: 0, tempo: 120 }];
        /**
         * Contains the copyright strings
         * @type {string}
         */
        this.copyright = "";
        
        /**
         * The amount of tracks in the sequence
         * @type {number}
         */
        this.tracksAmount = 0;
        
        /**
         * The lyrics of the sequence as binary chunks
         * @type {Uint8Array[]}
         */
        this.lyrics = [];
        
        /**
         * First note on of the MIDI file
         * @type {number}
         */
        this.firstNoteOn = 0;
        
        /**
         * The MIDI's key range
         * @type {{min: number, max: number}}
         */
        this.keyRange = { min: 0, max: 127 };
        
        /**
         * The last voice (note on, off, cc change etc.) event tick
         * @type {number}
         */
        this.lastVoiceEventTick = 0;
        
        /**
         * Midi port numbers for each track
         * @type {number[]}
         */
        this.midiPorts = [0];
        
        /**
         * Channel offsets for each port, using the SpessaSynth method
         * @type {number[]}
         */
        this.midiPortChannelOffsets = [0];
        
        /**
         * All channels that each track uses
         * @type {Set<number>[]}
         */
        this.usedChannelsOnTrack = [];
        
        /**
         * The loop points (in ticks) of the sequence
         * @type {{start: number, end: number}}
         */
        this.loop = { start: 0, end: 0 };
        
        /**
         * The sequence's name
         * @type {string}
         */
        this.midiName = "";
        
        /**
         * The file name of the sequence, if provided in the MIDI class
         * @type {string}
         */
        this.fileName = "";
        
        /**
         * The raw, encoded MIDI name.
         * @type {Uint8Array}
         */
        this.rawMidiName = undefined;
        
        /**
         * The MIDI's embedded soundfont
         * @type {ArrayBuffer|undefined}
         */
        this.embeddedSoundFont = undefined;
        
        /**
         * The MIDI file's format
         * @type {number}
         */
        this.format = 0;
        
        /**
         * The RMID Info data if RMID, otherwise undefined
         * @type {Object<string, IndexedByteArray>}
         */
        this.RMIDInfo = {};
        /**
         * The bank offset for RMIDI
         * @type {number}
         */
        this.bankOffset = 0;
        
        /**
         * The actual track data of the MIDI file
         * @type {MidiMessage[][]}
         */
        this.tracks = [];
    }
}

/**
 * Converts ticks to time in seconds
 * @param ticks {number} time in MIDI ticks
 * @param mid {BasicMIDI} the MIDI
 * @returns {number} time in seconds
 */
export function MIDIticksToSeconds(ticks, mid)
{
    let totalSeconds = 0;
    
    while (ticks > 0)
    {
        // tempo changes are reversed so the first element is the last tempo change
        // and the last element is the first tempo change
        // (always at tick 0 and tempo 120)
        // find the last tempo change that has occurred
        let tempo = mid.tempoChanges.find(v => v.ticks < ticks);
        
        // calculate the difference and tempo time
        let timeSinceLastTempo = ticks - tempo.ticks;
        totalSeconds += (timeSinceLastTempo * 60) / (tempo.tempo * mid.timeDivision);
        ticks -= timeSinceLastTempo;
    }
    
    return totalSeconds;
}