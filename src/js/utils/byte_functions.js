import {ShiftableByteArray} from "./shiftable_array.js";
import {RiffChunk} from "../soundfont/chunk/riff_chunk.js";

/**
 * Reads as little endian
 * @param dataArray {ShiftableByteArray}
 * @param bytesAmount {number}
 * @returns {number}
 */
export function readBytesAsUintLittleEndian(dataArray, bytesAmount){
    let out = 0;
    for(let i = 0; i <= 8 * (bytesAmount - 1); i += 8)
    {
        out |= (readByte(dataArray) << i);
    }
    return out;
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
    return out;
}

/**
 * @param dataArray {ShiftableByteArray}
 * @returns {number}
 */
export function readByte(dataArray){
    return dataArray.shift();
}

/**
 * @param dataArray {ShiftableByteArray}
 * @param bytes {number}
 * @param encoding {string} the textElement encoding
 * @returns {string}
 */
export function readBytesAsString(dataArray, bytes, encoding=undefined){
    if(!encoding) {
        let string = "";
        for (let i = 0; i < bytes; i++) {
            let byte = readByte(dataArray);
            if (byte === 0) {
                continue;
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
 * @param dataArray {ShiftableByteArray}
 * @param readData {boolean}
 * @returns {RiffChunk}
 */
export function readRIFFChunk(dataArray, readData = true){
    let header = readBytesAsString(dataArray, 4);

    let size = readBytesAsUintLittleEndian(dataArray, 4);
    let chunkData = undefined;
    if(readData) {
        chunkData = new ShiftableByteArray(size);
        for (let i = 0; i < size; i++) {
            chunkData[i] = readByte(dataArray);
        }
    }

    return new RiffChunk(header, size, chunkData);
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