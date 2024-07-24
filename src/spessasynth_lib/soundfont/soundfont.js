import { IndexedByteArray } from '../utils/indexed_array.js'
import {readSamples} from "./read/samples.js";
import { readBytesAsUintLittleEndian } from '../utils/byte_functions/little_endian.js'
import { readGenerators, Generator } from './read/generators.js'
import {readInstrumentZones, InstrumentZone, readPresetZones} from "./read/zones.js";
import {Preset, readPresets} from "./read/presets.js";
import {readInstruments, Instrument} from "./read/instruments.js";
import {readModulators, Modulator} from "./read/modulators.js";
import { readRIFFChunk, RiffChunk } from './read/riff_chunk.js'
import { consoleColors } from '../utils/other.js'
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthWarn } from '../utils/loggin.js'
import { readBytesAsString } from '../utils/byte_functions/string.js'
import { write } from './write/write.js'

/**
 * soundfont.js
 * purpose: parses a soundfont2 file
 */

class SoundFont2
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
        SpessaSynthInfo("%cVerifying smpl read...", consoleColors.warn)
        let sampleDataChunk = readRIFFChunk(this.dataArray, false);
        this.verifyHeader(sampleDataChunk, "smpl");
        this.sampleDataStartIndex = this.dataArray.currentIndex;

        SpessaSynthInfo(`%cSkipping sample chunk, length: %c${sdtaChunk.size - 12}`,
            consoleColors.info,
            consoleColors.value);
        this.dataArray.currentIndex += sdtaChunk.size - 12;

        // PDTA
        SpessaSynthInfo("%cLoading preset data read...", consoleColors.warn)
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
        /**
         * Finally, read all the presets
         * @type {Preset[]}
         */
        this.presets = readPresets(presetHeadersChunk, presetZones);
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
    }

    removeUnusedElements()
    {
        this.instruments.forEach(i => {
            if(i.useCount < 1)
            {
                i.instrumentZones.forEach(z => {if(!z.isGlobal) z.sample.useCount--});
            }
        })
        this.instruments = this.instruments.filter(i => i.useCount > 0);
        this.samples = this.samples.filter(s => s.useCount > 0);
    }

    /**
     * @param instrument {Instrument}
     */
    deleteInstrument(instrument)
    {
        if(instrument.useCount > 0)
        {
            throw new Error(`Cannot delete an instrument that has ${instrument.useCount} usages.`);
        }
        this.instruments.splice(this.instruments.indexOf(instrument), 1);
        instrument.deleteInstrument();
        this.removeUnusedElements();
    }

    /**
     * @param sample {Sample}
     */
    deleteSample(sample)
    {
        if(sample.useCount > 0)
        {
            throw new Error(`Cannot delete sample that has ${sample.useCount} usages.`);
        }
        this.samples.splice(this.samples.indexOf(sample), 1);
        this.removeUnusedElements();
    }

    /**
     * @param preset {Preset}
     */
    deletePreset(preset)
    {
        preset.deletePreset();
        this.presets.splice(this.presets.indexOf(preset), 1);
        this.removeUnusedElements();
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

    /**
     * Get the appropriate preset
     * @param bankNr {number}
     * @param presetNr {number}
     * @returns {Preset}
     */
    getPreset(bankNr, presetNr)
    {
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
            if(preset)
            {
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
     * Merges soundfonts with the given order. Keep in mind that the info read is copied from the first one
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
SoundFont2.prototype.write = write;

export { SoundFont2 }