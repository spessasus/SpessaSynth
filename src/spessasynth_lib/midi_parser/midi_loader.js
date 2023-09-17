import { dataBytesAmount, getChannel, messageTypes, MidiMessage } from './midi_message.js'
import {ShiftableByteArray} from "../utils/shiftable_array.js";
import {
    readByte,
    readBytesAsString,
    readBytesAsUintBigEndian,
    readVariableLengthQuantity
} from "../utils/byte_functions.js";
import { consoleColors } from '../utils/other.js'
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

        console.log("Tracks:", this.tracksAmount, "Time division:", this.timeDivision);

        /**
         * Contains all the tempo changes in the file. (Ordered from last to first)
         * @type {{
         *     ticks: number,
         *     tempo: number
         * }[]}
         */
        this.tempoChanges = [{ticks: 0, tempo: 120}];

        let loopStart = null;
        let loopEnd = null;

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

            let totalTicks = 0;
            // loop until we reach the end of track
            while(trackChunk.data.currentIndex < trackChunk.size)
            {
                totalTicks += readVariableLengthQuantity(trackChunk.data);

                // check if the status byte is valid (IE. larger than 127)
                const statusByteCheck = trackChunk.data[trackChunk.data.currentIndex];

                let statusByte;
                // if we have a running byte and the status byte isn't valid
                if(runningByte !== undefined && statusByteCheck < 0x80)
                {
                    statusByte = runningByte;
                }
                else if(!runningByte && statusByteCheck < 0x80)
                {
                    // if we don't have a running byte and the status byte isn't valid, it's an error.
                    throw `Unexpected byte with no running byte. (${statusByteCheck})`;
                }
                else
                {
                    // if the status byte is valid, just use that
                    statusByte = readByte(trackChunk.data);
                }
                const statusByteChannel = getChannel(statusByte);

                let eventDataLength;

                // determine the message's length;
                switch(statusByteChannel)
                {
                    case -1:
                        // system common/realtime (no length)
                        eventDataLength = 0;
                        break;
                    case -2:
                        // meta (the next is the actual status byte)
                        statusByte = readByte(trackChunk.data);
                        eventDataLength = readVariableLengthQuantity(trackChunk.data);
                        break;
                    case -3:
                        // sysex
                        eventDataLength = readVariableLengthQuantity(trackChunk.data);
                        break;
                    default:
                        // get the midi message length
                        eventDataLength = dataBytesAmount[statusByte >> 4];
                        break;
                }

                // put the event data into the array
                const eventData = new ShiftableByteArray(eventDataLength);
                const messageData = trackChunk.data.slice(trackChunk.data.currentIndex, trackChunk.data.currentIndex + eventDataLength);
                trackChunk.data.currentIndex += eventDataLength;
                eventData.set(messageData, 0);

                runningByte = statusByte;

                const message = new MidiMessage(totalTicks, statusByte, eventData);
                track.push(message);

                // check for tempo change
                if(statusByte === messageTypes.setTempo)
                {
                    this.tempoChanges.push({
                        ticks: totalTicks,
                        tempo: 60000000 / readBytesAsUintBigEndian(messageData, 3)
                    });
                }
                else
                // check for loop start (Marker "start")

                if(statusByte === messageTypes.marker)
                {
                    const text = readBytesAsString(eventData, eventData.length).trim().toLowerCase();
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

                }
                else
                // check for loop (CC 2/4)
                if((statusByte & 0xF0) === messageTypes.controllerChange)
                {
                    switch(eventData[0])
                    {
                        case 2:
                        case 116:
                            loopStart = totalTicks;
                            break;

                        case 4:
                        case 117:
                            if(loopEnd === null)
                            {
                                loopEnd = totalTicks;
                            }
                            else
                            {
                                // this controller has occured more than once, this means that it doesnt indicate the loop
                                loopEnd = 0;
                            }
                            break;
                    }
                }
            }
            this.tracks.push(track);
            console.log(`%cParsed %c${this.tracks.length}%c / %c${this.tracksAmount}`,
                consoleColors.info,
                consoleColors.value,
                consoleColors.info,
                consoleColors.value);
        }

        this.lastEventTick = Math.max(...this.tracks.map(track =>
        track[track.length - 1].ticks));
        const firstNoteOns = [];
        for(const t of this.tracks)
        {
            const firstNoteOn = t.find(e => (e.messageStatusByte & 0xF0) === messageTypes.noteOn);
            if(firstNoteOn)
            {
                firstNoteOns.push(firstNoteOn.ticks);
            }
        }
        this.firstNoteOn = Math.min(...firstNoteOns);

        console.log(`%cMIDI file parsed. Total tick time: %c${this.lastEventTick}`,
            consoleColors.info,
            consoleColors.recognized);

        if(loopStart === null )
        {
            loopStart = this.firstNoteOn;
        }

        if(loopEnd === null || loopEnd === 0)
        {
            loopEnd = this.lastEventTick;
        }

        /**
         *
         * @type {{start: number, end: number}}
         */
        this.loop = {start: loopStart, end: loopEnd};

        // get track name
        this.midiName = "";
        if(this.tracks[0][0].messageStatusByte === 0x03) {
            const decoder = new TextDecoder('shift-jis');
            this.midiName = decoder.decode(this.tracks[0][0].messageData);
        }

        // reverse the tempo changes
        this.tempoChanges.reverse();
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
        chunk.data.set(dataSlice, 0);
        fileByteArray.currentIndex += chunk.size;
        return chunk;
    }
}