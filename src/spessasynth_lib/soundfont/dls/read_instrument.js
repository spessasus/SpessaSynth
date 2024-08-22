import { readBytesAsString } from '../../utils/byte_functions/string.js'
import { readLittleEndian } from '../../utils/byte_functions/little_endian.js'
import { DLSPreset } from './dls_preset.js'
import { readRIFFChunk } from '../basic_soundfont/riff_chunk.js'

/**
 * @this {DLSSoundFont}
 * @param chunk {RiffChunk}
 */
export function readDLSInstrument(chunk)
{
    this.verifyHeader(chunk, "LIST");
    this.verifyText(readBytesAsString(chunk.chunkData, 4), "ins ");

    const instrumentHeader = readRIFFChunk(chunk.chunkData);
    this.verifyHeader(instrumentHeader, "insh");

    const regions = readLittleEndian(instrumentHeader.chunkData, 4);
    const ulBank = readLittleEndian(instrumentHeader.chunkData, 4);
    const ulInstrument = readLittleEndian(instrumentHeader.chunkData, 4);
    this.presets.push(new DLSPreset(ulBank, ulInstrument, regions));
}