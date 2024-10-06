import { readRIFFChunk } from "../basic_soundfont/riff_chunk.js";
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";

/**
 * @this {DLSSoundFont}
 * @param instrumentListChunk {RiffChunk}
 */
export function readDLSInstrumentList(instrumentListChunk)
{
    SpessaSynthGroupCollapsed("%cLoading instruments...", consoleColors.info);
    for (let i = 0; i < this.instrumentAmount; i++)
    {
        this.readDLSInstrument(readRIFFChunk(instrumentListChunk.chunkData));
    }
    SpessaSynthGroupEnd();
}