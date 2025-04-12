import { MIDISequenceData } from "./midi_sequence.js";
import { getStringBytes, readBytesAsString } from "../utils/byte_functions/string.js";
import { messageTypes, MIDIMessage } from "./midi_message.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from "../utils/loggin.js";
import { consoleColors, formatTitle, sanitizeKarLyrics } from "../utils/other.js";
import { writeMIDI } from "./midi_tools/midi_writer.js";
import { applySnapshotToMIDI, modifyMIDI } from "./midi_tools/midi_editor.js";
import { writeRMIDI } from "./midi_tools/rmidi_writer.js";
import { getUsedProgramsAndKeys } from "./midi_tools/used_keys_loaded.js";
import { IndexedByteArray } from "../utils/indexed_array.js";
import { getNoteTimes } from "./midi_tools/get_note_times.js";

/**
 * BasicMIDI is the base of a complete MIDI file, used by the sequencer internally.
 * BasicMIDI is not available on the main thread, as it contains the actual track data which can be large.
 * It can be accessed by calling getMIDI() on the Sequencer.
 */
class BasicMIDI extends MIDISequenceData
{
    
    /**
     * The embedded soundfont in the MIDI file, represented as an ArrayBuffer, if available.
     * @type {ArrayBuffer|undefined}
     */
    embeddedSoundFont = undefined;
    
    /**
     * The actual track data of the MIDI file, represented as an array of tracks.
     * Tracks are arrays of MIDIMessage objects.
     * @type {MIDIMessage[][]}
     */
    tracks = [];
    
    /**
     * If the MIDI file is a DLS RMIDI file.
     * @type {boolean}
     */
    isDLSRMIDI = false;
    
    /**
     * Copies a MIDI
     * @param mid {BasicMIDI}
     * @returns {BasicMIDI}
     */
    static copyFrom(mid)
    {
        const m = new BasicMIDI();
        m._copyFromSequence(mid);
        
        m.isDLSRMIDI = mid.isDLSRMIDI;
        m.embeddedSoundFont = mid.embeddedSoundFont ? mid.embeddedSoundFont.slice(0) : undefined; // Deep copy
        m.tracks = mid.tracks.map(track => [...track]); // Shallow copy of each track array
        
        return m;
    }
    
    /**
     * Parses internal MIDI values
     * @protected
     */
    _parseInternal()
    {
        SpessaSynthGroup(
            "%cInterpreting MIDI events...",
            consoleColors.info
        );
        /**
         * For karaoke files, text events starting with @T are considered titles,
         * usually the first one is the title, and the latter is things such as "sequenced by" etc.
         * @type {boolean}
         */
        let karaokeHasTitle = false;
        
        this.keyRange = { max: 0, min: 127 };
        
        /**
         * Will be joined with "\n" to form the final string
         * @type {string[]}
         */
        let copyrightComponents = [];
        let copyrightDetected = false;
        if (typeof this.RMIDInfo["ICOP"] !== "undefined")
        {
            // if RMIDI has copyright info, don't try to detect one.
            copyrightDetected = true;
        }
        
        
        let nameDetected = false;
        if (typeof this.RMIDInfo["INAM"] !== "undefined")
        {
            // same as with copyright
            nameDetected = true;
        }
        
        // loop tracking
        let loopStart = null;
        let loopEnd = null;
        
        for (let i = 0; i < this.tracks.length; i++)
        {
            /**
             * @type {MIDIMessage[]}
             */
            const track = this.tracks[i];
            const usedChannels = new Set();
            let trackHasVoiceMessages = false;
            
            for (const e of track)
            {
                // check if it's a voice message
                if (e.messageStatusByte >= 0x80 && e.messageStatusByte < 0xF0)
                {
                    trackHasVoiceMessages = true;
                    // voice messages are 7-bit always
                    for (let j = 0; j < e.messageData.length; j++)
                    {
                        e.messageData[j] = Math.min(127, e.messageData[j]);
                    }
                    // last voice event tick
                    if (e.ticks > this.lastVoiceEventTick)
                    {
                        this.lastVoiceEventTick = e.ticks;
                    }
                    
                    // interpret the voice message
                    switch (e.messageStatusByte & 0xF0)
                    {
                        // cc change: loop points
                        case messageTypes.controllerChange:
                            switch (e.messageData[0])
                            {
                                case 2:
                                case 116:
                                    loopStart = e.ticks;
                                    break;
                                
                                case 4:
                                case 117:
                                    if (loopEnd === null)
                                    {
                                        loopEnd = e.ticks;
                                    }
                                    else
                                    {
                                        // this controller has occurred more than once;
                                        // this means
                                        // that it doesn't indicate the loop
                                        loopEnd = 0;
                                    }
                                    break;
                                
                                case 0:
                                    // check RMID
                                    if (this.isDLSRMIDI && e.messageData[1] !== 0 && e.messageData[1] !== 127)
                                    {
                                        SpessaSynthInfo(
                                            "%cDLS RMIDI with offset 1 detected!",
                                            consoleColors.recognized
                                        );
                                        this.bankOffset = 1;
                                    }
                            }
                            break;
                        
                        // note on: used notes tracking and key range
                        case messageTypes.noteOn:
                            usedChannels.add(e.messageStatusByte & 0x0F);
                            const note = e.messageData[0];
                            this.keyRange.min = Math.min(this.keyRange.min, note);
                            this.keyRange.max = Math.max(this.keyRange.max, note);
                            break;
                    }
                }
                e.messageData.currentIndex = 0;
                const eventText = readBytesAsString(e.messageData, e.messageData.length);
                e.messageData.currentIndex = 0;
                // interpret the message
                switch (e.messageStatusByte)
                {
                    case messageTypes.setTempo:
                        // add the tempo change
                        e.messageData.currentIndex = 0;
                        this.tempoChanges.push({
                            ticks: e.ticks,
                            tempo: 60000000 / readBytesAsUintBigEndian(e.messageData, 3)
                        });
                        e.messageData.currentIndex = 0;
                        break;
                    
                    case messageTypes.marker:
                        // check for loop markers
                        const text = eventText.trim().toLowerCase();
                        switch (text)
                        {
                            default:
                                break;
                            
                            case "start":
                            case "loopstart":
                                loopStart = e.ticks;
                                break;
                            
                            case "loopend":
                                loopEnd = e.ticks;
                        }
                        e.messageData.currentIndex = 0;
                        break;
                    
                    case messageTypes.copyright:
                        if (!copyrightDetected)
                        {
                            e.messageData.currentIndex = 0;
                            copyrightComponents.push(readBytesAsString(
                                e.messageData,
                                e.messageData.length,
                                undefined,
                                false
                            ));
                            e.messageData.currentIndex = 0;
                        }
                        break;
                    
                    case messageTypes.lyric:
                        // note here: .kar files sometimes just use...
                        // lyrics instead of text because why not (of course)
                        // perform the same check for @KMIDI KARAOKE FILE
                        if (eventText.trim().startsWith("@KMIDI KARAOKE FILE"))
                        {
                            this.isKaraokeFile = true;
                            SpessaSynthInfo("%cKaraoke MIDI detected!", consoleColors.recognized);
                        }
                        
                        if (this.isKaraokeFile)
                        {
                            // replace the type of the message with text
                            e.messageStatusByte = messageTypes.text;
                        }
                        else
                        {
                            // add lyrics like a regular midi file
                            this.lyrics.push(e.messageData);
                            this.lyricsTicks.push(e.ticks);
                            break;
                        }
                    
                    // kar: treat the same as text
                    // fallthrough
                    case messageTypes.text:
                        // possibly Soft Karaoke MIDI file
                        // it has a text event at the start of the file
                        // "@KMIDI KARAOKE FILE"
                        const checkedText = eventText.trim();
                        if (checkedText.startsWith("@KMIDI KARAOKE FILE"))
                        {
                            this.isKaraokeFile = true;
                            
                            SpessaSynthInfo("%cKaraoke MIDI detected!", consoleColors.recognized);
                        }
                        else if (this.isKaraokeFile)
                        {
                            // check for @T (title)
                            // or @A because it is a title too sometimes?
                            // IDK it's strange
                            if (checkedText.startsWith("@T") || checkedText.startsWith("@A"))
                            {
                                if (!karaokeHasTitle)
                                {
                                    this.midiName = checkedText.substring(2).trim();
                                    karaokeHasTitle = true;
                                    nameDetected = true;
                                    // encode to rawMidiName
                                    this.rawMidiName = getStringBytes(this.midiName);
                                }
                                else
                                {
                                    // append to copyright
                                    copyrightComponents.push(checkedText.substring(2).trim());
                                }
                            }
                            else if (checkedText[0] !== "@")
                            {
                                // non @: the lyrics
                                this.lyrics.push(sanitizeKarLyrics(e.messageData));
                                this.lyricsTicks.push(e.ticks);
                            }
                        }
                        break;
                    
                    case messageTypes.trackName:
                        break;
                }
            }
            // add used channels
            this.usedChannelsOnTrack.push(usedChannels);
            
            // track name
            this.trackNames[i] = "";
            const trackName = track.find(e => e.messageStatusByte === messageTypes.trackName);
            if (trackName)
            {
                trackName.messageData.currentIndex = 0;
                const name = readBytesAsString(trackName.messageData, trackName.messageData.length);
                this.trackNames[i] = name;
                // If the track has no voice messages, its "track name" event (if it has any)
                // is some metadata.
                // Add it to copyright
                if (!trackHasVoiceMessages)
                {
                    copyrightComponents.push(name);
                }
            }
        }
        
        // reverse the tempo changes
        this.tempoChanges.reverse();
        
        SpessaSynthInfo(
            `%cCorrecting loops, ports and detecting notes...`,
            consoleColors.info
        );
        
        const firstNoteOns = [];
        for (const t of this.tracks)
        {
            const firstNoteOn = t.find(e => (e.messageStatusByte & 0xF0) === messageTypes.noteOn);
            if (firstNoteOn)
            {
                firstNoteOns.push(firstNoteOn.ticks);
            }
        }
        this.firstNoteOn = Math.min(...firstNoteOns);
        
        SpessaSynthInfo(
            `%cFirst note-on detected at: %c${this.firstNoteOn}%c ticks!`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info
        );
        
        
        if (loopStart !== null && loopEnd === null)
        {
            // not a loop
            loopStart = this.firstNoteOn;
            loopEnd = this.lastVoiceEventTick;
        }
        else
        {
            if (loopStart === null)
            {
                loopStart = this.firstNoteOn;
            }
            
            if (loopEnd === null || loopEnd === 0)
            {
                loopEnd = this.lastVoiceEventTick;
            }
        }
        
        /**
         *
         * @type {{start: number, end: number}}
         */
        this.loop = { start: loopStart, end: loopEnd };
        
        SpessaSynthInfo(
            `%cLoop points: start: %c${this.loop.start}%c end: %c${this.loop.end}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized
        );
        
        // determine ports
        let portOffset = 0;
        this.midiPorts = [];
        this.midiPortChannelOffsets = [];
        for (let trackNum = 0; trackNum < this.tracks.length; trackNum++)
        {
            this.midiPorts.push(-1);
            if (this.usedChannelsOnTrack[trackNum].size === 0)
            {
                continue;
            }
            for (const e of this.tracks[trackNum])
            {
                if (e.messageStatusByte !== messageTypes.midiPort)
                {
                    continue;
                }
                const port = e.messageData[0];
                this.midiPorts[trackNum] = port;
                if (this.midiPortChannelOffsets[port] === undefined)
                {
                    this.midiPortChannelOffsets[port] = portOffset;
                    portOffset += 16;
                }
            }
        }
        
        // fix midi ports:
        // midi tracks without ports will have a value of -1
        // if all ports have a value of -1, set it to 0,
        // otherwise take the first midi port and replace all -1 with it,
        // why would we do this?
        // some midis (for some reason) specify all channels to port 1 or else,
        // but leave the conductor track with no port pref.
        // this spessasynth to reserve the first 16 channels for the conductor track
        // (which doesn't play anything) and use the additional 16 for the actual ports.
        let defaultPort = Infinity;
        for (let port of this.midiPorts)
        {
            if (port !== -1)
            {
                if (defaultPort > port)
                {
                    defaultPort = port;
                }
            }
        }
        if (defaultPort === Infinity)
        {
            defaultPort = 0;
        }
        this.midiPorts = this.midiPorts.map(port => port === -1 ? defaultPort : port);
        // add fake port if empty
        if (this.midiPortChannelOffsets.length === 0)
        {
            this.midiPortChannelOffsets = [0];
        }
        if (this.midiPortChannelOffsets.length < 2)
        {
            SpessaSynthInfo(`%cNo additional MIDI Ports detected.`, consoleColors.info);
        }
        else
        {
            this.isMultiPort = true;
            SpessaSynthInfo(`%cMIDI Ports detected!`, consoleColors.recognized);
        }
        
        // midi name
        if (!nameDetected)
        {
            if (this.tracks.length > 1)
            {
                // if more than 1 track and the first track has no notes,
                // just find the first trackName in the first track.
                if (
                    this.tracks[0].find(
                        message => message.messageStatusByte >= messageTypes.noteOn
                            &&
                            message.messageStatusByte < messageTypes.polyPressure
                    ) === undefined
                )
                {
                    
                    let name = this.tracks[0].find(message => message.messageStatusByte === messageTypes.trackName);
                    if (name)
                    {
                        this.rawMidiName = name.messageData;
                        name.messageData.currentIndex = 0;
                        this.midiName = readBytesAsString(name.messageData, name.messageData.length, undefined, false);
                    }
                }
            }
            else
            {
                // if only 1 track, find the first "track name" event
                let name = this.tracks[0].find(message => message.messageStatusByte === messageTypes.trackName);
                if (name)
                {
                    this.rawMidiName = name.messageData;
                    name.messageData.currentIndex = 0;
                    this.midiName = readBytesAsString(name.messageData, name.messageData.length, undefined, false);
                }
            }
        }
        
        if (!copyrightDetected)
        {
            this.copyright = copyrightComponents
                // trim and group newlines into one
                .map(c => c.trim().replace(/(\r?\n)+/g, "\n"))
                // remove empty strings
                .filter(c => c.length > 0)
                // join with newlines
                .join("\n") || "";
        }
        
        this.midiName = this.midiName.trim();
        this.midiNameUsesFileName = false;
        // if midiName is "", use the file name
        if (this.midiName.length === 0)
        {
            SpessaSynthInfo(
                `%cNo name detected. Using the alt name!`,
                consoleColors.info
            );
            this.midiName = formatTitle(this.fileName);
            this.midiNameUsesFileName = true;
            // encode it too
            this.rawMidiName = new Uint8Array(this.midiName.length);
            for (let i = 0; i < this.midiName.length; i++)
            {
                this.rawMidiName[i] = this.midiName.charCodeAt(i);
            }
        }
        else
        {
            SpessaSynthInfo(
                `%cMIDI Name detected! %c"${this.midiName}"`,
                consoleColors.info,
                consoleColors.recognized
            );
        }
        
        // if the first event is not at 0 ticks, add a track name
        // https://github.com/spessasus/SpessaSynth/issues/145
        if (!this.tracks.some(t => t[0].ticks === 0))
        {
            const track = this.tracks[0];
            // can copy
            track.unshift(new MIDIMessage(
                0,
                messageTypes.trackName,
                new IndexedByteArray(this.rawMidiName.buffer)
            ));
        }
        
        
        /**
         * The total playback time, in seconds
         * @type {number}
         */
        this.duration = this.MIDIticksToSeconds(this.lastVoiceEventTick);
        
        SpessaSynthInfo("%cSuccess!", consoleColors.recognized);
        SpessaSynthGroupEnd();
    }
    
    /**
     * Updates all internal values
     */
    flush()
    {
        
        for (const t of this.tracks)
        {
            // sort the track by ticks
            t.sort((e1, e2) => e1.ticks - e2.ticks);
        }
        this._parseInternal();
    }
}

BasicMIDI.prototype.writeMIDI = writeMIDI;
BasicMIDI.prototype.modifyMIDI = modifyMIDI;
BasicMIDI.prototype.applySnapshotToMIDI = applySnapshotToMIDI;
BasicMIDI.prototype.writeRMIDI = writeRMIDI;
BasicMIDI.prototype.getUsedProgramsAndKeys = getUsedProgramsAndKeys;
BasicMIDI.prototype.getNoteTimes = getNoteTimes;

export { BasicMIDI };