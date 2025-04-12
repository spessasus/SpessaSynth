import { BasicMIDI } from "./basic_midi.js";
import { messageTypes, MIDIMessage } from "./midi_message.js";
import { IndexedByteArray } from "../utils/indexed_array.js";
import { SpessaSynthWarn } from "../utils/loggin.js";

/**
 * A class that helps to build a MIDI file from scratch.
 */
export class MIDIBuilder extends BasicMIDI
{
    /**
     * @param name {string} The MIDI's name
     * @param timeDivision {number} the file's time division
     * @param initialTempo {number} the file's initial tempo
     */
    constructor(name, timeDivision = 480, initialTempo = 120)
    {
        super();
        this.timeDivision = timeDivision;
        this.midiName = name;
        this.encoder = new TextEncoder();
        this.rawMidiName = this.encoder.encode(name);
        
        // create the first track with the file name
        this.addNewTrack(name);
        this.addSetTempo(0, initialTempo);
    }
    
    /**
     * Adds a new Set Tempo event
     * @param ticks {number} the tick number of the event
     * @param tempo {number} the tempo in beats per minute (BPM)
     */
    addSetTempo(ticks, tempo)
    {
        const array = new IndexedByteArray(3);
        
        tempo = 60000000 / tempo;
        
        // Extract each byte in big-endian order
        array[0] = (tempo >> 16) & 0xFF;
        array[1] = (tempo >> 8) & 0xFF;
        array[2] = tempo & 0xFF;
        
        this.addEvent(ticks, 0, messageTypes.setTempo, array);
    }
    
    /**
     * Adds a new MIDI track
     * @param name {string} the new track's name
     * @param port {number} the new track's port
     */
    addNewTrack(name, port = 0)
    {
        this.tracksAmount++;
        if (this.tracksAmount > 1)
        {
            this.format = 1;
        }
        this.tracks.push([]);
        this.tracks[this.tracksAmount - 1].push(
            new MIDIMessage(0, messageTypes.endOfTrack, new IndexedByteArray(0))
        );
        this.addEvent(0, this.tracksAmount - 1, messageTypes.trackName, this.encoder.encode(name));
        this.addEvent(0, this.tracksAmount - 1, messageTypes.midiPort, [port]);
    }
    
    /**
     * Adds a new MIDI Event
     * @param ticks {number} the tick time of the event
     * @param track {number} the track number to use
     * @param event {number} the MIDI event number
     * @param eventData {Uint8Array|Iterable<number>} the raw event data
     */
    addEvent(ticks, track, event, eventData)
    {
        if (!this.tracks[track])
        {
            throw new Error(`Track ${track} does not exist. Add it via addTrack method.`);
        }
        if (event === messageTypes.endOfTrack)
        {
            SpessaSynthWarn(
                "The EndOfTrack is added automatically and does not influence the duration. Consider adding a voice event instead.");
            return;
        }
        // remove the end of track
        this.tracks[track].pop();
        this.tracks[track].push(new MIDIMessage(
            ticks,
            event,
            new IndexedByteArray(eventData)
        ));
        // add the end of track
        this.tracks[track].push(new MIDIMessage(
            ticks,
            messageTypes.endOfTrack,
            new IndexedByteArray(0)
        ));
    }
    
    /**
     * Adds a new Note On event
     * @param ticks {number} the tick time of the event
     * @param track {number} the track number to use
     * @param channel {number} the channel to use
     * @param midiNote {number} the midi note of the keypress
     * @param velocity {number} the velocity of the keypress
     */
    addNoteOn(ticks, track, channel, midiNote, velocity)
    {
        channel %= 16;
        midiNote %= 128;
        velocity %= 128;
        this.addEvent(
            ticks,
            track,
            messageTypes.noteOn | channel,
            [midiNote, velocity]
        );
    }
    
    /**
     * Adds a new Note Off event
     * @param ticks {number} the tick time of the event
     * @param track {number} the track number to use
     * @param channel {number} the channel to use
     * @param midiNote {number} the midi note of the key release
     */
    addNoteOff(ticks, track, channel, midiNote)
    {
        channel %= 16;
        midiNote %= 128;
        this.addEvent(
            ticks,
            track,
            messageTypes.noteOff | channel,
            [midiNote, 64]
        );
    }
    
    /**
     * Adds a new Program Change event
     * @param ticks {number} the tick time of the event
     * @param track {number} the track number to use
     * @param channel {number} the channel to use
     * @param programNumber {number} the MIDI program to use
     */
    addProgramChange(ticks, track, channel, programNumber)
    {
        channel %= 16;
        programNumber %= 128;
        this.addEvent(
            ticks,
            track,
            messageTypes.programChange | channel,
            [programNumber]
        );
    }
    
    /**
     * Adds a new Controller Change event
     * @param ticks {number} the tick time of the event
     * @param track {number} the track number to use
     * @param channel {number} the channel to use
     * @param controllerNumber {number} the MIDI CC to use
     * @param controllerValue {number} the new CC value
     */
    addControllerChange(ticks, track, channel, controllerNumber, controllerValue)
    {
        channel %= 16;
        controllerNumber %= 128;
        controllerValue %= 128;
        this.addEvent(
            ticks,
            track,
            messageTypes.controllerChange | channel,
            [controllerNumber, controllerValue]
        );
    }
    
    /**
     * Adds a new Pitch Wheel event
     * @param ticks {number} the tick time of the event
     * @param track {number} the track to use
     * @param channel {number} the channel to use
     * @param MSB {number} SECOND byte of the MIDI pitchWheel message
     * @param LSB {number} FIRST byte of the MIDI pitchWheel message
     */
    addPitchWheel(ticks, track, channel, MSB, LSB)
    {
        channel %= 16;
        MSB %= 128;
        LSB %= 128;
        this.addEvent(
            ticks,
            track,
            messageTypes.pitchBend | channel,
            [LSB, MSB]
        );
    }
}