import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeLittleEndian, writeWord } from "../../../utils/byte_functions/little_endian.js";
import { RiffChunk, writeRIFFChunk } from "../riff_chunk.js";

/**
 * @this {BasicSoundBank}
 * @returns {IndexedByteArray}
 */
export function getPMOD()
{
    // very similar to imod,
    // go through all presets -> zones and write modulators sequentially
    let pmodsize = 10;
    for (const preset of this.presets)
    {
        pmodsize += preset.presetZones.reduce((sum, z) => z.modulators.length * 10 + sum, 0);
    }
    const pmoddata = new IndexedByteArray(pmodsize);
    let pmodIndex = 0;
    for (const preset of this.presets)
    {
        for (const pbag of preset.presetZones)
        {
            // set the start index here
            pbag.modulatorZoneStartIndex = pmodIndex;
            for (const mod of pbag.modulators)
            {
                writeWord(pmoddata, mod.sourceEnum);
                writeWord(pmoddata, mod.modulatorDestination);
                writeWord(pmoddata, mod.transformAmount);
                writeWord(pmoddata, mod.secondarySourceEnum);
                writeWord(pmoddata, mod.transformType);
                pmodIndex++;
            }
        }
    }
    
    // terminal modulator, is zero
    writeLittleEndian(pmoddata, 0, 10);
    
    return writeRIFFChunk(new RiffChunk(
        "pmod",
        pmoddata.length,
        pmoddata
    ));
}