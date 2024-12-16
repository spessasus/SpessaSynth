import { messageTypes } from "./midi_message.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";

export class BasicMIDI
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
     * A string containing the copyright information for the MIDI sequence if detected.
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
     * The file name of the MIDI sequence, if provided during parsing.
     * @type {string}
     */
    fileName = "";
    
    /**
     * The raw, encoded MIDI name, represented as a Uint8Array.
     * Useful when the MIDI file uses a different code page.
     * @type {Uint8Array}
     */
    rawMidiName = undefined;
    
    /**
     * The embedded soundfont in the MIDI file, represented as an ArrayBuffer, if available.
     * @type {ArrayBuffer|undefined}
     */
    embeddedSoundFont = undefined;
    
    /**
     * The format of the MIDI file, which can be 0, 1, or 2, indicating the type of the MIDI file.
     * @type {number}
     */
    format = 0;
    
    /**
     * The RMID (Resource Interchangeable MIDI) info data, if the file is RMID formatted.
     * Otherwise, this field is undefined.
     * Chunk type (e.g. "INAM"): Chunk data as binary array.
     * @type {Object<string, IndexedByteArray>}
     */
    RMIDInfo = {};
    
    /**
     * The bank offset used for RMID files.
     * @type {number}
     */
    bankOffset = 0;
    
    /**
     * The actual track data of the MIDI file, represented as an array of tracks.
     * Tracks are arrays of MidiMessage objects.
     * @type {MidiMessage[][]}
     */
    tracks = [];
    
    /**
     * Copies a MIDI
     * @param mid {BasicMIDI}
     * @returns {BasicMIDI}
     */
    static copyFrom(mid)
    {
        const m = new BasicMIDI();
        
        m.midiName = mid.midiName;
        m.midiNameUsesFileName = mid.midiNameUsesFileName;
        m.fileName = mid.fileName;
        m.timeDivision = mid.timeDivision;
        m.duration = mid.duration;
        m.copyright = mid.copyright;
        m.tracksAmount = mid.tracksAmount;
        m.firstNoteOn = mid.firstNoteOn;
        m.keyRange = { ...mid.keyRange }; // Deep copy of keyRange
        m.lastVoiceEventTick = mid.lastVoiceEventTick;
        m.loop = { ...mid.loop }; // Deep copy of loop
        m.format = mid.format;
        m.bankOffset = mid.bankOffset;
        
        // Copying arrays
        m.tempoChanges = [...mid.tempoChanges]; // Shallow copy
        m.lyrics = mid.lyrics.map(arr => new Uint8Array(arr)); // Deep copy of each binary chunk
        m.midiPorts = [...mid.midiPorts]; // Shallow copy
        m.midiPortChannelOffsets = [...mid.midiPortChannelOffsets]; // Shallow copy
        m.usedChannelsOnTrack = mid.usedChannelsOnTrack.map(set => new Set(set)); // Deep copy
        m.rawMidiName = mid.rawMidiName ? new Uint8Array(mid.rawMidiName) : undefined; // Deep copy
        m.embeddedSoundFont = mid.embeddedSoundFont ? mid.embeddedSoundFont.slice() : undefined; // Deep copy
        
        // Copying RMID Info object (deep copy)
        m.RMIDInfo = { ...mid.RMIDInfo };
        
        // Copying track data (deep copy of each track)
        m.tracks = mid.tracks.map(track => [...track]); // Shallow copy of each track array
        
        return m;
    }
    
    /**
     * Updates all internal values
     */
    flush()
    {
        
        // find first note on
        const firstNoteOns = [];
        for (const t of this.tracks)
        {
            // sost the track by ticks
            t.sort((e1, e2) => e1.ticks - e2.ticks);
            const firstNoteOn = t.find(e => (e.messageStatusByte & 0xF0) === messageTypes.noteOn);
            if (firstNoteOn)
            {
                firstNoteOns.push(firstNoteOn.ticks);
            }
        }
        this.firstNoteOn = Math.min(...firstNoteOns);
        
        // find tempo changes
        // and used channels on tracks
        // and midi ports
        // and last voice event tick
        // and loop
        this.lastVoiceEventTick = 0;
        this.tempoChanges = [{ ticks: 0, tempo: 120 }];
        this.midiPorts = [];
        this.midiPortChannelOffsets = [];
        let portOffset = 0;
        /**
         * @type {Set<number>[]}
         */
        this.usedChannelsOnTrack = this.tracks.map(() => new Set());
        this.tracks.forEach((t, trackNum) =>
        {
            this.midiPorts.push(-1);
            t.forEach(e =>
            {
                // last voice event tick
                if (e.messageStatusByte >= 0x80 && e.messageStatusByte < 0xF0)
                {
                    if (e.ticks > this.lastVoiceEventTick)
                    {
                        this.lastVoiceEventTick = e.ticks;
                    }
                }
                
                // tempo, used channels, port
                if (e.messageStatusByte === messageTypes.setTempo)
                {
                    this.tempoChanges.push({
                        ticks: e.ticks,
                        tempo: 60000000 / readBytesAsUintBigEndian(
                            e.messageData,
                            3
                        )
                    });
                }
                else if ((e.messageStatusByte & 0xF0) === messageTypes.noteOn)
                {
                    this.usedChannelsOnTrack[trackNum].add(e.messageData[0]);
                }
                else if (e.messageStatusByte === messageTypes.midiPort)
                {
                    const port = e.messageData[0];
                    this.midiPorts[trackNum] = port;
                    if (this.midiPortChannelOffsets[port] === undefined)
                    {
                        this.midiPortChannelOffsets[port] = portOffset;
                        portOffset += 16;
                    }
                }
            });
        });
        
        this.loop = { start: this.firstNoteOn, end: this.lastVoiceEventTick };
        
        // reverse tempo and compute duration
        this.tempoChanges.reverse();
        this.duration = MIDIticksToSeconds(this.lastVoiceEventTick, this);
        
        // fix midi ports:
        // midi tracks without ports will have a value of -1
        // if all ports have a value of -1, set it to 0, otherwise take the first midi port and replace all -1 with it
        // why do this? some midis (for some reason) specify all channels to port 1 or else, but leave the conductor track with no port pref.
        // this spessasynth to reserve the first 16 channels for the conductor track (which doesn't play anything) and use additional 16 for the actual ports.
        let defaultP = 0;
        for (let port of this.midiPorts)
        {
            if (port !== -1)
            {
                defaultP = port;
                break;
            }
        }
        this.midiPorts = this.midiPorts.map(port => port === -1 ? defaultP : port);
        // add dummy port if empty
        if (this.midiPortChannelOffsets.length === 0)
        {
            this.midiPortChannelOffsets = [0];
        }
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