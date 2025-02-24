import { readRIFFChunk } from "../basic_soundfont/riff_chunk.js";
import { readArticulation } from "./read_articulation.js";

/**
 * @param lartChunk {RiffChunk|undefined}
 * @param lar2Chunk {RiffChunk|undefined}
 * @param zone {BasicInstrumentZone}
 * @this {DLSSoundFont}
 */
export function readLart(lartChunk, lar2Chunk, zone)
{
    if (lartChunk)
    {
        while (lartChunk.chunkData.currentIndex < lartChunk.chunkData.length)
        {
            const art1 = readRIFFChunk(lartChunk.chunkData);
            this.verifyHeader(art1, "art1", "art2");
            const modsAndGens = readArticulation(art1, true);
            zone.generators.push(...modsAndGens.generators);
            zone.modulators.push(...modsAndGens.modulators);
        }
    }
    
    if (lar2Chunk)
    {
        while (lar2Chunk.chunkData.currentIndex < lar2Chunk.chunkData.length)
        {
            const art2 = readRIFFChunk(lar2Chunk.chunkData);
            this.verifyHeader(art2, "art2", "art1");
            const modsAndGens = readArticulation(art2, false);
            zone.generators.push(...modsAndGens.generators);
            zone.modulators.push(...modsAndGens.modulators);
        }
    }
}