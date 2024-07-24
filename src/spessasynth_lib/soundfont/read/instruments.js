import {RiffChunk} from "./riff_chunk.js";
import {InstrumentZone} from "./zones.js";
import {readBytesAsUintLittleEndian} from "../../utils/byte_functions/little_endian.js";
import { readBytesAsString } from '../../utils/byte_functions/string.js'

/**
 * instrument.js
 * purpose: parses soundfont instrument and stores them as a class
 */

export class Instrument
{
    /**
     * Creates an instrument
     * @param instrumentChunk {RiffChunk}
     */
    constructor(instrumentChunk)
    {
        this.instrumentName = readBytesAsString(instrumentChunk.chunkData, 20).trim();
        this.instrumentZoneIndex = readBytesAsUintLittleEndian(instrumentChunk.chunkData, 2);
        this.instrumentZonesAmount = 0;
        /**
         * @type {InstrumentZone[]}
         */
        this.instrumentZones = [];
        this._useCount = 0;
    }

    addUseCount()
    {
        this._useCount++;
        this.instrumentZones.forEach(z => z.useCount++);
    }

    removeUseCount()
    {
        this._useCount--;
        for(let i = 0; i < this.instrumentZones.length; i++)
        {
            if(this.safeDeleteZone(i))
            {
                i--;
            }
        }
    }

    /**
     * @returns {number}
     */
    get useCount()
    {
        return this._useCount;
    }

    deleteInstrument()
    {
        this.instrumentZones.forEach(z => z.deleteZone());
        this.instrumentZones.length = 0;
    }

    /**
     * @param index {number}
     * @returns {boolean} is the zone has been deleted
     */
    safeDeleteZone(index)
    {
        this.instrumentZones[index].useCount--;
        if(this.instrumentZones[index].useCount < 1)
        {
            this.deleteZone(index);
            return true;
        }
        return false;
    }

    /**
     * @param index {number}
     */
    deleteZone(index)
    {
        this.instrumentZones[index].deleteZone();
        this.instrumentZones.splice(index, 1);
    }

    /**
     * Loads all the instrument zones, given the amount
     * @param amount {number}
     * @param zones {InstrumentZone[]}
     */
    getInstrumentZones(amount, zones)
    {
        this.instrumentZonesAmount = amount;
        for(let i = this.instrumentZoneIndex; i < this.instrumentZonesAmount + this.instrumentZoneIndex; i++)
        {
            this.instrumentZones.push(zones[i]);
        }
    }
}

/**
 * Reads the instruments
 * @param instrumentChunk {RiffChunk}
 * @param instrumentZones {InstrumentZone[]}
 * @returns {Instrument[]}
 */
export function readInstruments(instrumentChunk, instrumentZones)
{
    let instruments = [];
    while(instrumentChunk.chunkData.length > instrumentChunk.chunkData.currentIndex)
    {
        let instrument = new Instrument(instrumentChunk);
        if(instruments.length > 0)
        {
            let instrumentsAmount = instrument.instrumentZoneIndex - instruments[instruments.length - 1].instrumentZoneIndex;
            instruments[instruments.length - 1].getInstrumentZones(instrumentsAmount, instrumentZones);
        }
        instruments.push(instrument);
    }
    if(instruments.length > 1)
    {
        // remove EOI
        instruments.pop();
    }
    return instruments;
}