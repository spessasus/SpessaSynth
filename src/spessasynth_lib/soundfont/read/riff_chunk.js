import { IndexedByteArray } from '../../utils/indexed_array.js'
import { readBytesAsUintLittleEndian, writeDword } from '../../utils/byte_functions/little_endian.js'
import { readBytesAsString, writeStringAsBytes } from '../../utils/byte_functions/string.js'

/**
 * riff_chunk.js
 * reads a riff read and stores it as a class
 */

export class RiffChunk
{
    /**
     * Creates a new riff read
     * @constructor
     * @param header {string}
     * @param size {number}
     * @param data {IndexedByteArray}
     */
    constructor(header, size, data) {
        this.header = header;
        this.size = size;
        this.chunkData = data;
    }

}

/**
 * @param dataArray {IndexedByteArray}
 * @param readData {boolean}
 * @param forceShift {boolean}
 * @returns {RiffChunk}
 */
export function readRIFFChunk(dataArray, readData = true, forceShift = false) {
    let header = readBytesAsString(dataArray, 4)

    let size = readBytesAsUintLittleEndian(dataArray, 4)
    let chunkData = undefined
    if (readData)
    {
        chunkData = new IndexedByteArray(size)
        chunkData.set(dataArray.slice(dataArray.currentIndex, dataArray.currentIndex + size))
    }
    if(readData || forceShift)
    {
        dataArray.currentIndex += size;
    }

    return new RiffChunk(header, size, chunkData)
}

/**
 * @param chunk {RiffChunk}
 * @param prepend {IndexedByteArray}
 * @returns {IndexedByteArray}
 */
export function writeRIFFChunk(chunk, prepend = undefined)
{
    let size = 8 + chunk.size;
    if(chunk.size % 2 !== 0)
    {
        size++;
    }
    if(prepend)
    {
        size += prepend.length;
    }
    const array = new IndexedByteArray(size);
    // prepend data (for example type before the read)
    if(prepend)
    {
        array.set(prepend, array.currentIndex);
        array.currentIndex += prepend.length;
    }
    // write header
    writeStringAsBytes(array, chunk.header);
    // write size (excluding header and the size itself) and the prepend if specified
    writeDword(array, size - 8 - (prepend?.length || 0));
    // write data
    array.set(chunk.chunkData, array.currentIndex);
    return array;
}