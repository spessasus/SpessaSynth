import { writeRIFFOddSize } from "../riff_chunk.js";
import { writeDword } from "../../../utils/byte_functions/little_endian.js";
import { combineArrays, IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeLins } from "./lins.js";
import { getStringBytesZero, writeStringAsBytes } from "../../../utils/byte_functions/string.js";
import { writeWavePool } from "./wvpl.js";
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo } from "../../../utils/loggin.js";
import { consoleColors } from "../../../utils/other.js";

/**
 * Write the soundfont as a .dls file. Experimental
 * @this {BasicSoundBank}
 * @returns {Uint8Array}
 */
export function writeDLS()
{
    SpessaSynthGroupCollapsed(
        "%cSaving DLS...",
        consoleColors.info
    );
    // write colh
    const colhNum = new IndexedByteArray(4);
    writeDword(colhNum, this.presets.length);
    const colh = writeRIFFOddSize(
        "colh",
        colhNum
    );
    SpessaSynthGroupCollapsed(
        "%cWriting instruments...",
        consoleColors.info
    );
    const lins = writeLins.apply(this);
    SpessaSynthInfo(
        "%cSuccess!",
        consoleColors.recognized
    );
    SpessaSynthGroupEnd();
    
    SpessaSynthGroupCollapsed(
        "%cWriting WAVE samples...",
        consoleColors.info
    );
    const wavepool = writeWavePool.apply(this);
    const wvpl = wavepool.data;
    const ptblOffsets = wavepool.indexes;
    SpessaSynthInfo("%cSucceeded!", consoleColors.recognized);
    SpessaSynthGroupEnd();
    
    // write ptbl
    const ptblData = new IndexedByteArray(8 + 4 * ptblOffsets.length);
    writeDword(ptblData, 8);
    writeDword(ptblData, ptblOffsets.length);
    for (const offset of ptblOffsets)
    {
        writeDword(ptblData, offset);
    }
    const ptbl = writeRIFFOddSize(
        "ptbl",
        ptblData
    );
    
    this.soundFontInfo["ICMT"] = (this.soundFontInfo["ICMT"] || "Soundfont") + "\nConverted from SF2 to DLS using SpessaSynth";
    this.soundFontInfo["ISFT"] = "SpessaSynth";
    // write INFO
    const infos = [];
    for (const [info, data] of Object.entries(this.soundFontInfo))
    {
        if (
            info !== "ICMT" &&
            info !== "INAM" &&
            info !== "ICRD" &&
            info !== "IENG" &&
            info !== "ICOP" &&
            info !== "ISFT" &&
            info !== "ISBJ"
        )
        {
            continue;
        }
        infos.push(
            writeRIFFOddSize(
                info,
                getStringBytesZero(data),
                true
            )
        );
    }
    const info = writeRIFFOddSize(
        "INFO",
        combineArrays(infos),
        false,
        true
    );
    
    const out = new IndexedByteArray(
        colh.length
        + lins.length
        + ptbl.length
        + wvpl.length
        + info.length
        + 4);
    writeStringAsBytes(out, "DLS ");
    out.set(combineArrays([
        colh,
        lins,
        ptbl,
        wvpl,
        info
    ]), 4);
    SpessaSynthInfo(
        "%cSaved succesfully!",
        consoleColors.recognized
    );
    SpessaSynthGroupEnd();
    return writeRIFFOddSize(
        "RIFF",
        out
    );
}