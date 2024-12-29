import { messageTypes } from "./midi_message.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";
import { MIDISequenceData } from "./midi_sequence.js";

/**
 * BasicMIDI is the base of a complete MIDI file, used by the sequencer internally.
 * BasicMIDI is not available on the main thread, as it contains the actual track data which can be large.
 * It can be accessed by calling getMIDI() on the Sequencer.
 */
export class BasicMIDI extends MIDISequenceData
{
    
    /**
     * The embedded soundfont in the MIDI file, represented as an ArrayBuffer, if available.
     * @type {ArrayBuffer|undefined}
     */
    embeddedSoundFont = undefined;
    
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
        m.isKaraokeFile = mid.isKaraokeFile;
        
        // Copying arrays
        m.tempoChanges = [...mid.tempoChanges]; // Shallow copy
        m.lyrics = mid.lyrics.map(arr => new Uint8Array(arr)); // Deep copy of each binary chunk
        m.lyricsTicks = [...mid.lyricsTicks]; // Shallow copy
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
 * @param mid {BasicMIDI|MidiData} the MIDI
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