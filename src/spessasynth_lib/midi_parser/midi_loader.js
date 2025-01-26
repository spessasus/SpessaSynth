import { dataBytesAmount, getChannel, messageTypes, MidiMessage } from "./midi_message.js";
import { IndexedByteArray } from "../utils/indexed_array.js";
import { consoleColors, formatTitle, sanitizeKarLyrics } from "../utils/other.js";
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthWarn } from "../utils/loggin.js";
import { readRIFFChunk } from "../soundfont/basic_soundfont/riff_chunk.js";
import { readVariableLengthQuantity } from "../utils/byte_functions/variable_length_quantity.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";
import { getStringBytes, readBytesAsString } from "../utils/byte_functions/string.js";
import { readLittleEndian } from "../utils/byte_functions/little_endian.js";
import { RMIDINFOChunks } from "./rmidi_writer.js";
import { BasicMIDI, MIDIticksToSeconds } from "./basic_midi.js";

/**
 * midi_loader.js
 * purpose: parses a midi file for the seqyencer, including things like marker or CC 2/4 loop detection, copyright detection etc.
 */

/**
 * The MIDI class is a MIDI file parser that reads a MIDI file and extracts all the necessary information from it.
 * Supported formats are .mid and .rmi files.
 */
class MIDI extends BasicMIDI
{
    /**
     * Parses a given midi file
     * @param arrayBuffer {ArrayBuffer}
     * @param fileName {string} optional, replaces the decoded title if empty
     */
    constructor(arrayBuffer, fileName = "")
    {
        super();
        SpessaSynthGroupCollapsed(`%cParsing MIDI File...`, consoleColors.info);
        const binaryData = new IndexedByteArray(arrayBuffer);
        let fileByteArray;
        
        // check for rmid
        let copyrightDetected = false;
        
        let nameDetected = false;
        
        let DLSRMID = false;
        
        /**
         * Will be joined with "\n" to form the final string
         * @type {string[]}
         */
        let copyrightComponents = [];
        
        const initialString = readBytesAsString(binaryData, 4);
        binaryData.currentIndex -= 4;
        if (initialString === "RIFF")
        {
            // possibly an RMID file (https://github.com/spessasus/sf2-rmidi-specification#readme)
            // skip size
            binaryData.currentIndex += 8;
            const rmid = readBytesAsString(binaryData, 4, undefined, false);
            if (rmid !== "RMID")
            {
                SpessaSynthGroupEnd();
                throw new SyntaxError(`Invalid RMIDI Header! Expected "RMID", got "${rmid}"`);
            }
            const riff = readRIFFChunk(binaryData);
            if (riff.header !== "data")
            {
                SpessaSynthGroupEnd();
                throw new SyntaxError(`Invalid RMIDI Chunk header! Expected "data", got "${rmid}"`);
            }
            // this is an rmid, load the midi into array for parsing
            fileByteArray = riff.chunkData;
            
            // keep loading chunks until we get sfbk
            while (binaryData.currentIndex <= binaryData.length)
            {
                const startIndex = binaryData.currentIndex;
                const currentChunk = readRIFFChunk(binaryData, true);
                if (currentChunk.header === "RIFF")
                {
                    const type = readBytesAsString(currentChunk.chunkData, 4).toLowerCase();
                    if (type === "sfbk" || type === "sfpk" || type === "dls ")
                    {
                        SpessaSynthInfo("%cFound embedded soundfont!", consoleColors.recognized);
                        this.embeddedSoundFont = binaryData.slice(startIndex, startIndex + currentChunk.size).buffer;
                    }
                    else
                    {
                        SpessaSynthWarn(`Unknown RIFF chunk: "${type}"`);
                    }
                    if (type === "dls ")
                    {
                        // assume bank offset of 0 by default. If we find any bank selects, then the offset is 1.
                        DLSRMID = true;
                    }
                }
                else if (currentChunk.header === "LIST")
                {
                    const type = readBytesAsString(currentChunk.chunkData, 4);
                    if (type === "INFO")
                    {
                        SpessaSynthInfo("%cFound RMIDI INFO chunk!", consoleColors.recognized);
                        this.RMIDInfo = {};
                        while (currentChunk.chunkData.currentIndex <= currentChunk.size)
                        {
                            const infoChunk = readRIFFChunk(currentChunk.chunkData, true);
                            this.RMIDInfo[infoChunk.header] = infoChunk.chunkData;
                        }
                        if (this.RMIDInfo["ICOP"])
                        {
                            // special case, overwrites the copyright components array
                            copyrightDetected = true;
                            this.copyright = readBytesAsString(
                                this.RMIDInfo["ICOP"],
                                this.RMIDInfo["ICOP"].length,
                                undefined,
                                false
                            ).replaceAll("\n", " ");
                        }
                        if (this.RMIDInfo["INAM"])
                        {
                            this.rawMidiName = this.RMIDInfo[RMIDINFOChunks.name];
                            this.midiName = readBytesAsString(
                                this.rawMidiName,
                                this.rawMidiName.length,
                                undefined,
                                false
                            ).replaceAll("\n", " ");
                            nameDetected = true;
                        }
                        // these can be used interchangeably
                        if (this.RMIDInfo["IALB"] && !this.RMIDInfo["IPRD"])
                        {
                            this.RMIDInfo["IPRD"] = this.RMIDInfo["IALB"];
                        }
                        if (this.RMIDInfo["PRD"] && !this.RMIDInfo["IALB"])
                        {
                            this.RMIDInfo["IALB"] = this.RMIDInfo["IPRD"];
                        }
                        this.bankOffset = 1; // defaults to 1
                        if (this.RMIDInfo[RMIDINFOChunks.bankOffset])
                        {
                            this.bankOffset = readLittleEndian(this.RMIDInfo[RMIDINFOChunks.bankOffset], 2);
                        }
                    }
                }
            }
            
            if (DLSRMID)
            {
                // assume bank offset of 0 by default. If we find any bank selects, then the offset is 1.
                this.bankOffset = 0;
            }
        }
        else
        {
            fileByteArray = binaryData;
        }
        const headerChunk = this.readMIDIChunk(fileByteArray);
        if (headerChunk.type !== "MThd")
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`Invalid MIDI Header! Expected "MThd", got "${headerChunk.type}"`);
        }
        
        if (headerChunk.size !== 6)
        {
            SpessaSynthGroupEnd();
            throw new RangeError(`Invalid MIDI header chunk size! Expected 6, got ${headerChunk.size}`);
        }
        
        // format
        this.format = readBytesAsUintBigEndian(headerChunk.data, 2);
        // tracks count
        this.tracksAmount = readBytesAsUintBigEndian(headerChunk.data, 2);
        // time division
        this.timeDivision = readBytesAsUintBigEndian(headerChunk.data, 2);
        
        /**
         * The MIDI's key range
         * @type {{min: number, max: number}}
         */
        this.keyRange = { min: 127, max: 0 };
        
        /**
         * Contains the lyrics as binary chunks
         * @type {Uint8Array[]}
         */
        this.lyrics = [];
        
        /**
         * Contains all the tempo changes in the file. (Ordered from last to first)
         * @type {{
         *     ticks: number,
         *     tempo: number
         * }[]}
         */
        this.tempoChanges = [{ ticks: 0, tempo: 120 }];
        
        let loopStart = null;
        let loopEnd = null;
        
        /**
         * For karaoke files, text events starting with @T are considered titles
         * usually the first one is the title, and the latter are things such as "sequenced by" etc.
         * @type {boolean}
         */
        let karaokeHasTitle = false;
        
        this.lastVoiceEventTick = 0;
        
        /**
         * Midi port numbers for each tracks
         * @type {number[]}
         */
        this.midiPorts = [];
        
        let portOffset = 0;
        /**
         * Channel offsets for each port, using the SpessaSynth method
         * @type {number[]}
         */
        this.midiPortChannelOffsets = [];
        
        /**
         * All channels that each track uses. Note: these channels range from 0 to 15, excluding the port offsets!
         * @type {Set<number>[]}
         */
        this.usedChannelsOnTrack = [];
        
        /**
         * Read all the tracks
         * @type {MidiMessage[][]}
         */
        this.tracks = [];
        for (let i = 0; i < this.tracksAmount; i++)
        {
            /**
             * @type {MidiMessage[]}
             */
            const track = [];
            const trackChunk = this.readMIDIChunk(fileByteArray);
            const usedChannels = new Set();
            this.midiPorts.push(-1);
            
            if (trackChunk.type !== "MTrk")
            {
                SpessaSynthGroupEnd();
                throw new SyntaxError(`Invalid track header! Expected "MTrk" got "${trackChunk.type}"`);
            }
            
            let trackHasVoiceMessages = false;
            
            /**
             * MIDI running byte
             * @type {number}
             */
            let runningByte = undefined;
            
            let totalTicks = 0;
            // format 2 plays sequentially
            if (this.format === 2 && i > 0)
            {
                totalTicks += this.tracks[i - 1][this.tracks[i - 1].length - 1].ticks;
            }
            // loop until we reach the end of track
            while (trackChunk.data.currentIndex < trackChunk.size)
            {
                totalTicks += readVariableLengthQuantity(trackChunk.data);
                
                // check if the status byte is valid (IE. larger than 127)
                const statusByteCheck = trackChunk.data[trackChunk.data.currentIndex];
                
                let statusByte;
                // if we have a running byte and the status byte isn't valid
                if (runningByte !== undefined && statusByteCheck < 0x80)
                {
                    statusByte = runningByte;
                }
                else if (!runningByte && statusByteCheck < 0x80)
                {
                    // if we don't have a running byte and the status byte isn't valid, it's an error.
                    SpessaSynthGroupEnd();
                    throw new SyntaxError(`Unexpected byte with no running byte. (${statusByteCheck})`);
                }
                else
                {
                    // if the status byte is valid, just use that
                    statusByte = trackChunk.data[trackChunk.data.currentIndex++];
                }
                const statusByteChannel = getChannel(statusByte);
                
                let eventDataLength;
                
                // determine the message's length;
                switch (statusByteChannel)
                {
                    case -1:
                        // system common/realtime (no length)
                        eventDataLength = 0;
                        break;
                    
                    case -2:
                        // meta (the next is the actual status byte)
                        statusByte = trackChunk.data[trackChunk.data.currentIndex++];
                        eventDataLength = readVariableLengthQuantity(trackChunk.data);
                        break;
                    
                    case -3:
                        // sysex
                        eventDataLength = readVariableLengthQuantity(trackChunk.data);
                        break;
                    
                    default:
                        // voice message
                        // get the midi message length
                        if (totalTicks > this.lastVoiceEventTick)
                        {
                            this.lastVoiceEventTick = totalTicks;
                        }
                        eventDataLength = dataBytesAmount[statusByte >> 4];
                        if ((statusByte & 0xF0) === messageTypes.noteOn)
                        {
                            usedChannels.add(statusByteChannel);
                            const note = trackChunk.data[trackChunk.data.currentIndex];
                            this.keyRange.min = Math.min(this.keyRange.min, note);
                            this.keyRange.max = Math.max(this.keyRange.max, note);
                        }
                        
                        // save the status byte
                        runningByte = statusByte;
                        break;
                }
                
                // put the event data into the array
                const eventData = new IndexedByteArray(eventDataLength);
                const messageData = trackChunk.data.slice(
                    trackChunk.data.currentIndex,
                    trackChunk.data.currentIndex + eventDataLength
                );
                trackChunk.data.currentIndex += eventDataLength;
                eventData.set(messageData, 0);
                
                const message = new MidiMessage(totalTicks, statusByte, eventData);
                track.push(message);
                
                switch (statusByteChannel)
                {
                    case -2:
                        // since this is a meta message
                        const eventText = readBytesAsString(eventData, eventData.length);
                        switch (statusByte)
                        {
                            case messageTypes.setTempo:
                                // add the tempo change
                                this.tempoChanges.push({
                                    ticks: totalTicks,
                                    tempo: 60000000 / readBytesAsUintBigEndian(messageData, 3)
                                });
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
                                        loopStart = totalTicks;
                                        break;
                                    
                                    case "loopend":
                                        loopEnd = totalTicks;
                                }
                                eventData.currentIndex = 0;
                                break;
                            
                            case messageTypes.midiPort:
                                const port = eventData[0];
                                this.midiPorts[i] = port;
                                if (this.midiPortChannelOffsets[port] === undefined)
                                {
                                    this.midiPortChannelOffsets[port] = portOffset;
                                    portOffset += 16;
                                }
                                break;
                            
                            case messageTypes.copyright:
                                if (!copyrightDetected)
                                {
                                    
                                    eventData.currentIndex = 0;
                                    copyrightComponents.push(readBytesAsString(
                                        eventData,
                                        eventData.length,
                                        undefined,
                                        false
                                    ));
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
                                    message.messageStatusByte = messageTypes.text;
                                    statusByte = messageTypes.text;
                                }
                                else
                                {
                                    // add lyrics like a regular midi file
                                    this.lyrics.push(eventData);
                                    this.lyricsTicks.push(totalTicks);
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
                                    // or @A because it is a title too sometimes??? idk it's weird
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
                                        this.lyrics.push(sanitizeKarLyrics(eventData));
                                        this.lyricsTicks.push(totalTicks);
                                    }
                                }
                                break;
                        }
                        break;
                    
                    case -3:
                        // since this is a sysex message, do nothing
                        break;
                    
                    
                    default:
                        // since this is a voice message
                        // check for loop (CC 2/4)
                        trackHasVoiceMessages = true;
                        if ((statusByte & 0xF0) === messageTypes.controllerChange)
                        {
                            switch (eventData[0])
                            {
                                case 2:
                                case 116:
                                    loopStart = totalTicks;
                                    break;
                                
                                case 4:
                                case 117:
                                    if (loopEnd === null)
                                    {
                                        loopEnd = totalTicks;
                                    }
                                    else
                                    {
                                        // this controller has occured more than once, this means that it doesnt indicate the loop
                                        loopEnd = 0;
                                    }
                                    break;
                                
                                case 0:
                                    // check RMID
                                    if (DLSRMID && eventData[1] !== 0 && eventData[1] !== 127)
                                    {
                                        SpessaSynthInfo(
                                            "%cDLS RMIDI with offset 1 detected!",
                                            consoleColors.recognized
                                        );
                                        this.bankOffset = 1;
                                    }
                            }
                        }
                }
            }
            this.tracks.push(track);
            this.usedChannelsOnTrack.push(usedChannels);
            
            // if the track has no voice messages, its "track name" event (if it has any)
            // is some metadata. Add it to copyright
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
            
            SpessaSynthInfo(
                `%cParsed %c${this.tracks.length}%c / %c${this.tracksAmount}`,
                consoleColors.info,
                consoleColors.value,
                consoleColors.info,
                consoleColors.value
            );
        }
        
        SpessaSynthInfo(
            `%cAll tracks parsed correctly!`,
            consoleColors.recognized
        );
        
        SpessaSynthGroupCollapsed(
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
        
        // fix midi ports:
        // midi tracks without ports will have a value of -1
        // if all ports have a value of -1, set it to 0, otherwise take the first midi port and replace all -1 with it
        // why do this? some midis (for some reason) specify all channels to port 1 or else, but leave the conductor track with no port pref.
        // this spessasynth to reserve the first 16 channels for the conductor track (which doesn't play anything) and use additional 16 for the actual ports.
        let defaultPort = 0;
        for (let port of this.midiPorts)
        {
            if (port !== -1)
            {
                defaultPort = port;
                break;
            }
        }
        this.midiPorts = this.midiPorts.map(port => port === -1 ? defaultPort : port);
        // add dummy port if empty
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
                // if more than 1 track and the first track has no notes, just find the first trackName in the first track
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
        
        this.fileName = fileName;
        this.midiName = this.midiName.trim();
        this.midiNameUsesFileName = false;
        // if midiName is "", use the file name
        if (this.midiName.length === 0)
        {
            SpessaSynthInfo(
                `%cNo name detected. Using the alt name!`,
                consoleColors.info
            );
            this.midiName = formatTitle(fileName);
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
                // one exception: hyphens at the end. Don't add a space to them
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
        
        
        // reverse the tempo changes
        this.tempoChanges.reverse();
        
        /**
         * The total playback time, in seconds
         * @type {number}
         */
        this.duration = MIDIticksToSeconds(this.lastVoiceEventTick, this);
        
        SpessaSynthGroupEnd();
        SpessaSynthInfo(
            `%cMIDI file parsed. Total tick time: %c${this.lastVoiceEventTick}%c, total seconds time: %c${this.duration}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized
        );
        SpessaSynthGroupEnd();
    }
    
    /**
     * @param fileByteArray {IndexedByteArray}
     * @returns {{type: string, size: number, data: IndexedByteArray}}
     */
    readMIDIChunk(fileByteArray)
    {
        const chunk = {};
        // type
        chunk.type = readBytesAsString(fileByteArray, 4);
        // size
        chunk.size = readBytesAsUintBigEndian(fileByteArray, 4);
        // data
        chunk.data = new IndexedByteArray(chunk.size);
        const dataSlice = fileByteArray.slice(fileByteArray.currentIndex, fileByteArray.currentIndex + chunk.size);
        chunk.data.set(dataSlice, 0);
        fileByteArray.currentIndex += chunk.size;
        return chunk;
    }
}

export { MIDI };