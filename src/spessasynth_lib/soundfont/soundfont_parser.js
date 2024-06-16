import {ShiftableByteArray} from "../utils/shiftable_array.js";
import {readSamples} from "./chunk/samples.js";
import { readBytesAsString, readBytesAsUintLittleEndian } from '../utils/byte_functions.js'
import {readGenerators, Generator} from "./chunk/generators.js";
import {readInstrumentZones, InstrumentZone, readPresetZones} from "./chunk/zones.js";
import {Preset, readPresets} from "./chunk/presets.js";
import {readInstruments, Instrument} from "./chunk/instruments.js";
import {readModulators, Modulator} from "./chunk/modulators.js";
import { readRIFFChunk, RiffChunk } from './chunk/riff_chunk.js'
import { consoleColors } from '../utils/other.js'
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthWarn } from '../utils/loggin.js'

/**
 * soundfont_parser.js
 * purpose: parses a soundfont2 file
 */

export class SoundFont2
{
    /**
     * Initializes a new SoundFont2 Parser and parses the given data array
     * @param arrayBuffer {ArrayBuffer|{presets: Preset[], info: Object<string, string>}}
     */
    constructor(arrayBuffer) {
        if(arrayBuffer.presets)
        {
            this.presets = arrayBuffer.presets;
            this.soundFontInfo = arrayBuffer.info;
            return;
        }
        this.dataArray = new ShiftableByteArray(arrayBuffer);
        SpessaSynthGroup("%cParsing SoundFont...", consoleColors.info);
        if(!this.dataArray)
        {
            throw "No data!";
        }

        // read the main chunk
        let firstChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(firstChunk, "riff");

        this.verifyText(readBytesAsString(this.dataArray,4), "sfbk");

        // INFO
        let infoChunk = readRIFFChunk(this.dataArray);
        this.verifyHeader(infoChunk, "list");
        readBytesAsString(infoChunk.chunkData, 4);

        /**
         * @type {Object<string, string>}
         */
        this.soundFontInfo = {};

        while(infoChunk.chunkData.length > infoChunk.chunkData.currentIndex) {
            let chunk = readRIFFChunk(infoChunk.chunkData);
            let text;
            // special case: ifil
            switch (chunk.header.toLowerCase())
            {
                case  "ifil":
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
        this.sampleDataStartIndex = this.dataArray.currentIndex;

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
         * (the current index points to start of the smpl chunk)
         */
        this.dataArray.currentIndex = this.sampleDataStartIndex
        this.samples = readSamples(presetSamplesChunk, this.dataArray);

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

        /**
         * read all the instruments
         * @type {Instrument[]}
         */
        let instruments = readInstruments(presetInstrumentsChunk, instrumentZones);

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

        let presetZones = readPresetZones(presetZonesChunk, presetGenerators, presetModulators, instruments);

        /**
         * Finally, read all the presets
         * @type {Preset[]}
         */
        this.presets = readPresets(presetHeadersChunk, presetZones);
        this.presets.sort((a, b) => (a.program - b.program) + (a.bank - b.bank));
        // preload the first preset
        SpessaSynthInfo(`%cParsing finished! %c"${this.soundFontInfo["INAM"]}"%c has %c${this.presets.length} %cpresets,
        %c${instruments.length}%c instruments and %c${this.samples.length}%c samples.`,
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
            throw `Invalid chunk header! Expected "${expected.toLowerCase()}" got "${chunk.header.toLowerCase()}"`;
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
            throw `Invalid soundFont! Expected "${expected.toLowerCase()}" got "${text.toLowerCase()}"`;
        }
    }

    /**
     * Get the appropriate preset
     * @param bankNr {number}
     * @param presetNr {number}
     * @returns {Preset}
     */
    getPreset(bankNr, presetNr) {
        let preset = this.presets.find(p => p.bank === bankNr && p.program === presetNr);
        if (!preset)
        {
            preset = this.presets.find(p => p.program === presetNr && p.bank !== 128);
            if(bankNr === 128)
            {
                preset = this.presets.find(p => p.bank === 128 && p.program === presetNr);
                if(!preset)
                {
                    preset = this.presets.find(p => p.bank === 128);
                }
            }
            if(preset) {
                SpessaSynthWarn(`%cPreset ${bankNr}.${presetNr} not found. Replaced with %c${preset.presetName} (${preset.bank}.${preset.program})`,
                    consoleColors.warn,
                    consoleColors.recognized);
            }
        }
        if(!preset)
        {
            SpessaSynthWarn(`Preset ${presetNr} not found. Defaulting to`, this.presets[0].presetName);
            preset = this.presets[0];
        }
        return preset;
    }

    /**
     * gets preset by name
     * @param presetName {string}
     * @returns {Preset}
     */
    getPresetByName(presetName)
    {
        let preset = this.presets.find(p => p.presetName === presetName);
        if(!preset)
        {
            SpessaSynthWarn("Preset not found. Defaulting to:", this.presets[0].presetName);
            preset = this.presets[0];
        }
        return preset;
    }


    /**
     * Merges soundfonts with the given order. Keep in mind that the info chunk is copied from the first one
     * @param soundfonts {...SoundFont2} the soundfonts to merge, the first overwrites the last
     * @returns {SoundFont2}
     */
    static mergeSoundfonts(...soundfonts)
    {
        const mainSf = soundfonts.shift();
        /**
         * @type {Preset[]}
         */
        const presets = mainSf.presets;
        while(soundfonts.length)
        {
            const newPresets = soundfonts.shift().presets;
            newPresets.forEach(newPreset => {
                if(
                    presets.find(existingPreset => existingPreset.bank === newPreset.bank && existingPreset.program === newPreset.program) === undefined
                )
                {
                    presets.push(newPreset);
                }
            })
        }

        return new SoundFont2({presets: presets, info: mainSf.soundFontInfo});
    }
}