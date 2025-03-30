import { BasicSoundBank } from "../basic_soundfont/basic_soundfont.js";
import { IndexedByteArray } from "../../utils/indexed_array.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";
import { findRIFFListType, readRIFFChunk } from "../basic_soundfont/riff_chunk.js";
import { readBytesAsString } from "../../utils/byte_functions/string.js";
import { readLittleEndian } from "../../utils/byte_functions/little_endian.js";
import { readDLSInstrumentList } from "./read_instrument_list.js";
import { readDLSInstrument } from "./read_instrument.js";
import { readLart } from "./read_lart.js";
import { readRegion } from "./read_region.js";
import { readDLSSamples } from "./read_samples.js";

class DLSSoundFont extends BasicSoundBank
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
        if (!this.dataArray)
        {
            SpessaSynthGroupEnd();
            this.parsingError("No data provided!");
        }
        
        // read the main chunk
        let firstChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(firstChunk, "riff");
        this.verifyText(readBytesAsString(this.dataArray, 4).toLowerCase(), "dls ");
        
        /**
         * Read the list
         * @type {RiffChunk[]}
         */
        const chunks = [];
        while (this.dataArray.currentIndex < this.dataArray.length)
        {
            chunks.push(readRIFFChunk(this.dataArray));
        }
        
        // mandatory
        this.soundFontInfo["ifil"] = "2.1"; // always for dls
        this.soundFontInfo["isng"] = "EMU8000";
        
        // set some defaults
        this.soundFontInfo["INAM"] = "Unnamed DLS";
        this.soundFontInfo["IENG"] = "Unknown";
        this.soundFontInfo["IPRD"] = "SpessaSynth DLS";
        this.soundFontInfo["ICRD"] = new Date().toDateString();
        
        // read info
        const infoChunk = findRIFFListType(chunks, "INFO");
        if (infoChunk)
        {
            while (infoChunk.chunkData.currentIndex < infoChunk.chunkData.length)
            {
                const infoPart = readRIFFChunk(infoChunk.chunkData);
                this.soundFontInfo[infoPart.header] = readBytesAsString(infoPart.chunkData, infoPart.size);
            }
        }
        this.soundFontInfo["ICMT"] = this.soundFontInfo["ICMT"] || "(No description)";
        if (this.soundFontInfo["ISBJ"])
        {
            // merge it
            this.soundFontInfo["ICMT"] += "\n" + this.soundFontInfo["ISBJ"];
            delete this.soundFontInfo["ISBJ"];
        }
        this.soundFontInfo["ICMT"] += "\nConverted from DLS to SF2 with SpessaSynth";
        
        for (const [info, value] of Object.entries(this.soundFontInfo))
        {
            SpessaSynthInfo(
                `%c"${info}": %c"${value}"`,
                consoleColors.info,
                consoleColors.recognized
            );
        }
        
        // read "colh"
        let colhChunk = chunks.find(c => c.header === "colh");
        if (!colhChunk)
        {
            SpessaSynthGroupEnd();
            this.parsingError("No colh chunk!");
        }
        this.instrumentAmount = readLittleEndian(colhChunk.chunkData, 4);
        SpessaSynthInfo(
            `%cInstruments amount: %c${this.instrumentAmount}`,
            consoleColors.info,
            consoleColors.recognized
        );
        
        // read the wave list
        let waveListChunk = findRIFFListType(chunks, "wvpl");
        if (!waveListChunk)
        {
            SpessaSynthGroupEnd();
            this.parsingError("No wvpl chunk!");
        }
        this.readDLSSamples(waveListChunk);
        
        // read the instrument list
        let instrumentListChunk = findRIFFListType(chunks, "lins");
        if (!instrumentListChunk)
        {
            SpessaSynthGroupEnd();
            this.parsingError("No lins chunk!");
        }
        this.readDLSInstrumentList(instrumentListChunk);
        
        // sort presets
        this.presets.sort((a, b) => (a.program - b.program) + (a.bank - b.bank));
        this._parseInternal();
        SpessaSynthInfo(
            `%cParsing finished! %c"${this.soundFontInfo["INAM"] || "UNNAMED"}"%c has %c${this.presets.length} %cpresets,
        %c${this.instruments.length}%c instruments and %c${this.samples.length}%c samples.`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info
        );
        SpessaSynthGroupEnd();
    }
    
    /**
     * @param chunk {RiffChunk}
     * @param expected {string}
     */
    verifyHeader(chunk, ...expected)
    {
        for (const expect of expected)
        {
            if (chunk.header.toLowerCase() === expect.toLowerCase())
            {
                return;
            }
        }
        SpessaSynthGroupEnd();
        this.parsingError(`Invalid DLS chunk header! Expected "${expected.toString()}" got "${chunk.header.toLowerCase()}"`);
    }
    
    /**
     * @param text {string}
     * @param expected {string}
     */
    verifyText(text, expected)
    {
        if (text.toLowerCase() !== expected.toLowerCase())
        {
            SpessaSynthGroupEnd();
            this.parsingError(`FourCC error: Expected "${expected.toLowerCase()}" got "${text.toLowerCase()}"`);
        }
    }
    
    /**
     * @param error {string}
     */
    parsingError(error)
    {
        throw new Error(`DLS parse error: ${error} The file may be corrupted.`);
    }
    
    destroySoundBank()
    {
        super.destroySoundBank();
        delete this.dataArray;
    }
}

DLSSoundFont.prototype.readDLSInstrumentList = readDLSInstrumentList;
DLSSoundFont.prototype.readDLSInstrument = readDLSInstrument;
DLSSoundFont.prototype.readRegion = readRegion;
DLSSoundFont.prototype.readLart = readLart;
DLSSoundFont.prototype.readDLSSamples = readDLSSamples;

export { DLSSoundFont };