import { combineArrays, IndexedByteArray } from "../../../utils/indexed_array.js";
import { combineZones } from "./combine_zones.js";
import { writeRIFFOddSize } from "../riff_chunk.js";
import { writeDword } from "../../../utils/byte_functions/little_endian.js";
import { writeDLSRegion } from "./rgn2.js";
import { getStringBytesZero } from "../../../utils/byte_functions/string.js";
import { writeArticulator } from "./art2.js";
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd } from "../../../utils/loggin.js";
import { consoleColors } from "../../../utils/other.js";

/**
 * @this {BasicSoundBank}
 * @param preset {BasicPreset}
 * @returns {IndexedByteArray}
 */
export function writeIns(preset)
{
    SpessaSynthGroupCollapsed(
        `%cWriting %c${preset.presetName}%c...`,
        consoleColors.info,
        consoleColors.recognized,
        consoleColors.info
    );
    // combine preset and instrument zones into a single instrument zone (region) list
    const combined = combineZones(preset);
    
    const nonGlobalRegionsCount = combined.reduce((sum, z) =>
    {
        if (!z.isGlobal)
        {
            return sum + 1;
        }
        return sum;
    }, 0);
    
    // insh: instrument header
    const inshData = new IndexedByteArray(12);
    writeDword(inshData, nonGlobalRegionsCount); // cRegions
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
    
    // write global zone
    let lar2 = new IndexedByteArray(0);
    const globalZone = combined.find(z => z.isGlobal === true);
    if (globalZone)
    {
        const art2 = writeArticulator(globalZone);
        lar2 = writeRIFFOddSize(
            "lar2",
            art2,
            false,
            true
        );
    }
    
    // write the region list
    const lrgnData = combineArrays(combined.reduce((arrs, z) =>
    {
        if (!z.isGlobal)
        {
            arrs.push(writeDLSRegion.apply(this, [z, globalZone]));
        }
        return arrs;
    }, []));
    const lrgn = writeRIFFOddSize(
        "lrgn",
        lrgnData,
        false,
        true
    );
    
    // writeINFO
    const inam = writeRIFFOddSize(
        "INAM",
        getStringBytesZero(preset.presetName)
    );
    const info = writeRIFFOddSize(
        "INFO",
        inam,
        false,
        true
    );
    
    SpessaSynthGroupEnd();
    return writeRIFFOddSize(
        "ins ",
        combineArrays([insh, lrgn, lar2, info]),
        false,
        true
    );
}