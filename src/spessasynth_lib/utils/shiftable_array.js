/**
 * shiftable_array.js
 * purpose: exteds Uint8Array with the Array.shift() function
 */

export class ShiftableByteArray extends Uint8Array
{
    /**
     * Creates a new instance of an Uint8Array with Array.shift() function
     * @param args {any} same as for Uint8Array
     */
    constructor(args)
    {
        super(args);
        this.currentIndex = 0;
    }

    /**
     * The current index of the array
     * @type {number}
     */
    currentIndex;
}
