import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeDword, writeWord } from "../../../utils/byte_functions/little_endian.js";

export class Articulator
{
    /**
     * @type {DLSSources}
     */
    source;
    /**
     * @type {DLSSources}
     */
    control;
    /**
     * @type {DLSDestinations}
     */
    destination;
    /**
     * @type {number}
     */
    scale;
    /**
     * @type {number}
     */
    transform;
    
    constructor(source, control, destination, scale, transform)
    {
        this.source = source;
        this.control = control;
        this.destination = destination;
        this.scale = scale;
        this.transform = transform;
    }
    
    /**
     * @returns {IndexedByteArray}
     */
    writeArticulator()
    {
        const out = new IndexedByteArray(12);
        writeWord(out, this.source);
        writeWord(out, this.control);
        writeWord(out, this.destination);
        writeWord(out, this.transform);
        writeDword(out, this.scale << 16);
        return out;
    }
}