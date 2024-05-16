export class ShiftableByteArray extends Uint8Array
{
    /**
     * Creates a new instance of an Uint8Array with Array.shift() function
     * @param args {any} same as for Uint8Array
     */
    constructor(args) {
        super(args);
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
}
