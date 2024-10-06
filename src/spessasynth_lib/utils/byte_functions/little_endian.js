/**
 * Reads as little endian
 * @param dataArray {IndexedByteArray}
 * @param bytesAmount {number}
 * @returns {number}
 */
export function readLittleEndian(dataArray, bytesAmount)
{
    let out = 0;
    for (let i = 0; i < bytesAmount; i++)
    {
        out |= (dataArray[dataArray.currentIndex++] << i * 8);
    }
    // make sure it stays unsigned
    return out >>> 0;
}

/**
 * Writes a number as little endian seems to also work for negative numbers so yay?
 * @param dataArray {IndexedByteArray}
 * @param number {number}
 * @param byteTarget {number}
 */
export function writeLittleEndian(dataArray, number, byteTarget)
{
    for (let i = 0; i < byteTarget; i++)
    {
        dataArray[dataArray.currentIndex++] = (number >> (i * 8)) & 0xFF;
    }
}

/**
 * @param dataArray {IndexedByteArray}
 * @param word {number}
 */
export function writeWord(dataArray, word)
{
    dataArray[dataArray.currentIndex++] = word & 0xFF;
    dataArray[dataArray.currentIndex++] = word >> 8;
}

/**
 * @param dataArray {IndexedByteArray}
 * @param dword {number}
 */
export function writeDword(dataArray, dword)
{
    writeLittleEndian(dataArray, dword, 4);
}

/**
 * @param byte1 {number}
 * @param byte2 {number}
 * @returns {number}
 */
export function signedInt16(byte1, byte2)
{
    let val = (byte2 << 8) | byte1;
    if (val > 32767)
    {
        return val - 65536;
    }
    return val;
}

/**
 * @param byte {number}
 * @returns {number}
 */
export function signedInt8(byte)
{
    if (byte > 127)
    {
        return byte - 256;
    }
    return byte;
}