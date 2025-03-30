import { readLittleEndian } from "../../utils/byte_functions/little_endian.js";
import { IndexedByteArray } from "../../utils/indexed_array.js";
import { RiffChunk } from "../basic_soundfont/riff_chunk.js";
import { BasicInstrumentZone, BasicPresetZone } from "../basic_soundfont/basic_zones.js";
import { Generator, generatorTypes } from "../basic_soundfont/generator.js";
import { Modulator } from "../basic_soundfont/modulator.js";

/**
 * zones.js
 * purpose: reads instrumend and preset zones from soundfont and gets their respective samples and generators and modulators
 */

export class InstrumentZone extends BasicInstrumentZone
{
    /**
     * Creates a zone (instrument)
     * @param dataArray {IndexedByteArray}
     */
    constructor(dataArray)
    {
        super();
        this.generatorZoneStartIndex = readLittleEndian(dataArray, 2);
        this.modulatorZoneStartIndex = readLittleEndian(dataArray, 2);
        this.modulatorZoneSize = 0;
        this.generatorZoneSize = 0;
        this.isGlobal = true;
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
        for (let i = this.generatorZoneStartIndex; i < this.generatorZoneStartIndex + this.generatorZoneSize; i++)
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
        for (let i = this.modulatorZoneStartIndex; i < this.modulatorZoneStartIndex + this.modulatorZoneSize; i++)
        {
            this.modulators.push(modulators[i]);
        }
    }
    
    /**
     * Loads the zone's sample
     * @param samples {BasicSample[]}
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
        if (range)
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
        if (range)
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
 * @param instrumentSamples {BasicSample[]}
 * @returns {InstrumentZone[]}
 */
export function readInstrumentZones(zonesChunk, instrumentGenerators, instrumentModulators, instrumentSamples)
{
    /**
     * @type {InstrumentZone[]}
     */
    let zones = [];
    while (zonesChunk.chunkData.length > zonesChunk.chunkData.currentIndex)
    {
        let zone = new InstrumentZone(zonesChunk.chunkData);
        if (zones.length > 0)
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
    }
    if (zones.length > 1)
    {
        // remove terminal
        zones.pop();
    }
    return zones;
}

export class PresetZone extends BasicPresetZone
{
    /**
     * Creates a zone (preset)
     * @param dataArray {IndexedByteArray}
     */
    constructor(dataArray)
    {
        super();
        this.generatorZoneStartIndex = readLittleEndian(dataArray, 2);
        this.modulatorZoneStartIndex = readLittleEndian(dataArray, 2);
        this.modulatorZoneSize = 0;
        this.generatorZoneSize = 0;
        this.isGlobal = true;
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
        for (let i = this.generatorZoneStartIndex; i < this.generatorZoneStartIndex + this.generatorZoneSize; i++)
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
        for (let i = this.modulatorZoneStartIndex; i < this.modulatorZoneStartIndex + this.modulatorZoneSize; i++)
        {
            this.modulators.push(modulators[i]);
        }
    }
    
    /**
     * grab the instrument
     * @param instruments {BasicInstrument[]}
     */
    getInstrument(instruments)
    {
        let instrumentID = this.generators.find(g => g.generatorType === generatorTypes.instrument);
        if (instrumentID)
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
        if (range)
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
        if (range)
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
 * @param instruments {BasicInstrument[]}
 * @param presetModulators {Modulator[]}
 * @returns {PresetZone[]}
 */
export function readPresetZones(zonesChunk, presetGenerators, presetModulators, instruments)
{
    /**
     * @type {PresetZone[]}
     */
    let zones = [];
    while (zonesChunk.chunkData.length > zonesChunk.chunkData.currentIndex)
    {
        let zone = new PresetZone(zonesChunk.chunkData);
        if (zones.length > 0)
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
    }
    if (zones.length > 1)
    {
        // remove terminal
        zones.pop();
    }
    return zones;
}