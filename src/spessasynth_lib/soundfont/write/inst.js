import { IndexedByteArray } from '../../utils/indexed_array.js'
import { writeStringAsBytes } from '../../utils/byte_functions/string.js'
import { writeWord } from '../../utils/byte_functions/little_endian.js'
import { RiffChunk, writeRIFFChunk } from '../read/riff_chunk.js'

/**
 * @this {SoundFont2}
 * @returns {IndexedByteArray}
 */
export function getINST()
{
    const instsize = this.instruments.length * 22 + 22;
    const instdata = new IndexedByteArray(instsize);
    // the instrument start index is adjusted in ibag, simply write it here
    let instrumentStart = 0;
    let instrumentID = 0;
    for(const inst of this.instruments)
    {
        writeStringAsBytes(instdata, inst.instrumentName, 20);
        writeWord(instdata, instrumentStart);
        instrumentStart += inst.instrumentZones.length;
        inst.instrumentID = instrumentID;
        instrumentID++;
    }
    // write EOI
    writeStringAsBytes(instdata, "EOI", 20);
    writeWord(instdata, instrumentStart);

    return writeRIFFChunk(new RiffChunk(
        "inst",
        instdata.length,
        instdata
    ));
}