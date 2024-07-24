import { messageTypes } from './midi_message.js'
import { writeVariableLengthQuantity } from '../utils/byte_functions/variable_length_quantity.js'
import { writeBytesAsUintBigEndian } from '../utils/byte_functions/big_endian.js'

/**
 * Exports the midi as a .mid file
 * @param midi {MIDI}
 * @returns {Uint8Array} the binary .mid file data
 */
export function writeMIDIFile(midi)
{
    /**
     * @type {Uint8Array[]}
     */
    const binaryTrackData = [];
    for(const track of midi.tracks)
    {
        const binaryTrack = [];
        let currentTick = 0;
        let runningByte = undefined;
        for(const event of track)
        {
            // ticks stored in MIDI are absolute, but .mid wants relative. Convert them here.
            const deltaTicks = event.ticks - currentTick;
            /**
             * @type {number[]}
             */
            let messageData;
            // determine the message
            if(event.messageStatusByte <= messageTypes.keySignature || event.messageStatusByte === messageTypes.sequenceSpecific)
            {
                // this is a meta message
                // syntax is FF<type><length><data>
                messageData = [0xff, event.messageStatusByte, ...writeVariableLengthQuantity(event.messageData.length), ...event.messageData];
            }
            else if(event.messageStatusByte === messageTypes.systemExclusive)
            {
                // this is a system exclusive message
                // syntax is F0<length><data>
                messageData = [0xf0, ...writeVariableLengthQuantity(event.messageData.length), ...event.messageData];
            }
            else
            {
                // this is a midi message
                messageData = [];
                if(runningByte !== event.messageStatusByte)
                {
                    // running byte was not the byte we want. Add the byte here.
                    runningByte = event.messageStatusByte;
                    // add the status byte to the midi
                    messageData.push(event.messageStatusByte);
                }
                // add the data
                messageData.push(...event.messageData);
            }
            // write VLQ
            binaryTrack.push(...writeVariableLengthQuantity(deltaTicks));
            // write message
            binaryTrack.push(...messageData);
            currentTick += deltaTicks;
        }
        binaryTrackData.push(new Uint8Array(binaryTrack));
    }

    /**
     * @param text {string}
     * @param arr {number[]}
     */
    function writeText(text, arr)
    {
        for(let i = 0; i < text.length; i++)
        {
            arr.push(text.charCodeAt(i));
        }
    }

    // write the file
    const binaryData = [];
    // write header
    writeText("MThd", binaryData); // MThd
    binaryData.push(...writeBytesAsUintBigEndian(6, 4)); // length
    binaryData.push(0, midi.format); // format
    binaryData.push(...writeBytesAsUintBigEndian(midi.tracksAmount, 2)); // num tracks
    binaryData.push(...writeBytesAsUintBigEndian(midi.timeDivision, 2)); // time division

    // write tracks
    for(const track of binaryTrackData)
    {
        // write track header
        writeText("MTrk", binaryData); // MTrk
        binaryData.push(...writeBytesAsUintBigEndian(track.length, 4)); // length
        binaryData.push(...track); // write data
    }
    return new Uint8Array(binaryData);
}