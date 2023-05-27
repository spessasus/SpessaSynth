import {ShiftableUint8Array} from "../utils/shiftable_array.js";
import {readSamples, Sample} from "./chunk/samples.js";
import {readChunk, readBytesAsString} from "../utils/byte_functions.js";
import {readGenerators, Generator} from "./chunk/generators.js";
import {readInstrumentZones, InstrumentZone, readPresetZones} from "./chunk/zones.js";
import {Preset, readPresets} from "./chunk/presets.js";
import {readInstruments, Instrument} from "./chunk/instruments.js";
import {readModulators, Modulator} from "./chunk/modulators.js";

export class SoundFont2Parser
{
    /**
     * Initializes a new SoundFont2 Parser and parses the given data array
     * @param dataArray {ShiftableUint8Array}
     * @param progressCallback {function(string)}
     */
    constructor(dataArray, progressCallback = undefined) {
        this.dataArray = dataArray;
        if(!this.dataArray)
        {
            throw new Error("No data!");
        }

        // read the main chunk
        let firstChunk = readChunk(this.dataArray, false);
        if(firstChunk.header !== "RIFF")
        {
            throw new Error("Invalid RIFF header!");
        }

        if(readBytesAsString(this.dataArray, 4) !== "sfbk")
        {
            throw new Error("Invalid soundFont header!");
        }

        // INFO
        progressCallback("Reading INFO chunk...");
        let infoChunk = readChunk(this.dataArray);
        readBytesAsString(infoChunk.chunkData, 4);

        /**
         * @type {{chunk: string, infoText: string}[]}
         */
        this.soundFontInfo = [];

        while(infoChunk.chunkData.length > infoChunk.chunkData.currentIndex) {
            let chunk = readChunk(infoChunk.chunkData);
            let text = readBytesAsString(chunk.chunkData, chunk.chunkData.length);
            console.log(chunk.header, text);
            this.soundFontInfo.push({chunk: chunk.header, infoText: text});
        }

        // SDTA
        progressCallback("Reading sample data chunk...");
        readChunk(this.dataArray, false);
        readBytesAsString(this.dataArray, 4);

        // smpl
        let sampleDataChunk = readChunk(this.dataArray, false);
        this.sampleDataStartIndex = dataArray.currentIndex;
        dataArray.currentIndex += sampleDataChunk.size;

        // PDTA
        progressCallback("Reading preset data chunk...");
        let presetChunk = readChunk(this.dataArray);
        readBytesAsString(presetChunk.chunkData, 4);

        // read the hydra chunks
        this.presetHeadersChunk = readChunk(presetChunk.chunkData);
        this.presetZonesChunk = readChunk(presetChunk.chunkData);
        this.presetModulatorsChunk = readChunk(presetChunk.chunkData);
        this.presetGeneratorsChunk = readChunk(presetChunk.chunkData);
        this.presetInstrumentsChunk = readChunk(presetChunk.chunkData);
        this.presetInstrumentZonesChunk = readChunk(presetChunk.chunkData);
        this.presetInstrumentModulatorsChunk = readChunk(presetChunk.chunkData);
        this.presetInstrumentGeneratorsChunk = readChunk(presetChunk.chunkData);
        this.presetSamplesChunk = readChunk(presetChunk.chunkData);

        /**
         * read all the sampleOptions
         * @type {Sample[]}
         */
        let samples = readSamples(this.presetSamplesChunk);

        /**
         * read all the instrument generators
         * @type {Generator[]}
         */
        let instrumentGenerators = readGenerators(this.presetInstrumentGeneratorsChunk);

        /**
         * read all the instrument modulators
         * @type {Modulator[]}
         */
        let instrumentModulators = readModulators(this.presetInstrumentModulatorsChunk);

        /**
         * read all the instrument zones
         * @type {InstrumentZone[]}
         */
        let instrumentZones = readInstrumentZones(this.presetInstrumentZonesChunk,
            instrumentGenerators,
            instrumentModulators,
            samples);

        /**
         * read all the instruments
         * @type {Instrument[]}
         */
        let instruments = readInstruments(this.presetInstrumentsChunk, instrumentZones);

        /**
         * read all the preset generators
         * @type {Generator[]}
         */
        let presetGenerators = readGenerators(this.presetGeneratorsChunk);

        /**
         * Read all the preset modulatorrs
         * @type {Modulator[]}
         */
        let presetModulators = readModulators(this.presetModulatorsChunk);

        let presetZones = readPresetZones(this.presetZonesChunk, presetGenerators, presetModulators, instruments);

        /**
         * Finally, read all the presets
         * @type {Preset[]}
         */
        this.presets = readPresets(this.presetHeadersChunk, presetZones);
        console.log("Parsing finished!");
        console.log("Presets:", this.presets.length);

        this.presets.sort((a, b) => (a.program - b.program) + (a.bank - b.bank));
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
                preset = this.presets.find(p => p.bank === 128);
            }
        }
        if(!preset)
        {
            console.warn("Preset not found. Defaulting to:", this.presets[0].presetName);
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
            console.warn("Preset not found. Defaulting to:", this.presets[0].presetName);
            preset = this.presets[0];
        }
        return preset;
    }
}