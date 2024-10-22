import { combineArrays, IndexedByteArray } from "../../../utils/indexed_array.js";
import { combineZones } from "./combine_zones.js";
import { writeRIFFOddSize } from "../riff_chunk.js";
import { writeDword } from "../../../utils/byte_functions/little_endian.js";
import { writeDLSRegion } from "./rgn2.js";
import { getStringBytes } from "../../../utils/byte_functions/string.js";

/**
 * @this {BasicSoundFont}
 * @param preset {BasicPreset}
 * @returns {IndexedByteArray}
 */
export function writeIns(preset)
{
    // combine preset and instrument zones into a single instrument zone (region) list
    const combined = combineZones(preset);
    
    // insh: instrument header
    const inshData = new IndexedByteArray(12);
    writeDword(inshData, combined.length); // cRegions
    // bank MSB is in bits 8-14
    let ulBank = (preset.bank & 127) << 8;
    // bit 32 means drums
    if (preset.bank === 128)
    {
        ulBank |= (1 << 31);
    }
    writeDword(inshData, ulBank);                     // ulBank
    writeDword(inshData, preset.program & 127); // ulInstrument
    
    const insh = writeRIFFOddSize(
        "insh",
        inshData
    );
    
    // write region list
    const lrgnData = combineArrays(combined.map(z => writeDLSRegion.apply(this, [z])));
    const lrgn = writeRIFFOddSize(
        "lrgn",
        lrgnData,
        false,
        true
    );
    
    // writeINFO
    const inam = writeRIFFOddSize(
        "INAM",
        getStringBytes(preset.presetName)
    );
    const info = writeRIFFOddSize(
        "INFO",
        inam,
        false,
        true
    );
    
    return writeRIFFOddSize(
        "ins ",
        combineArrays([insh, lrgn, info]),
        false,
        true
    );
}