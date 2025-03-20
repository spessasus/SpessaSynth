import { MIDISequenceData } from "./midi_sequence.js";
import { getStringBytes, readBytesAsString } from "../utils/byte_functions/string.js";
import { messageTypes } from "./midi_message.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from "../utils/loggin.js";
import { consoleColors, formatTitle, sanitizeKarLyrics } from "../utils/other.js";

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
        m.isDLSRMIDI = mid.isDLSRMIDI;
        
        // Copying arrays
        m.tempoChanges = [...mid.tempoChanges]; // Shallow copy
        m.lyrics = mid.lyrics.map(arr => new Uint8Array(arr)); // Deep copy of each binary chunk
        m.lyricsTicks = [...mid.lyricsTicks]; // Shallow copy
        m.midiPorts = [...mid.midiPorts]; // Shallow copy
        m.midiPortChannelOffsets = [...mid.midiPortChannelOffsets]; // Shallow copy
        m.usedChannelsOnTrack = mid.usedChannelsOnTrack.map(set => new Set(set)); // Deep copy
        m.rawMidiName = mid.rawMidiName ? new Uint8Array(mid.rawMidiName) : undefined; // Deep copy
        m.embeddedSoundFont = mid.embeddedSoundFont ? mid.embeddedSoundFont.slice(0) : undefined; // Deep copy
        
        // Copying RMID Info object (deep copy)
        m.RMIDInfo = { ...mid.RMIDInfo };
        
        // Copying track data (deep copy of each track)
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
                }
            }
            // add used channels
            this.usedChannelsOnTrack.push(usedChannels);
            
            // If the track has no voice messages, its "track name" event (if it has any)
            // is some metadata.
            // Add it to copyright
            if (!trackHasVoiceMessages)
            {
                const trackName = track.find(e => e.messageStatusByte === messageTypes.trackName);
                if (trackName)
                {
                    trackName.messageData.currentIndex = 0;
                    const name = readBytesAsString(trackName.messageData, trackName.messageData.length);
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
        
        // lyrics fix:
        // sometimes, all lyrics events lack spaces at the start or end of the lyric
        // then, and only then, add space at the end of each lyric
        // space ASCII is 32
        let lacksSpaces = true;
        for (const lyric of this.lyrics)
        {
            if (lyric[0] === 32 || lyric[lyric.length - 1] === 32)
            {
                lacksSpaces = false;
                break;
            }
        }
        
        if (lacksSpaces)
        {
            this.lyrics = this.lyrics.map(lyric =>
            {
                // One exception: hyphens at the end. Don't add a space to them
                if (lyric[lyric.length - 1] === 45)
                {
                    return lyric;
                }
                const withSpaces = new Uint8Array(lyric.length + 1);
                withSpaces.set(lyric, 0);
                withSpaces[lyric.length] = 32;
                return withSpaces;
            });
        }
        /**
         * The total playback time, in seconds
         * @type {number}
         */
        this.duration = MIDIticksToSeconds(this.lastVoiceEventTick, this);
        
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
        // tempo changes are reversed, so the first element is the last tempo change
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