/**
 * Reads as Big endian
 * @param dataArray {IndexedByteArray}
 * @param bytesAmount {number}
 * @returns {number}
 */
export function readBytesAsUintBigEndian(dataArray, bytesAmount)
{
    let out = 0;
    for (let i = 8 * (bytesAmount - 1); i >= 0; i -= 8)
    {
        out |= (dataArray[dataArray.currentIndex++] << i);
    }
    return out >>> 0;
}

/**
 * @param number {number}
 * @param bytesAmount {number}
 * @returns {number[]}
 */
export function writeBytesAsUintBigEndian(number, bytesAmount)
{
    const bytes = new Array(bytesAmount).fill(0);
    for (let i = bytesAmount - 1; i >= 0; i--)
    {
        bytes[i] = number & 0xFF;
        number >>= 8;
    }
    
    return bytes;
}