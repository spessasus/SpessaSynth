import { IndexedByteArray } from '../../utils/indexed_array.js'
import { writeStringAsBytes } from '../../utils/byte_functions/string.js'
import { writeDword, writeWord } from '../../utils/byte_functions/little_endian.js'
import { RiffChunk, writeRIFFChunk } from '../read/riff_chunk.js'

/**
 * @this {SoundFont2}
 * @returns {IndexedByteArray}
 */
export function getPHDR()
{
    const phdrsize = this.presets.length * 38 + 38;
    const phdrdata = new IndexedByteArray(phdrsize);
    // the preset start is adjusted in pbag, this is only for the terminal preset index
    let presetStart = 0;
    for (const preset of this.presets)
    {
        writeStringAsBytes(phdrdata, preset.presetName, 20);
        writeWord(phdrdata, preset.program);
        writeWord(phdrdata, preset.bank);
        writeWord(phdrdata, presetStart);
        // 3 unused dwords, spec says to keep em so we do
        writeDword(phdrdata, preset.library);
        writeDword(phdrdata, preset.genre);
        writeDword(phdrdata, preset.morphology);
        presetStart += preset.presetZones.length;
    }
    // write EOP
    writeStringAsBytes(phdrdata, "EOP", 20);
    writeWord(phdrdata, 0); // program
    writeWord(phdrdata, 0); // bank
    writeWord(phdrdata, presetStart);
    writeDword(phdrdata, 0); // library
    writeDword(phdrdata, 0); // genre
    writeDword(phdrdata, 0); // morphology

    return writeRIFFChunk(new RiffChunk(
        "phdr",
        phdrdata.length,
        phdrdata
    ));
}