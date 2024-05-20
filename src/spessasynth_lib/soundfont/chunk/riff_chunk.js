import { ShiftableByteArray } from '../../utils/shiftable_array.js'
import { readBytesAsString, readBytesAsUintLittleEndian } from '../../utils/byte_functions.js'

/**
 * riff_chunk.js
 * reads a riff chunk and stores it as a class
 */

export class RiffChunk
{
    /**
     * Creates a new riff chunk
     * @constructor
     * @param header {string}
     * @param size {number}
     * @param data {ShiftableByteArray}
     */
    constructor(header, size, data) {
        this.header = header;
        this.size = size;
        this.chunkData = data;
    }

}

/**
 * @param dataArray {ShiftableByteArray}
 * @param readData {boolean}
 * @returns {RiffChunk}
 */
export function readRIFFChunk(dataArray, readData = true) {
    let header = readBytesAsString(dataArray, 4)

    let size = readBytesAsUintLittleEndian(dataArray, 4)
    let chunkData = undefined
    if (readData) {
        chunkData = new ShiftableByteArray(size)
        chunkData.set(dataArray.slice(dataArray.currentIndex, dataArray.currentIndex + size))
        dataArray.currentIndex += size
        // for (let i = 0; i < size; i++) {
        //     chunkData[i] = readByte(dataArray);
        // }
    }

    return new RiffChunk(header, size, chunkData)
}