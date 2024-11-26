import { IndexedByteArray } from "../indexed_array.js";

/**
 * @param dataArray {IndexedByteArray}
 * @param bytes {number}
 * @param encoding {string} the textElement encoding
 * @param trimEnd {boolean} if we should trim once we reach an invalid byte
 * @returns {string}
 */
export function readBytesAsString(dataArray, bytes, encoding = undefined, trimEnd = true)
{
    if (!encoding)
    {
        let finished = false;
        let string = "";
        for (let i = 0; i < bytes; i++)
        {
            let byte = dataArray[dataArray.currentIndex++];
            if (finished)
            {
                continue;
            }
            if ((byte < 32 || byte > 127) && byte !== 10) // 10 is "\n"
            {
                if (trimEnd)
                {
                    finished = true;
                    continue;
                }
                else
                {
                    if (byte === 0)
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
    else
    {
        let byteBuffer = dataArray.slice(dataArray.currentIndex, dataArray.currentIndex + bytes);
        dataArray.currentIndex += bytes;
        let decoder = new TextDecoder(encoding.replace(/[^\x20-\x7E]/g, ""));
        return decoder.decode(byteBuffer.buffer);
    }
}

/**
 * @param string {string}
 * @param padLength {number}
 * @returns {IndexedByteArray}
 */
export function getStringBytes(string, padLength = 0)
{
    let len = string.length;
    if (padLength > 0)
    {
        len = padLength;
    }
    const arr = new IndexedByteArray(len);
    writeStringAsBytes(arr, string, padLength);
    return arr;
}

/**
 * @param string {string}
 * @returns {IndexedByteArray}
 */
export function getStringBytesZero(string)
{
    return getStringBytes(string, string.length + 1);
}

/**
 * @param string {string}
 * @param outArray {IndexedByteArray}
 * @param padLength {number}
 * @returns {IndexedByteArray} modified IN PLACE
 */
export function writeStringAsBytes(outArray, string, padLength = 0)
{
    if (padLength > 0)
    {
        if (string.length > padLength)
        {
            string = string.slice(0, padLength);
        }
    }
    for (let i = 0; i < string.length; i++)
    {
        outArray[outArray.currentIndex++] = string.charCodeAt(i);
    }
    
    // pad with zeros if needed
    if (padLength > string.length)
    {
        for (let i = 0; i < padLength - string.length; i++)
        {
            outArray[outArray.currentIndex++] = 0;
        }
    }
    return outArray;
}