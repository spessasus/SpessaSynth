import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeWord } from "../../../utils/byte_functions/little_endian.js";
import { RiffChunk, writeRIFFChunk } from "../riff_chunk.js";

/**
 * @this {BasicSoundBank}
 * @returns {IndexedByteArray}
 */
export function getIBAG()
{
    // write all ibag with their start indexes as they were changed in getIGEN() and getIMOD()
    const ibagsize = this.instruments.reduce((sum, i) => i.instrumentZones.length * 4 + sum, 4);
    const ibagdata = new IndexedByteArray(ibagsize);
    let zoneID = 0;
    let generatorIndex = 0;
    let modulatorIndex = 0;
    for (const inst of this.instruments)
    {
        inst.instrumentZoneIndex = zoneID;
        for (const ibag of inst.instrumentZones)
        {
            ibag.zoneID = zoneID;
            writeWord(ibagdata, generatorIndex);
            writeWord(ibagdata, modulatorIndex);
            generatorIndex += ibag.generators.length;
            modulatorIndex += ibag.modulators.length;
            zoneID++;
        }
    }
    // write the terminal IBAG
    writeWord(ibagdata, generatorIndex);
    writeWord(ibagdata, modulatorIndex);
    
    return writeRIFFChunk(new RiffChunk(
        "ibag",
        ibagdata.length,
        ibagdata
    ));
}