import { writeRIFFOddSize } from "../riff_chunk.js";
import { combineArrays } from "../../../utils/indexed_array.js";
import { writeIns } from "./ins.js";

/**
 * @this {BasicSoundBank}
 * @returns {IndexedByteArray}
 */
export function writeLins()
{
    const lins = combineArrays(this.presets.map(p => writeIns.apply(this, [p])));
    return writeRIFFOddSize(
        "lins",
        lins,
        false,
        true
    );
}