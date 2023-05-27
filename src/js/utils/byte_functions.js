import {ShiftableUint8Array} from "./shiftable_array.js";
import {RiffChunk} from "../soundfont/chunk/riff_chunk.js";

/**
 * @param dataArray {ShiftableUint8Array}
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
 * @param dataArray {ShiftableUint8Array}
 * @returns {number}
 */
export function readByte(dataArray){
    return dataArray.shift();
}

/**
 * @param dataArray {ShiftableUint8Array}
 * @param bytes {number}
 * @param encoding {string} the text encoding
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
 * @param dataArray {ShiftableUint8Array}
 * @param readData {boolean}
 * @returns {RiffChunk}
 */
export function readChunk(dataArray, readData = true){
    let header = readBytesAsString(dataArray, 4);

    let size = readBytesAsUintLittleEndian(dataArray, 4);
    let chunkData = undefined;
    if(readData) {
        chunkData = new ShiftableUint8Array(size);
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
    let sign = byte2 & (1 << 7);
    let int16 = (((byte2 & 0xFF) << 8) | (byte1 & 0xFF));
    if (sign) {
        int16 = 0xFFFF0000 | int16;
    }
    return int16;
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