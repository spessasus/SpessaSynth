import { IndexedByteArray } from "../../utils/indexed_array.js";
import { readLittleEndian, writeDword } from "../../utils/byte_functions/little_endian.js";
import { readBytesAsString, writeStringAsBytes } from "../../utils/byte_functions/string.js";

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
    constructor(header, size, data)
    {
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
export function readRIFFChunk(dataArray, readData = true, forceShift = false)
{
    let header = readBytesAsString(dataArray, 4);
    
    let size = readLittleEndian(dataArray, 4);
    let chunkData = undefined;
    if (readData)
    {
        chunkData = new IndexedByteArray(dataArray.buffer.slice(dataArray.currentIndex, dataArray.currentIndex + size));
    }
    if (readData || forceShift)
    {
        dataArray.currentIndex += size;
    }
    
    if (size % 2 !== 0)
    {
        if (dataArray[dataArray.currentIndex] === 0)
        {
            dataArray.currentIndex++;
        }
    }
    
    return new RiffChunk(header, size, chunkData);
}

/**
 * @param chunk {RiffChunk}
 * @param prepend {IndexedByteArray}
 * @returns {IndexedByteArray}
 */
export function writeRIFFChunk(chunk, prepend = undefined)
{
    let size = 8 + chunk.size;
    if (chunk.size % 2 !== 0)
    {
        size++;
    }
    if (prepend)
    {
        size += prepend.length;
    }
    const array = new IndexedByteArray(size);
    // prepend data (for example, type before the read)
    if (prepend)
    {
        array.set(prepend, array.currentIndex);
        array.currentIndex += prepend.length;
    }
    // write header
    writeStringAsBytes(array, chunk.header);
    // write size (excluding header and the size itself) and then prepend if specified
    writeDword(array, size - 8 - (prepend?.length || 0));
    // write data
    array.set(chunk.chunkData, array.currentIndex);
    return array;
}

/**
 * @param header {string}
 * @param data {Uint8Array}
 * @param addZeroByte {Boolean}
 * @param isList {boolean}
 * @returns {IndexedByteArray}
 */
export function writeRIFFOddSize(header, data, addZeroByte = false, isList = false)
{
    if (addZeroByte)
    {
        const tempData = new Uint8Array(data.length + 1);
        tempData.set(data);
        data = tempData;
    }
    let offset = 8;
    let finalSize = offset + data.length;
    let writtenSize = data.length;
    if (finalSize % 2 !== 0)
    {
        finalSize++;
    }
    let headerWritten = header;
    if (isList)
    {
        finalSize += 4;
        writtenSize += 4;
        offset += 4;
        headerWritten = "LIST";
    }
    const outArray = new IndexedByteArray(finalSize);
    writeStringAsBytes(outArray, headerWritten);
    writeDword(outArray, writtenSize);
    if (isList)
    {
        writeStringAsBytes(outArray, header);
    }
    outArray.set(data, offset);
    return outArray;
}

/**
 * @param collection {RiffChunk[]}
 * @param type {string}
 * @returns {RiffChunk|undefined}
 */
export function findRIFFListType(collection, type)
{
    return collection.find(c =>
    {
        if (c.header !== "LIST")
        {
            return false;
        }
        c.chunkData.currentIndex = 0;
        return readBytesAsString(c.chunkData, 4) === type;
    });
}