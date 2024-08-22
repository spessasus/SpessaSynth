import { readRIFFChunk } from '../basic_soundfont/riff_chunk.js'
import { readBytesAsString } from '../../utils/byte_functions/string.js'

/**
 * @this {DLSSoundFont}
 * @param dataArray {IndexedByteArray}
 */
export function readDLSInstrumentList(dataArray)
{
    const instrumentListChunk = readRIFFChunk(dataArray);
    this.verifyHeader(instrumentListChunk, "LIST");
    this.verifyText(readBytesAsString(instrumentListChunk.chunkData, 4), "lins");
    for(let i = 0; i < this.instrumentAmount; i++)
    {
        this.readDLSInstrument(readRIFFChunk(instrumentListChunk.chunkData));
    }
}