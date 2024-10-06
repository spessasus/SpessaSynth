import { BasicMIDI, MIDIticksToSeconds } from "./basic_midi.js";
import { messageTypes, MidiMessage } from "./midi_message.js";
import { IndexedByteArray } from "../utils/indexed_array.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";
import { SpessaSynthWarn } from "../utils/loggin.js";

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
    
    /**
     * Adds a new "set tempo" message
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
            new MidiMessage(0, messageTypes.endOfTrack, new IndexedByteArray(0))
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
            SpessaSynthWarn("The EndOfTrack is added automatically. Ignoring!");
            return;
        }
        // remove end of track
        this.tracks[track].pop();
        this.tracks[track].push(new MidiMessage(
            ticks,
            event,
            new IndexedByteArray(eventData)
        ));
        // add end of track
        this.tracks[track].push(new MidiMessage(
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