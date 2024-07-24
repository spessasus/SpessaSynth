import { dataBytesAmount, getChannel, messageTypes, MidiMessage } from './midi_message.js'
import { IndexedByteArray } from '../utils/indexed_array.js'
import { arrayToHexString, consoleColors, formatTitle } from '../utils/other.js'
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo } from '../utils/loggin.js'
import { readRIFFChunk } from '../soundfont/read/riff_chunk.js'
import { readVariableLengthQuantity } from '../utils/byte_functions/variable_length_quantity.js'
import { readBytesAsUintBigEndian } from '../utils/byte_functions/big_endian.js'
import { readBytesAsString } from '../utils/byte_functions/string.js'

/**
 * midi_loader.js
 * purpose: parses a midi file for the seqyencer, including things like marker or CC 2/4 loop detection, copyright detection etc.
 */
class MIDI{
    /**
     * Parses a given midi file
     * @param arrayBuffer {ArrayBuffer}
     * @param fileName {string} optional, replaces the decoded title if empty
     */
    constructor(arrayBuffer, fileName="") {
        SpessaSynthGroupCollapsed(`%cParsing MIDI File...`, consoleColors.info);
        const binaryData = new IndexedByteArray(arrayBuffer);
        let fileByteArray;

        // check for rmid
        /**
         * If the RMI file has an embedded sf2 in it, it will appeear here, otherwise undefined
         * @type {ArrayBuffer}
         */
        this.embeddedSoundFont = undefined;

        /**
         * Contains the copyright strings
         * @type {string}
         */
        this.copyright = "";

        const initialString = readBytesAsString(binaryData, 4);
        binaryData.currentIndex -= 4;
        if(initialString === "RIFF")
        {
            // possibly an RMID file (https://web.archive.org/web/20110610135604/http://www.midi.org/about-midi/rp29spec(rmid).pdf)
            // skip size
            binaryData.currentIndex += 8;
            const rmid = readBytesAsString(binaryData, 4, undefined, false);
            if(rmid !== "RMID")
            {
                SpessaSynthGroupEnd();
                throw new SyntaxError(`Invalid RMIDI Header! Expected "RMID", got "${rmid}"`);
            }
            const riff = readRIFFChunk(binaryData);
            if(riff.header !== 'data')
            {
                SpessaSynthGroupEnd();
                throw new SyntaxError(`Invalid RMIDI Chunk header! Expected "data", got "${rmid}"`);
            }
            // this is an rmid, load the midi into array for parsing
            fileByteArray = riff.chunkData;

            // keep loading chunks until we get sfbk
            while(binaryData.currentIndex <= binaryData.length)
            {
                const startIndex = binaryData.currentIndex;
                const currentChunk = readRIFFChunk(binaryData, true);
                if(currentChunk.header === "RIFF")
                {
                    const type = readBytesAsString(currentChunk.chunkData, 4);
                    if(type === "sfbk")
                    {
                        SpessaSynthInfo("%cFound embedded soundfont!", consoleColors.recognized);
                        this.embeddedSoundFont = binaryData.slice(startIndex, startIndex + currentChunk.size).buffer;
                    }
                }
            }
        }
        else
        {
            fileByteArray = binaryData;
        }
        const headerChunk = this.readMIDIChunk(fileByteArray);
        if(headerChunk.type !== "MThd")
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`Invalid MIDI Header! Expected "MThd", got "${headerChunk.type}"`);
        }

        if(headerChunk.size !== 6)
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
        this.tempoChanges = [{ticks: 0, tempo: 120}];

        let loopStart = null;
        let loopEnd = null;

        this.lastVoiceEventTick = 0;

        /**
         * Midi port numbers for each tracks
         * @type {number[]}
         */
        this.midiPorts = [];

        /**
         * All channels that each track uses
         * @type {Set<number>[]}
         */
        this.usedChannelsOnTrack = [];

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
            const usedChannels = new Set();
            this.midiPorts.push(-1);

            if(trackChunk.type !== "MTrk")
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
            if(this.format === 2 && i > 0)
            {
                totalTicks += this.tracks[i - 1][this.tracks[i - 1].length - 1].ticks;
            }
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
                switch(statusByteChannel)
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
                        if(totalTicks > this.lastVoiceEventTick)
                        {
                            this.lastVoiceEventTick = totalTicks;
                        }
                        eventDataLength = dataBytesAmount[statusByte >> 4];
                        usedChannels.add(statusByteChannel);

                        // save the status byte
                        runningByte = statusByte;
                        break;
                }

                // put the event data into the array
                const eventData = new IndexedByteArray(eventDataLength);
                const messageData = trackChunk.data.slice(trackChunk.data.currentIndex, trackChunk.data.currentIndex + eventDataLength);
                trackChunk.data.currentIndex += eventDataLength;
                eventData.set(messageData, 0);

                const message = new MidiMessage(totalTicks, statusByte, eventData);
                track.push(message);

                switch(statusByteChannel)
                {
                    case -2:
                        // since this is a meta message
                        switch(statusByte)
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
                                break;

                            case messageTypes.midiPort:
                                this.midiPorts[i] = eventData[0];
                                break;

                            case messageTypes.copyright:
                                this.copyright += readBytesAsString(eventData, eventData.length) + "\n";
                                break;

                            case messageTypes.lyric:
                                this.lyrics.push(eventData);
                        }
                        break;

                    case -3:
                        // since this is a sysex message
                        // check for embedded copyright (roland SC display sysex) http://www.bandtrax.com.au/sysex.htm
                        // header goes like this: 41 10 45 12 10 00 00
                        if(arrayToHexString(eventData.slice(0, 7)).trim() === "41 10 45 12 10 00 00")
                        {
                            /**
                             * @type {IndexedByteArray}
                             */
                            const cutText = eventData.slice(7, messageData.length - 3);
                            const decoded = readBytesAsString(cutText, cutText.length) + "\n";
                            this.copyright += decoded;
                            SpessaSynthInfo(`%cDecoded Roland SC message! %c${decoded}`,
                                consoleColors.recognized,
                                consoleColors.value)
                        }
                        break;


                    default:
                        // since this is a voice message
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
            }
            this.tracks.push(track);
            this.usedChannelsOnTrack.push(usedChannels);
            SpessaSynthInfo(`%cParsed %c${this.tracks.length}%c / %c${this.tracksAmount}`,
                consoleColors.info,
                consoleColors.value,
                consoleColors.info,
                consoleColors.value);
        }

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

        SpessaSynthInfo(`%cMIDI file parsed. Total tick time: %c${this.lastVoiceEventTick}`,
            consoleColors.info,
            consoleColors.recognized);
        SpessaSynthGroupEnd();
        
        if(loopStart !== null && loopEnd === null)
        {
            // not a loop
            loopStart = this.firstNoteOn;
            loopEnd = this.lastVoiceEventTick;
        }
        else {
            if (loopStart === null) {
                loopStart = this.firstNoteOn;
            }

            if (loopEnd === null || loopEnd === 0) {
                loopEnd = this.lastVoiceEventTick;
            }
        }

        // fix midi ports:
        // midi tracks without ports will have a value of -1
        // if all ports have a value of -1, set it to 0, otherwise take the first midi port and replace all -1 with it
        // why do this? some midis (for some reason) specify all channels to port 1 or else, but leave the conductor track with no port pref.
        // this spessasynth to reserve the first 16 channels for the conductor track (which doesn't play anything) and use additional 16 for the actual ports.
        let defaultPort = 0;
        for(let port of this.midiPorts)
        {
            if(port !== -1)
            {
                defaultPort = port;
                break;
            }
        }
        this.midiPorts = this.midiPorts.map(port => port === -1 ? defaultPort : port);

        /**
         *
         * @type {{start: number, end: number}}
         */
        this.loop = {start: loopStart, end: loopEnd};

        // get track name
        this.midiName = "";

        this.rawMidiName = new Uint8Array(0);

        // midi name
        if(this.tracks.length > 1)
        {
            // if more than 1 track and the first track has no notes, just find the first trackName in the first track
            if(this.tracks[0].find(
                message => message.messageStatusByte >= messageTypes.noteOn
                &&
                message.messageStatusByte < messageTypes.systemExclusive
            ) === undefined)
            {
                let name = this.tracks[0].find(message => message.messageStatusByte === messageTypes.trackName);
                if(name)
                {
                    this.rawMidiName = name.messageData;
                    this.midiName = readBytesAsString(name.messageData, name.messageData.length);
                }
            }
        }
        else
        {
            // if only 1 track, find the first "track name" event
            let name = this.tracks[0].find(message => message.messageStatusByte === messageTypes.trackName);
            if(name)
            {
                this.rawMidiName = name.messageData;
                this.midiName = readBytesAsString(name.messageData, name.messageData.length);
            }
        }

        this.fileName = fileName;

        // if midiName is "", use the file name
        if(this.midiName.trim().length === 0)
        {
            this.midiName = formatTitle(fileName);
            // encode it too
            this.rawMidiName = new Uint8Array(this.midiName.length);
            for(let i = 0; i < this.midiName.length; i++)
            {
                this.rawMidiName[i] = this.midiName.charCodeAt(i);
            }
        }

        // reverse the tempo changes
        this.tempoChanges.reverse();

        /**
         * The total playback time, in seconds
         * @type {number}
         */
        this.duration = this._ticksToSeconds(this.lastVoiceEventTick);
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


    /**
     * Coverts ticks to time in seconds
     * @param ticks {number}
     * @returns {number}
     * @private
     */
    _ticksToSeconds(ticks)
    {
        if (ticks <= 0) {
            return 0;
        }

        // find the last tempo change that has occured
        let tempo = this.tempoChanges.find(v => v.ticks < ticks);

        let timeSinceLastTempo = ticks - tempo.ticks;
        return this._ticksToSeconds(ticks - timeSinceLastTempo) + (timeSinceLastTempo * 60) / (tempo.tempo * this.timeDivision);
    }
}
export { MIDI }