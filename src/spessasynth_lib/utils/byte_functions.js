import { ShiftableByteArray } from './shiftable_array.js'

/**
 * byte_functions.js
 * purpose: contains various useful functions for bit manipulation and reading
 */

/**
 * Reads as little endian
 * @param dataArray {ShiftableByteArray}
 * @param bytesAmount {number}
 * @returns {number}
 */
export function readBytesAsUintLittleEndian(dataArray, bytesAmount){
    let out = 0;
    for(let i = 0; i < bytesAmount; i++)
    {
        out |= (readByte(dataArray) << i * 8);
    }
    // make sure it stays unsigned
    return out >>> 0;
}

/**
 * Reads as Big endian
 * @param dataArray {ShiftableByteArray}
 * @param bytesAmount {number}
 * @returns {number}
 */
export function readBytesAsUintBigEndian(dataArray, bytesAmount){
    let out = 0;
    for (let i = 8 * (bytesAmount - 1); i >= 0; i -= 8) {
        out |= (readByte(dataArray) << i);
    }
    return out >>> 0;
}

/**
 * @param dataArray {ShiftableByteArray}
 * @returns {number}
 */
export function readByte(dataArray){
    if(!dataArray.shift)
    {
        dataArray.currentIndex = 0;
        dataArray.shift = function () {
            this.currentIndex++;
            return this[this.currentIndex - 1];
        }
    }
    return dataArray.shift();

}

/**
 * @param dataArray {ShiftableByteArray}
 * @param bytes {number}
 * @param encoding {string} the textElement encoding
 * @param trimEnd {boolean} if we should trim once we reach an invalid byte
 * @returns {string}
 */
export function readBytesAsString(dataArray, bytes, encoding=undefined, trimEnd=true){
    if(!encoding) {
        let finished = false;
        let string = "";
        for (let i = 0; i < bytes; i++) {
            let byte = readByte(dataArray);
            if(finished)
            {
                continue;
            }
            if(byte < 32 || byte > 127)
            {
                if(trimEnd) {
                    finished = true;
                    continue;
                }
                else
                {
                    if(byte === 0)
                    {
                        finished = true;
                        continue;
                    }
                }
            }
            string += String.fromCharCode(byte);
        }
        return string;
    }
    else {
        let byteBuffer = dataArray.slice(dataArray.currentIndex, dataArray.currentIndex + bytes)
        dataArray.currentIndex += bytes;
        let decoder = new TextDecoder(encoding);
        return decoder.decode(byteBuffer.buffer);
    }
}

/**
 * @param byte1 {number}
 * @param byte2 {number}
 * @returns {number}
 */
export function signedInt16(byte1, byte2){
    let val = (byte2 << 8) | byte1;
    if(val > 32767)
    {
        return val - 65536;
    }
    return val;
}

/**
 * @param byte {number}
 * @returns {number}
 */
export function signedInt8(byte) {
    if(byte > 127)
    {
        return byte - 256;
    }
    return byte;
}

/**
 * Reads VLQ From a MIDI byte array
 * @param MIDIbyteArray {ShiftableByteArray}
 * @returns {number}
 */
export function readVariableLengthQuantity(MIDIbyteArray){
    let out = 0;
    while(MIDIbyteArray)
    {
        const byte = readByte(MIDIbyteArray);
        // extract the first 7 bytes
        out = (out << 7) | (byte & 127);

        // if the last byte isn't 1, stop reading
        if((byte >> 7) !== 1)
        {
            break;
        }
    }
    return out;
}