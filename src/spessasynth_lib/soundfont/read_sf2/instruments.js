import { RiffChunk } from "../basic_soundfont/riff_chunk.js";
import { InstrumentZone } from "./zones.js";
import { readLittleEndian } from "../../utils/byte_functions/little_endian.js";
import { readBytesAsString } from "../../utils/byte_functions/string.js";
import { BasicInstrument } from "../basic_soundfont/basic_instrument.js";

/**
 * instrument.js
 * purpose: parses soundfont instrument and stores them as a class
 */

export class Instrument extends BasicInstrument
{
    /**
     * Creates an instrument
     * @param instrumentChunk {RiffChunk}
     */
    constructor(instrumentChunk)
    {
        super();
        this.instrumentName = readBytesAsString(instrumentChunk.chunkData, 20).trim();
        this.instrumentZoneIndex = readLittleEndian(instrumentChunk.chunkData, 2);
        this.instrumentZonesAmount = 0;
    }
    
    /**
     * Loads all the instrument zones, given the amount
     * @param amount {number}
     * @param zones {InstrumentZone[]}
     */
    getInstrumentZones(amount, zones)
    {
        this.instrumentZonesAmount = amount;
        for (let i = this.instrumentZoneIndex; i < this.instrumentZonesAmount + this.instrumentZoneIndex; i++)
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
    while (instrumentChunk.chunkData.length > instrumentChunk.chunkData.currentIndex)
    {
        let instrument = new Instrument(instrumentChunk);
        if (instruments.length > 0)
        {
            let instrumentsAmount = instrument.instrumentZoneIndex - instruments[instruments.length - 1].instrumentZoneIndex;
            instruments[instruments.length - 1].getInstrumentZones(instrumentsAmount, instrumentZones);
        }
        instruments.push(instrument);
    }
    if (instruments.length > 1)
    {
        // remove EOI
        instruments.pop();
    }
    return instruments;
}