export class ShiftableByteArray extends Uint8Array
{
    constructor(size) {
        super(size);
        this.currentIndex = 0;
    }

    /**
     * @param amount {number}
     * @returns {number} - the byte
     */
    shift = (amount = 1) =>
    {
        this.currentIndex += amount;
        return this[this.currentIndex - amount];
    };
}
