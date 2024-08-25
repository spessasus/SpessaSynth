import { BasicSoundFont } from '../basic_soundfont/basic_soundfont.js'
import { IndexedByteArray } from '../../utils/indexed_array.js'
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from '../../utils/loggin.js'
import { consoleColors } from '../../utils/other.js'
import { findRIFFListType, readRIFFChunk } from '../basic_soundfont/riff_chunk.js'
import { readBytesAsString } from '../../utils/byte_functions/string.js'
import { readLittleEndian } from '../../utils/byte_functions/little_endian.js'
import { readDLSInstrumentList } from './read_instrument_list.js'
import { readDLSInstrument } from './read_instrument.js'
import { readLart } from './read_lart.js'
import { readRegion } from './read_region.js'
import { readDLSSamples } from './read_samples.js'

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

        // read the main chunk
        let firstChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(firstChunk, "riff");
        this.verifyText(readBytesAsString(this.dataArray,4).toLowerCase(), "dls ");

        /**
         * Read list
         * @type {RiffChunk[]}
         */
        const chunks = [];
        while(this.dataArray.currentIndex < this.dataArray.length)
        {
            chunks.push(readRIFFChunk(this.dataArray));
        }

        // mandatory
        this.soundFontInfo["ifil"] = "2.1"; // always for dls
        this.soundFontInfo["isng"] = "EMU8000";

        // set some defaults
        this.soundFontInfo["IPRD"] = "SpessaSynth DLS";
        this.soundFontInfo["ICRD"] =  new Date().toDateString();

        // read info
        const infoChunk = findRIFFListType(chunks, "INFO");
        if(infoChunk)
        {
            while(infoChunk.chunkData.currentIndex < infoChunk.chunkData.length)
            {
                const infoPart = readRIFFChunk(infoChunk.chunkData);
                this.soundFontInfo[infoPart.header] = readBytesAsString(infoPart.chunkData, infoPart.size);
            }
        }
        this.soundFontInfo["ICMT"] = (this.soundFontInfo["ICMT"] || "") + "\nConverted from DLS to SF2 with SpessaSynth";
        if(this.soundFontInfo["ISBJ"])
        {
            // merge it
            this.soundFontInfo["ICMT"] += "\n" + this.soundFontInfo["ISBJ"];
            delete this.soundFontInfo["ISBJ"];
        }

        for(const [info, value] of Object.entries(this.soundFontInfo))
        {
            SpessaSynthInfo(`%c"${info}": %c"${value}"`,
                consoleColors.info,
                consoleColors.recognized);
        }

        // read "colh"
        let colhChunk = chunks.find(c => c.header === "colh");
        if(!colhChunk)
        {
            SpessaSynthGroupEnd();
            throw new Error("No colh chunk!");
        }
        this.instrumentAmount = readLittleEndian(colhChunk.chunkData, 4);
        SpessaSynthInfo(`%cInstruments amount: %c${this.instrumentAmount}`,
            consoleColors.info,
            consoleColors.recognized);

        // read wave list
        let waveListChunk = findRIFFListType(chunks , "wvpl");
        this.readDLSSamples(waveListChunk);

        // read instrument list
        let instrumentListChunk = findRIFFListType(chunks, "lins");
        if(!instrumentListChunk)
        {
            SpessaSynthGroupEnd();
            throw new Error("No lins chunk!");
        }
        this.readDLSInstrumentList(instrumentListChunk);

        SpessaSynthInfo(`%cParsing finished! %c"${this.soundFontInfo["INAM"] || "UNNAMED"}"%c has %c${this.presets.length} %cpresets,
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
DLSSoundFont.prototype.readRegion = readRegion;
DLSSoundFont.prototype.readLart = readLart;
DLSSoundFont.prototype.readDLSSamples = readDLSSamples;

export {DLSSoundFont}