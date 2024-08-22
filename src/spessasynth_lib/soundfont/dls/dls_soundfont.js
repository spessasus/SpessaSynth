import { BasicSoundFont } from '../basic_soundfont/basic_soundfont.js'
import { IndexedByteArray } from '../../utils/indexed_array.js'
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from '../../utils/loggin.js'
import { consoleColors } from '../../utils/other.js'
import { readRIFFChunk } from '../basic_soundfont/riff_chunk.js'
import { readBytesAsString } from '../../utils/byte_functions/string.js'
import { readLittleEndian } from '../../utils/byte_functions/little_endian.js'
import { readDLSInstrumentList } from './read_instrument_list.js'
import { readDLSInstrument } from './read_instrument.js'

class DLSSoundFont extends BasicSoundFont
{
    /**
     * Loads a new DLS (Downloadable sounds) soundfont
     * @param buffer {ArrayBuffer}
     */
    constructor(buffer)
    {
        super();
        this.dataArray = new IndexedByteArray(buffer);
        SpessaSynthGroup("%cParsing DLS...", consoleColors.info);
        if(!this.dataArray)
        {
            SpessaSynthGroupEnd();
            throw new TypeError("No data!");
        }

        this.soundFontInfo["ifil"] = "2.1"; // always for dls

        // read the main chunk
        let firstChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(firstChunk, "riff");
        this.verifyText(readBytesAsString(this.dataArray,4).toLowerCase(), "dls ");

        // read until we reach "colh"
        let colhChunk = readRIFFChunk(this.dataArray);
        while(colhChunk.header !== "colh")
        {
            colhChunk = readRIFFChunk(this.dataArray);
        }
        this.instrumentAmount = readLittleEndian(colhChunk.chunkData, 4);
        SpessaSynthInfo(`%cInstruments amount: %c${this.instrumentAmount}`,
            consoleColors.info,
            consoleColors.recognized);

        // instrument list
        this.readDLSInstrumentList(this.dataArray);

        SpessaSynthInfo(`%cParsing finished! %c"desfont"%c has %c${this.presets.length} %cpresets,
        %c${this.instruments.length}%c instruments and %c${this.samples.length}%c samples.`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info);
        SpessaSynthGroupEnd();
        throw new Error("Not implemented yet...")
    }

    /**
     * @param chunk {RiffChunk}
     * @param expected {string}
     */
    verifyHeader(chunk, expected)
    {
        if(chunk.header.toLowerCase() !== expected.toLowerCase())
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`Invalid DLS chunk header! Expected "${expected.toLowerCase()}" got "${chunk.header.toLowerCase()}"`);
        }
    }

    /**
     * @param text {string}
     * @param expected {string}
     */
    verifyText(text, expected)
    {
        if(text.toLowerCase() !== expected.toLowerCase())
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`Invalid DLS soundfont! Expected "${expected.toLowerCase()}" got "${text.toLowerCase()}"`);
        }
    }
}
DLSSoundFont.prototype.readDLSInstrumentList = readDLSInstrumentList;
DLSSoundFont.prototype.readDLSInstrument = readDLSInstrument;

export {DLSSoundFont}