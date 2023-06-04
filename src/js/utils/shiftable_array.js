export class ShiftableByteArray extends Uint8Array
{
    /**
     * Creates a new instance of an Uint8Array with Array.shift() function
     * @param size {number || ArrayBufferLike} - The array's size
     */
    constructor(size) {
        super(size);
        this.currentIndex = 0;
    }

    /**
     * @param amount {number} - Amount of bytes to shift
     * @returns {number} - The shifted byte
     */
    shift = (amount = 1) =>
    {
        this.currentIndex += amount;
        return this[this.currentIndex - amount];
    };

    /**
     * @param begin {number} - The beginning of the specified portion of the array
     * @param end {number} - The end of the specified portion of the array
     * @returns {ShiftableByteArray} - A new ShiftableByteArray object
     */
    slice(begin, end) {
        // get a Uint8Array
        const uint8SubArray = super.slice(begin, end);

        // Create a new ShiftableByteArray with the same length as the Uint8Array
        const shiftableSubArray = new ShiftableByteArray(uint8SubArray.length);

        // copy the contents
        shiftableSubArray.set(uint8SubArray, 0);
        return shiftableSubArray;
    }
}
