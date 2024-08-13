import { IndexedByteArray } from '../utils/indexed_array.js'
import {readSamples} from "./read_sf2/samples.js";
import { readBytesAsUintLittleEndian } from '../utils/byte_functions/little_endian.js'
import { readGenerators, Generator } from './read_sf2/generators.js'
import {readInstrumentZones, InstrumentZone, readPresetZones} from "./read_sf2/zones.js";
import { readPresets } from "./read_sf2/presets.js";
import {readInstruments} from "./read_sf2/instruments.js";
import {readModulators, Modulator} from "./read_sf2/modulators.js";
import { readRIFFChunk, RiffChunk } from './basic_soundfont/riff_chunk.js'
import { consoleColors } from '../utils/other.js'
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from '../utils/loggin.js'
import { readBytesAsString } from '../utils/byte_functions/string.js'
import { stbvorbis } from "../externals/stbvorbis_sync/stbvorbis_sync.min.js";
import { BasicSoundFont } from './basic_soundfont/basic_soundfont.js'

/**
 * soundfont.js
 * purpose: parses a soundfont2 file
 */

export class SoundFont2 extends BasicSoundFont
{
    /**
     * Initializes a new SoundFont2 Parser and parses the given data array
     * @param arrayBuffer {ArrayBuffer}
     */
    constructor(arrayBuffer)
    {
        super();
        this.dataArray = new IndexedByteArray(arrayBuffer);
        SpessaSynthGroup("%cParsing SoundFont...", consoleColors.info);
        if(!this.dataArray)
        {
            SpessaSynthGroupEnd();
            throw new TypeError("No data!");
        }

        // read the main read
        let firstChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(firstChunk, "riff");

        const type = readBytesAsString(this.dataArray,4).toLowerCase();
        if(type !== "sfbk" && type !== "sfpk")
        {
            SpessaSynthGroupEnd();
            throw new SyntaxError(`Invalid soundFont! Expected "sfbk" or "sfpk" got "${type}"`);
        }
        /*
        Some SF2Pack description:
        this is essentially sf2, but the entire smpl chunk is compressed (we only support ogg vorbis here)
        and the only other difference is that the main chunk isn't "sfbk" but rather "sfpk"
         */
        const isSF2Pack = type === "sfpk";

        // INFO
        let infoChunk = readRIFFChunk(this.dataArray);
        this.verifyHeader(infoChunk, "list");
        readBytesAsString(infoChunk.chunkData, 4);

        while(infoChunk.chunkData.length > infoChunk.chunkData.currentIndex)
        {
            let chunk = readRIFFChunk(infoChunk.chunkData);
            let text;
            // special case: ifil
            switch (chunk.header.toLowerCase())
            {
                case  "ifil":
                case "iver":
                    text = `${readBytesAsUintLittleEndian(chunk.chunkData, 2)}.${readBytesAsUintLittleEndian(chunk.chunkData, 2)}`;
                    break;

                case "icmt":
                    text = readBytesAsString(chunk.chunkData, chunk.chunkData.length, undefined, false);
                    break;

                default:
                    text = readBytesAsString(chunk.chunkData, chunk.chunkData.length);
            }

            SpessaSynthInfo(`%c"${chunk.header}": %c"${text}"`,
                consoleColors.info,
                consoleColors.recognized);
            this.soundFontInfo[chunk.header] = text;
        }

        // SDTA
        const sdtaChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(sdtaChunk, "list")
        this.verifyText(readBytesAsString(this.dataArray, 4), "sdta");

        // smpl
        SpessaSynthInfo("%cVerifying smpl chunk...", consoleColors.warn)
        let sampleDataChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(sampleDataChunk, "smpl");
        /**
         * @type {IndexedByteArray|Float32Array}
         */
        let sampleData;
        // SF2Pack: the entire data is compressed
        if(isSF2Pack)
        {
            SpessaSynthInfo("%cSF2Pack detected, attempting to decode the smpl chunk...",
                consoleColors.info);
            try
            {
                /**
                 * @type {Float32Array}
                 */
                sampleData = stbvorbis.decode(this.dataArray.buffer.slice(this.dataArray.currentIndex, this.dataArray.currentIndex + sdtaChunk.size - 12)).data[0];
            }
            catch (e)
            {
                SpessaSynthGroupEnd();
                throw new Error(`SF2Pack Ogg Vorbis decode error: ${e}`);
            }
            SpessaSynthInfo(`%cDecoded the smpl chunk! Length: %c${sampleData.length}`,
                consoleColors.info,
                consoleColors.value);
        }
        else
        {
            /**
             * @type {IndexedByteArray}
             */
            sampleData = this.dataArray;
            this.sampleDataStartIndex = this.dataArray.currentIndex;
        }

        SpessaSynthInfo(`%cSkipping sample chunk, length: %c${sdtaChunk.size - 12}`,
            consoleColors.info,
            consoleColors.value);
        this.dataArray.currentIndex += sdtaChunk.size - 12;

        // PDTA
        SpessaSynthInfo("%cLoading preset data chunk...", consoleColors.warn)
        let presetChunk = readRIFFChunk(this.dataArray);
        this.verifyHeader(presetChunk, "list");
        readBytesAsString(presetChunk.chunkData, 4);

        // read the hydra chunks
        const presetHeadersChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetHeadersChunk, "phdr");

        const presetZonesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetZonesChunk, "pbag");

        const presetModulatorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetModulatorsChunk, "pmod");

        const presetGeneratorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetGeneratorsChunk, "pgen");

        const presetInstrumentsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentsChunk, "inst");

        const presetInstrumentZonesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentZonesChunk, "ibag");

        const presetInstrumentModulatorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentModulatorsChunk, "imod");

        const presetInstrumentGeneratorsChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetInstrumentGeneratorsChunk, "igen");

        const presetSamplesChunk = readRIFFChunk(presetChunk.chunkData);
        this.verifyHeader(presetSamplesChunk, "shdr");

        /**
         * read all the samples
         * (the current index points to start of the smpl read)
         */
        this.dataArray.currentIndex = this.sampleDataStartIndex;
        this.samples.push(...readSamples(presetSamplesChunk, sampleData, !isSF2Pack));

        /**
         * read all the instrument generators
         * @type {Generator[]}
         */
        let instrumentGenerators = readGenerators(presetInstrumentGeneratorsChunk);

        /**
         * read all the instrument modulators
         * @type {Modulator[]}
         */
        let instrumentModulators = readModulators(presetInstrumentModulatorsChunk);

        /**
         * read all the instrument zones
         * @type {InstrumentZone[]}
         */
        let instrumentZones = readInstrumentZones(presetInstrumentZonesChunk,
            instrumentGenerators,
            instrumentModulators,
            this.samples);

        this.instruments = readInstruments(presetInstrumentsChunk, instrumentZones);

        /**
         * read all the preset generators
         * @type {Generator[]}
         */
        let presetGenerators = readGenerators(presetGeneratorsChunk);

        /**
         * Read all the preset modulatorrs
         * @type {Modulator[]}
         */
        let presetModulators = readModulators(presetModulatorsChunk);

        let presetZones = readPresetZones(presetZonesChunk, presetGenerators, presetModulators, this.instruments);

        this.presets.push(...readPresets(presetHeadersChunk, presetZones));
        this.presets.sort((a, b) => (a.program - b.program) + (a.bank - b.bank));
        // preload the first preset
        SpessaSynthInfo(`%cParsing finished! %c"${this.soundFontInfo["INAM"]}"%c has %c${this.presets.length} %cpresets,
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

        if(isSF2Pack)
        {
            delete this.dataArray;
        }
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
            throw new SyntaxError(`Invalid chunk header! Expected "${expected.toLowerCase()}" got "${chunk.header.toLowerCase()}"`);
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
            throw new SyntaxError(`Invalid soundFont! Expected "${expected.toLowerCase()}" got "${text.toLowerCase()}"`);
        }
    }
}