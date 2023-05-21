// import {MidiEvent} from "./events/midi_event.js";
// import {MetaEvent} from "./events/meta_event.js";
// import {SysexEvent} from "./events/sysex_event.js";

importScripts("events/meta_event.js",
    "events/midi_event.js",
    "events/sysex_event.js");

// stupid firefox doesnt support module workers

function bytesToString(arr)
{
    // shift-jis windows-1250
    let decoder = new TextDecoder('shift-jis')
    return decoder.decode(new Uint8Array(arr));
}

function readVariableLengthQuantity(dataArray)
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
}

onmessage = e => {
    /**
     * @type {{type: string, chunkData}}
     */
    let trackChunk = e.data;
    // add a new track
    let decodedTrack = [];
    if(trackChunk.type !== "MTrk")
    {
        throw new Error("Invalid track header! Got: " + bytesToString(trackChunk.type));
    }

    let runningByte = 0;
    while (trackChunk.chunkData.length) {

        // delta always first
        let delta = readVariableLengthQuantity(trackChunk.chunkData);

        let byteCheck = trackChunk.chunkData[0];

        // check for metaEvent
        if (byteCheck === 0xFF) {
            decodedTrack.push(new MetaEvent(trackChunk.chunkData, delta));
            continue;
        }
        // check for system exclusive
        else if (byteCheck === 0xF0 || byteCheck === 0xF7) {
            decodedTrack.push(new SysexEvent(trackChunk.chunkData, delta));
            continue;
        }

        // if the byte doesn't end with 1, skip
        if (byteCheck < 0x80) {
            if (!runningByte) {
                console.log("UNKNOWN BYTE!", byteCheck);
                trackChunk.chunkData.shift();
                continue;
            }

            decodedTrack.push(new MidiEvent(trackChunk.chunkData, delta, runningByte));
            continue;
        }

        // read the MIDI event;
        runningByte = trackChunk.chunkData[0];
        decodedTrack.push(new MidiEvent(trackChunk.chunkData, delta));

    }
    postMessage(decodedTrack);
}