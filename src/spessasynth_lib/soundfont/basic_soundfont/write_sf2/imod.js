import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeLittleEndian, writeWord } from "../../../utils/byte_functions/little_endian.js";
import { RiffChunk, writeRIFFChunk } from "../riff_chunk.js";

/**
 * @this {BasicSoundBank}
 * @returns {IndexedByteArray}
 */
export function getIMOD()
{
    // very similar to igen,
    // go through all instruments -> zones and write modulators sequentially
    let imodsize = 10;
    for (const inst of this.instruments)
    {
        imodsize += inst.instrumentZones.reduce((sum, z) => z.modulators.length * 10 + sum, 0);
    }
    const imoddata = new IndexedByteArray(imodsize);
    let imodIndex = 0;
    for (const inst of this.instruments)
    {
        for (const ibag of inst.instrumentZones)
        {
            // set the start index here
            ibag.modulatorZoneStartIndex = imodIndex;
            for (const mod of ibag.modulators)
            {
                writeWord(imoddata, mod.sourceEnum);
                writeWord(imoddata, mod.modulatorDestination);
                writeWord(imoddata, mod.transformAmount);
                writeWord(imoddata, mod.secondarySourceEnum);
                writeWord(imoddata, mod.transformType);
                imodIndex++;
            }
        }
    }
    
    // terminal modulator, is zero
    writeLittleEndian(imoddata, 0, 10);
    
    return writeRIFFChunk(new RiffChunk(
        "imod",
        imoddata.length,
        imoddata
    ));
}