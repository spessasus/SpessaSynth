import {ShiftableUint8Array} from "../../utils/shiftable_array.js";
export class RiffChunk
{
    /**
     * Creates a new riff chunk
     * @constructor
     * @param header {string}
     * @param size {number}
     * @param data {ShiftableUint8Array}
     */
    constructor(header, size, data) {
        this.header = header;
        this.size = size;
        this.chunkData = data;
    }

}