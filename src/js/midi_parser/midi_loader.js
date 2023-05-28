import {MidiMessage, readMidiMessage} from "./midi_message.js";
import {ShiftableByteArray} from "../utils/shiftable_array.js";
import {readBytesAsString, readBytesAsUintBigEndian} from "../utils/byte_functions.js";
export class MIDI{
    /**
     * Parses a given midi file
     * @param fileByteArray {ShiftableByteArray}
     */
    constructor(fileByteArray) {
        const headerChunk = this.readMIDIChunk(fileByteArray);
        if(headerChunk.type !== "MThd")
        {
            throw `Invalid MIDI Header! Expected "MThd", got "${headerChunk.type}"`;
        }

        if(headerChunk.size !== 6)
        {
            throw `Invalid MIDI header chunk size! Expected 6, got ${headerChunk.size}`;
        }

        // format (ignore)
        readBytesAsUintBigEndian(headerChunk.data, 2);
        // tracks count
        this.tracksAmount = readBytesAsUintBigEndian(headerChunk.data, 2);
        // time division
        this.timeDivision = readBytesAsUintBigEndian(headerChunk.data, 2);

        console.log("Starting to parse");
        /**
         * Read all the tracks
         * @type {MidiMessage[][]}
         */
        this.tracks = [];
        for(let i = 0; i < this.tracksAmount; i++)
        {
            /**
             * @type {MidiMessage[]}
             */
            const track = [];
            const trackChunk = this.readMIDIChunk(fileByteArray);

            if(trackChunk.type !== "MTrk")
            {
                throw `Invalid track header! Expected "MTrk" got "${trackChunk.type}"`;
            }

            /**
             * MIDI running byte
             * @type {number}
             */
            let runningByte = undefined;

            // loop until we reach the end of track
            while(trackChunk.data.currentIndex < trackChunk.size)
            {
                const message = readMidiMessage(trackChunk.data, runningByte);
                runningByte = message.statusByte;
                track.push(message.message);
            }
            this.tracks.push(track);
        }
    }

    /**
     * @param fileByteArray {ShiftableByteArray}
     * @returns {{type: string, size: number, data: ShiftableByteArray}}
     */
    readMIDIChunk(fileByteArray)
    {
        const chunk = {};
        // type
        chunk.type = readBytesAsString(fileByteArray, 4);
        // size
        chunk.size = readBytesAsUintBigEndian(fileByteArray, 4);
        // data
        chunk.data = new ShiftableByteArray(chunk.size);
        const dataSlice = fileByteArray.slice(fileByteArray.currentIndex, fileByteArray.currentIndex + chunk.size);
        console.log(chunk.data, dataSlice);
        chunk.data.set(dataSlice);
        fileByteArray.currentIndex += chunk.size;
        return chunk;
    }
}