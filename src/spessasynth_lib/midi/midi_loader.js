import { dataBytesAmount, getChannel, MIDIMessage } from "./midi_message.js";
import { IndexedByteArray } from "../utils/indexed_array.js";
import { consoleColors } from "../utils/other.js";
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthWarn } from "../utils/loggin.js";
import { readRIFFChunk } from "../soundfont/basic_soundfont/riff_chunk.js";
import { readVariableLengthQuantity } from "../utils/byte_functions/variable_length_quantity.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";
import { readBytesAsString } from "../utils/byte_functions/string.js";
import { readLittleEndian } from "../utils/byte_functions/little_endian.js";
import { RMIDINFOChunks } from "./midi_tools/rmidi_writer.js";
import { BasicMIDI } from "./basic_midi.js";
import { loadXMF } from "./xmf_loader.js";

/**
 * midi_loader.js
 * purpose:
 * parses a midi file for the seqyencer,
 * including things like marker or CC 2/4 loop detection, copyright detection, etc.
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
        this.fileName = fileName;
        const binaryData = new IndexedByteArray(arrayBuffer);
        let fileByteArray;
        
        // check for rmid
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
            // this is a rmid, load the midi into an array for parsing
            fileByteArray = riff.chunkData;
            
            // keep loading chunks until we get the "SFBK" header
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
                        // Assume bank offset of 0 by default. If we find any bank selects, then the offset is 1.
                        this.isDLSRMIDI = true;
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
                            // noinspection JSCheckFunctionSignatures
                            this.midiName = readBytesAsString(
                                this.rawMidiName,
                                this.rawMidiName.length,
                                undefined,
                                false
                            ).replaceAll("\n", " ");
                        }
                        // these can be used interchangeably
                        if (this.RMIDInfo["IALB"] && !this.RMIDInfo["IPRD"])
                        {
                            this.RMIDInfo["IPRD"] = this.RMIDInfo["IALB"];
                        }
                        if (this.RMIDInfo["IPRD"] && !this.RMIDInfo["IALB"])
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
            
            if (this.isDLSRMIDI)
            {
                // Assume bank offset of 0 by default. If we find any bank selects, then the offset is 1.
                this.bankOffset = 0;
            }
            
            // if no embedded bank, assume 0
            if (this.embeddedSoundFont === undefined)
            {
                this.bankOffset = 0;
            }
        }
        else if (initialString === "XMF_")
        {
            // XMF file
            fileByteArray = loadXMF(this, binaryData);
        }
        else
        {
            fileByteArray = binaryData;
        }
        const headerChunk = this._readMIDIChunk(fileByteArray);
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
        // read all the tracks
        for (let i = 0; i < this.tracksAmount; i++)
        {
            /**
             * @type {MIDIMessage[]}
             */
            const track = [];
            const trackChunk = this._readMIDIChunk(fileByteArray);
            
            if (trackChunk.type !== "MTrk")
            {
                SpessaSynthGroupEnd();
                throw new SyntaxError(`Invalid track header! Expected "MTrk" got "${trackChunk.type}"`);
            }
            
            
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
                else
                { // noinspection PointlessBooleanExpressionJS
                    if (runningByte === undefined && statusByteCheck < 0x80)
                    {
                        // if we don't have a running byte and the status byte isn't valid, it's an error.
                        SpessaSynthGroupEnd();
                        throw new SyntaxError(`Unexpected byte with no running byte. (${statusByteCheck})`);
                    }
                    else
                    {
                        // if the status byte is valid, use that
                        statusByte = trackChunk.data[trackChunk.data.currentIndex++];
                    }
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
                        // gets the midi message length
                        eventDataLength = dataBytesAmount[statusByte >> 4];
                        // save the status byte
                        runningByte = statusByte;
                        break;
                }
                
                // put the event data into the array
                const eventData = new IndexedByteArray(eventDataLength);
                eventData.set(trackChunk.data.slice(
                    trackChunk.data.currentIndex,
                    trackChunk.data.currentIndex + eventDataLength
                ), 0);
                const event = new MIDIMessage(totalTicks, statusByte, eventData);
                track.push(event);
                // advance the track chunk
                trackChunk.data.currentIndex += eventDataLength;
            }
            this.tracks.push(track);
            
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
        // parse the events
        this._parseInternal();
        SpessaSynthGroupEnd();
        SpessaSynthInfo(
            `%cMIDI file parsed. Total tick time: %c${this.lastVoiceEventTick}%c, total seconds time: %c${this.duration}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized
        );
    }
    
    /**
     * @param fileByteArray {IndexedByteArray}
     * @returns {{type: string, size: number, data: IndexedByteArray}}
     * @private
     */
    _readMIDIChunk(fileByteArray)
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