import {SysexEvent} from "./events/sysex_event.js";
import {MidiEvent} from "./events/midi_event.js";
import {MetaEvent} from "./events/meta_event.js";

export class MidiParser
{
    /**
     * @typedef {(MidiEvent|MetaEvent|SysexEvent)[][]} ParsedMidi
     */

    constructor() {
        /**
         * reads and removes specified bytes amount and returns a big-endian number
         * @param dataArray {Array}
         * @param bytesAmount {number}
         * @returs {number}
         */
        this.readBytesAsNumber = (dataArray, bytesAmount) => {
            let out = 0;
            for (let i = 8 * (bytesAmount - 1); i >= 0; i -= 8) {
                out |= (dataArray.shift() << i);
            }
            return out;
        }

        this.readBytesAsString = (arr, bytes) => {
            // let out = "";
            // for (let i = 0; i < bytes; i++) {
            //     out += String.fromCharCode(arr.shift());
            // }
            // return out;
            // shift-jis
            let decoder = new TextDecoder("windows-1250")
            let buffer = new Uint8Array(arr.splice(0, bytes)).buffer;
            return decoder.decode(buffer);
            // return String.fromCharCode(...arr.splice(0, bytes));
        }

        /**
         * reads and removes a midi chunk
         * @param arrayData {Array}
         * @returns {object}
         */
        this.readChunk = arrayData => {
            let chunk = {};
            // get the midi chunk type
            chunk.type = this.readBytesAsString(arrayData, 4);

            // get the midi chunk size
            chunk.size = this.readBytesAsNumber(arrayData, 4);

            chunk.chunkData = [];
            for (let i = 0; i < chunk.size; i++) {
                chunk.chunkData.push(arrayData.shift());
            }
            return chunk;
        }

        this.readVariableLengthQuantity = dataArray =>
        {
            let out = 0;
            while(dataArray)
            {
                let byte = dataArray.shift();
                // extract the first 7 bytes
                out = (out << 7) | (byte & 127);

                // if the last byte isn't 1, stop
                if((byte >> 7) !== 1)
                {
                    break;
                }
            }
            return out;
        };
    }

    /**
     * Parses the midi file
     * @param midiFileData {Array}
     * @param messageCallback {function(string)}
     */
    async parse(midiFileData, messageCallback)
    {
        messageCallback("Parsing Midi...");
        // read the first chunk
        let firstChunk = this.readChunk(midiFileData);
        if(firstChunk.type !== "MThd") {
            messageCallback("Invalid midi header!");
            throw new Error("Invalid midi header!");
        }

        if(firstChunk.size !== 6)
        {
            messageCallback("Invasil midi header size!");
            throw new Error("Invalid midi header size!");
        }

        // read the midi format
        this.format = this.readBytesAsNumber(firstChunk.chunkData, 2);

        // read the tracks amount
        this.tracksAmount = this.readBytesAsNumber(firstChunk.chunkData, 2);

        // read the time division
        this.timeDivision = this.readBytesAsNumber(firstChunk.chunkData, 2);
        console.log("Type: ", firstChunk.type,
            "Format:", this.format, "Tracks:", this.tracksAmount, "Time division:", this.timeDivision);

        // create the main array
        this.decodedTracks = [];

        // loop through all the tracks
        for (let i = 0; i < this.tracksAmount; i++)
        {
            // add a new track
            this.decodedTracks.push([]);

            // read the track and validate the chunk type
            let trackChunk = this.readChunk(midiFileData);
            if(trackChunk.type !== "MTrk")
            {
                throw new Error("Invalid track header!");
            }

            let runningByte = 0;
            while(trackChunk.chunkData.length) {

                // delta always first
                let delta = this.readVariableLengthQuantity(trackChunk.chunkData);

                let byteCheck = trackChunk.chunkData[0];

                // check for metaEvent
                if(byteCheck === 0xFF) {
                    this.decodedTracks[i].push(new MetaEvent(trackChunk.chunkData, delta));
                    continue;
                }
                // check for system exclusive
                else if(byteCheck === 0xF0 || byteCheck === 0xF7) {
                    this.decodedTracks[i].push(new SysexEvent(trackChunk.chunkData, delta));
                    continue;
                }

                // if the byte doesn't end with 1, skip
                if(byteCheck < 0x80)
                {
                    if(!runningByte)
                    {
                        console.log("UNKNOWN BYTE!", byteCheck);
                        trackChunk.chunkData.shift();
                        continue;
                    }

                    this.decodedTracks[i].push(new MidiEvent(trackChunk.chunkData, delta, runningByte));
                    continue;
                }

                // read the MIDI event;
                runningByte = trackChunk.chunkData[0];
                this.decodedTracks[i].push(new MidiEvent(trackChunk.chunkData, delta));

            }
            messageCallback(`Parsed track ${i}/${this.tracksAmount}`);
            console.log("Finished loading track", i);
        }
        messageCallback("Parsed midi!");
        /*
        let trackWorkers = [];

        // loop through all the tracks
        for (let i = 0; i < this.tracksAmount; i++)
        {
            let track = this.readRIFFChunk(midiFileData);

            console.log("Starting to load track", i);
            messageCallback(`Starting to parse track ${i}`);

            trackWorkers.push(new Promise(resolve =>{
                let w = new Worker("/js/midi_parser/track_loader_worker.js");
                w.onmessage = e =>
                {
                    console.log("Finished loading track", i);
                    messageCallback(`Parsed track ${i}!`);
                    resolve(e.data);
                }
                w.postMessage(track);
            }));
             /**
         * @type {ParsedMidi}
         *
        this.decodedTracks = await Promise.all(trackWorkers);
        }*/
        return this;
    }
}
