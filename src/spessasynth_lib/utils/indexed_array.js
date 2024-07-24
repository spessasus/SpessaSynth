/**
 * indexed_array.js
 * purpose: exteds Uint8Array with a currentIndex property
 */

export class IndexedByteArray extends Uint8Array
{
    /**
     * Creates a new instance of an Uint8Array with a currentIndex property
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


/**
 * @param arrs {(IndexedByteArray|Uint8Array)[]}
 * @returns {IndexedByteArray|Uint8Array}
 */
export function combineArrays(arrs)
{
    const length = arrs.reduce((sum, current) => sum + current.length, 0);
    const newArr = new IndexedByteArray(length);
    let offset = 0;
    for(const arr of arrs)
    {
        newArr.set(arr, offset);
        offset += arr.length;
    }
    return newArr;
}