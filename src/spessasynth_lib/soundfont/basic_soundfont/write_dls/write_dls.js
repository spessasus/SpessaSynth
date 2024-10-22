import { writeRIFFOddSize } from "../riff_chunk.js";
import { writeDword } from "../../../utils/byte_functions/little_endian.js";
import { combineArrays, IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeLins } from "./lins.js";
import { writeStringAsBytes } from "../../../utils/byte_functions/string.js";

/**
 * Write the soundfont as a .dls file. Experimental
 * @this {BasicSoundFont}
 * @returns {Uint8Array}
 */
export function writeDLS()
{
    // write colh
    const colhNum = new IndexedByteArray(4);
    writeDword(colhNum, this.presets.length);
    const colh = writeRIFFOddSize(
        "colh",
        colhNum
    );
    const lins = writeLins.apply(this);
    
    const out = new IndexedByteArray(colh.length + lins.length + 4);
    writeStringAsBytes(out, "DLS ");
    out.set(combineArrays([colh, lins]), 4);
    return writeRIFFOddSize(
        "RIFF",
        out
    );
}