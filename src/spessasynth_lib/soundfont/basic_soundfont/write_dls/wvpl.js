import { writeDLSSample } from "./wave.js";
import { writeRIFFOddSize } from "../riff_chunk.js";
import { combineArrays } from "../../../utils/indexed_array.js";

/**
 * @this {BasicSoundBank}
 * @returns {{data: IndexedByteArray, indexes: number[] }}
 */
export function writeWavePool()
{
    let currentIndex = 0;
    const offsets = [];
    /**
     * @type {IndexedByteArray[]}
     */
    const samples = this.samples.map(s =>
    {
        const out = writeDLSSample(s);
        offsets.push(currentIndex);
        currentIndex += out.length;
        return out;
    });
    return {
        data: writeRIFFOddSize(
            "wvpl",
            combineArrays(samples),
            false,
            true
        ),
        indexes: offsets
    };
}