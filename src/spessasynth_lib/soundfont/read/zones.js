import {readBytesAsUintLittleEndian} from "../../utils/byte_functions/little_endian.js";
import {IndexedByteArray} from "../../utils/indexed_array.js";
import {RiffChunk} from "./riff_chunk.js";
import {Generator, generatorTypes} from "./generators.js";
import {Sample} from "./samples.js";
import {Instrument} from "./instruments.js";
import {Modulator} from "./modulators.js";

/**
 * zones.js
 * purpose: reads instrumend and preset zones from soundfont and gets their respective samples and generators and modulators
 */

export class InstrumentZone {
    /**
     * Creates a zone (instrument)
     * @param dataArray {IndexedByteArray}
     * @param index {number}
     */
    constructor(dataArray, index)
    {
        this.generatorZoneStartIndex = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorZoneStartIndex = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorZoneSize = 0;
        this.generatorZoneSize = 0;
        this.zoneID = index;
        this.keyRange = {min: 0, max: 127};
        this.velRange = {min: 0, max: 127}
        this.isGlobal = true;
        this.useCount = 0;

        /**
         * @type {Generator[]}
         */
        this.generators = [];
        /**
         * @type {Modulator[]}
         */
        this.modulators = [];
    }

    deleteZone()
    {
        this.useCount--;
        if(this.isGlobal)
        {
            return;
        }
        this.sample.useCount--;
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
    getSample(samples)
    {
        let sampleID = this.generators.find(g => g.generatorType === generatorTypes.sampleID);
        if (sampleID)
        {
            this.sample = samples[sampleID.generatorValue];
            this.isGlobal = false;
            this.sample.useCount++;
        }
    }

    /**
     * Reads the keyRange of the zone
     */
    getKeyRange()
    {
        let range = this.generators.find(g => g.generatorType === generatorTypes.keyRange);
        if(range)
        {
            this.keyRange.min = range.generatorValue & 0x7F;
            this.keyRange.max = (range.generatorValue >> 8) & 0x7F;
        }
    }

    /**
     * reads the velolicty range of the zone
     */
    getVelRange()
    {
        let range = this.generators.find(g => g.generatorType === generatorTypes.velRange);
        if(range)
        {
            this.velRange.min = range.generatorValue & 0x7F;
            this.velRange.max = (range.generatorValue >> 8) & 0x7F;
        }
    }
}

/**
 * Reads the given instrument zone read
 * @param zonesChunk {RiffChunk}
 * @param instrumentGenerators {Generator[]}
 * @param instrumentModulators {Modulator[]}
 * @param instrumentSamples {Sample[]}
 * @returns {InstrumentZone[]}
 */
export function readInstrumentZones(zonesChunk, instrumentGenerators, instrumentModulators, instrumentSamples)
{
    /**
     * @type {InstrumentZone[]}
     */
    let zones = [];
    let index = 0;
    while(zonesChunk.chunkData.length > zonesChunk.chunkData.currentIndex)
    {
        let zone = new InstrumentZone(zonesChunk.chunkData, index);
        if(zones.length > 0)
        {
            let modulatorZoneSize = zone.modulatorZoneStartIndex - zones[zones.length - 1].modulatorZoneStartIndex;
            let generatorZoneSize = zone.generatorZoneStartIndex - zones[zones.length - 1].generatorZoneStartIndex;
            zones[zones.length - 1].setZoneSize(modulatorZoneSize, generatorZoneSize);
            zones[zones.length - 1].getGenerators(instrumentGenerators);
            zones[zones.length - 1].getModulators(instrumentModulators);
            zones[zones.length - 1].getSample(instrumentSamples);
            zones[zones.length - 1].getKeyRange();
            zones[zones.length - 1].getVelRange();
        }
        zones.push(zone);
        index++;
    }
    if(zones.length > 1)
    {
        // remove terminal
        zones.pop();
    }
    return zones;
}

export class
PresetZone
{
    /**
     * Creates a zone (preset)
     * @param dataArray {IndexedByteArray}
     * @param index {number}
     */
    constructor(dataArray, index) {
        this.generatorZoneStartIndex = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorZoneStartIndex = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorZoneSize = 0;
        this.generatorZoneSize = 0;
        this.zoneID = index;
        this.keyRange = {min: 0, max: 127};
        this.velRange = {min: 0, max: 127}
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

    deleteZone()
    {
        if(this.isGlobal)
        {
            return;
        }
        this.instrument.removeUseCount();
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
        let instrumentID = this.generators.find(g => g.generatorType === generatorTypes.instrument);
        if(instrumentID)
        {
            this.instrument = instruments[instrumentID.generatorValue];
            this.instrument.addUseCount();
            this.isGlobal = false;
        }
    }

    /**
     * Reads the keyRange of the zone
     */
    getKeyRange()
    {
        let range = this.generators.find(g => g.generatorType === generatorTypes.keyRange);
        if(range)
        {
            this.keyRange.min = range.generatorValue & 0x7F;
            this.keyRange.max = (range.generatorValue >> 8) & 0x7F;
        }
    }

    /**
     * reads the velolicty range of the zone
     */
    getVelRange()
    {
        let range = this.generators.find(g => g.generatorType === generatorTypes.velRange);
        if(range)
        {
            this.velRange.min = range.generatorValue & 0x7F;
            this.velRange.max = (range.generatorValue >> 8) & 0x7F;
        }
    }
}

/**
 * Reads the given preset zone read
 * @param zonesChunk {RiffChunk}
 * @param presetGenerators {Generator[]}
 * @param instruments {Instrument[]}
 * @param presetModulators {Modulator[]}
 * @returns {PresetZone[]}
 */
export function readPresetZones(zonesChunk, presetGenerators, presetModulators, instruments)
{
    /**
     * @type {PresetZone[]}
     */
    let zones = [];
    let index = 0;
    while(zonesChunk.chunkData.length > zonesChunk.chunkData.currentIndex)
    {
        let zone = new PresetZone(zonesChunk.chunkData, index);
        if(zones.length > 0)
        {
            let modulatorZoneSize = zone.modulatorZoneStartIndex - zones[zones.length - 1].modulatorZoneStartIndex;
            let generatorZoneSize = zone.generatorZoneStartIndex - zones[zones.length - 1].generatorZoneStartIndex;
            zones[zones.length - 1].setZoneSize(modulatorZoneSize, generatorZoneSize);
            zones[zones.length - 1].getGenerators(presetGenerators);
            zones[zones.length - 1].getModulators(presetModulators);
            zones[zones.length - 1].getInstrument(instruments);
            zones[zones.length - 1].getKeyRange();
            zones[zones.length - 1].getVelRange();
        }
        zones.push(zone);
        index++;
    }
    if(zones.length > 1)
    {
        // remove terminal
        zones.pop();
    }
    return zones;
}