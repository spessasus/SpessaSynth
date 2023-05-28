import {readBytesAsUintLittleEndian} from "../../utils/byte_functions.js";
import {ShiftableByteArray} from "../../utils/shiftable_array.js";
import {RiffChunk} from "./riff_chunk.js";
import {Generator} from "./generators.js";
import {Sample} from "./samples.js";
import {Instrument} from "./instruments.js";
import {Modulator} from "./modulators.js";

export class InstrumentZone {
    /**
     * Creates a zone (presetinstrument)
     * @param dataArray {ShiftableByteArray}
     */
    constructor(dataArray) {
        this.generatorZoneStartIndex = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorZoneStartIndex = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorZoneSize = 0;
        this.generatorZoneSize = 0;
        this.keyRange = {min: 0, max: 127};
        this.isGlobal = true;
        /**
         * @type {Generator[]}
         */
        this.generators = [];
        /**
         * @type {Modulator[]}
         */
        this.modulators = [];
    }

    setZoneSize(modulatorZoneSize, generatorZoneSize)
    {
        this.modulatorZoneSize = modulatorZoneSize;
        this.generatorZoneSize = generatorZoneSize;
    }

    /**
     * grab the generators
     * @param generators {Generator[]}
     */
    getGenerators(generators)
    {
        for(let i = this.generatorZoneStartIndex; i < this.generatorZoneStartIndex + this.generatorZoneSize; i++)
        {
            this.generators.push(generators[i]);
        }
    }

    /**
     * grab the modulators
     * @param modulators {Modulator[]}
     */
    getModulators(modulators)
    {
        for(let i = this.modulatorZoneStartIndex; i < this.modulatorZoneStartIndex + this.modulatorZoneSize; i++)
        {
            this.modulators.push(modulators[i]);
        }
    }

    /**
     * Loads the zone's sample
     * @param samples {Sample[]}
     */
    getSample(samples) {
        let sampleID = this.generators.find(g => g.generatorType === "sampleID");
        if (sampleID)
        {
            this.sample = samples[sampleID.generatorValue];
            this.isGlobal = false;
        }
    }

    /**
     * Reads the keyRange of the zone
     */
    getKeyRange()
    {
        let range = this.generators.find(g => g.generatorType === "keyRange");
        if(range)
        {
            this.keyRange.min = range.generatorValue & 0x7F;
            this.keyRange.max = (range.generatorValue >> 8) & 0x7F;
        }
    }
}

/**
 * Reads the given instrument zone chunk
 * @param zonesChunk {RiffChunk}
 * @param instrumentGenerators {Generator[]}
 * @param instrumentModulators {Modulator[]}
 * @param instrumentSamples {Sample[]}
 * @returns {InstrumentZone[]}
 */
export function readInstrumentZones(zonesChunk, instrumentGenerators, instrumentModulators, instrumentSamples)
{
    let zones = [];
    while(zonesChunk.chunkData.length > zonesChunk.chunkData.currentIndex)
    {
        let zone = new InstrumentZone(zonesChunk.chunkData);
        if(zones.length > 0)
        {
            let modulatorZoneSize = zone.modulatorZoneStartIndex - zones[zones.length - 1].modulatorZoneStartIndex;
            let generatorZoneSize = zone.generatorZoneStartIndex - zones[zones.length - 1].generatorZoneStartIndex;
            zones[zones.length - 1].setZoneSize(modulatorZoneSize, generatorZoneSize);
            zones[zones.length - 1].getGenerators(instrumentGenerators);
            zones[zones.length - 1].getModulators(instrumentModulators);
            zones[zones.length - 1].getSample(instrumentSamples);
            zones[zones.length - 1].getKeyRange();
        }
        zones.push(zone);
    }
    return zones;
}

export class PresetZone {
    /**
     * Creates a zone (preset)
     * @param dataArray {ShiftableByteArray}
     */
    constructor(dataArray) {
        this.generatorZoneStartIndex = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorZoneStartIndex = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorZoneSize = 0;
        this.generatorZoneSize = 0;
        this.keyRange = {min: 0, max: 127};
        this.isGlobal = true;
        /**
         * @type {Generator[]}
         */
        this.generators = [];
        /**
         * @type {Modulator[]}
         */
        this.modulators = [];
    }

    setZoneSize(modulatorZoneSize, generatorZoneSize)
    {
        this.modulatorZoneSize = modulatorZoneSize;
        this.generatorZoneSize = generatorZoneSize;
    }

    /**
     * grab the generators
     * @param generators {Generator[]}
     */
    getGenerators(generators)
    {
        for(let i = this.generatorZoneStartIndex; i < this.generatorZoneStartIndex + this.generatorZoneSize; i++)
        {
            this.generators.push(generators[i]);
        }
    }

    /**
     * grab the modulators
     * @param modulators {Modulator[]}
     */
    getModulators(modulators)
    {
        for(let i = this.modulatorZoneStartIndex; i < this.modulatorZoneStartIndex + this.modulatorZoneSize; i++)
        {
            this.modulators.push(modulators[i]);
        }
    }

    /**
     * grab the instrument
     * @param instruments {Instrument[]}
     */
    getInstrument(instruments)
    {
        let instrumentID = this.generators.find(g => g.generatorType === "instrument");
        if(instrumentID) {
            this.instrument = instruments[instrumentID.generatorValue];
            this.isGlobal = false;
        }
    }

    /**
     * Reads the keyRange of the zone
     */
    getKeyRange()
    {
        let range = this.generators.find(g => g.generatorType === "keyRange");
        if(range)
        {
            this.keyRange.min = range.generatorValue & 0x7F;
            this.keyRange.max = (range.generatorValue >> 8) & 0x7F;
        }
    }
}

/**
 * Reads the given preset zone chunk
 * @param zonesChunk {RiffChunk}
 * @param presetGenerators {Generator[]}
 * @param instruments {Instrument[]}
 * @param presetModulators {Modulator[]}
 * @returns {PresetZone[]}
 */
export function readPresetZones(zonesChunk, presetGenerators, presetModulators, instruments)
{
    let zones = [];
    while(zonesChunk.chunkData.length > zonesChunk.chunkData.currentIndex)
    {
        let zone = new PresetZone(zonesChunk.chunkData);
        if(zones.length > 0)
        {
            let modulatorZoneSize = zone.modulatorZoneStartIndex - zones[zones.length - 1].modulatorZoneStartIndex;
            let generatorZoneSize = zone.generatorZoneStartIndex - zones[zones.length - 1].generatorZoneStartIndex;
            zones[zones.length - 1].setZoneSize(modulatorZoneSize, generatorZoneSize);
            zones[zones.length - 1].getGenerators(presetGenerators);
            zones[zones.length - 1].getModulators(presetModulators);
            zones[zones.length - 1].getInstrument(instruments);
            zones[zones.length - 1].getKeyRange();
        }
        zones.push(zone);
    }
    return zones;
}