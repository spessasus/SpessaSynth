/**
 * Reads VLQ From a MIDI byte array
 * @param MIDIbyteArray {IndexedByteArray}
 * @returns {number}
 */
export function readVariableLengthQuantity(MIDIbyteArray)
{
    let out = 0;
    while (MIDIbyteArray)
    {
        const byte = MIDIbyteArray[MIDIbyteArray.currentIndex++];
        // extract the first 7 bytes
        out = (out << 7) | (byte & 127);
        
        // if the last byte isn't 1, stop reading
        if ((byte >> 7) !== 1)
        {
            break;
        }
    }
    return out;
}

/**
 * Write a VLQ from a number to a byte array
 * @param number {number}
 * @returns {number[]}
 */
export function writeVariableLengthQuantity(number)
{
    // Add the first byte
    let bytes = [number & 127];
    number >>= 7;
    
    // Continue processing the remaining bytes
    while (number > 0)
    {
        bytes.unshift((number & 127) | 128);
        number >>= 7;
    }
    return bytes;
}