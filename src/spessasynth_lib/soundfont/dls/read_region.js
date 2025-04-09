import { readLittleEndian, signedInt16 } from "../../utils/byte_functions/little_endian.js";
import { findRIFFListType, readRIFFChunk } from "../basic_soundfont/riff_chunk.js";
import { DLSZone } from "./dls_zone.js";
import { Generator, generatorTypes } from "../basic_soundfont/generator.js";

/**
 * @this {DLSSoundFont}
 * @param chunk {RiffChunk}
 * @returns {DLSZone}
 */
export function readRegion(chunk)
{
    // regions are essentially instrument zones
    
    /**
     * read chunks in the region
     * @type {RiffChunk[]}
     */
    const regionChunks = [];
    while (chunk.chunkData.length > chunk.chunkData.currentIndex)
    {
        regionChunks.push(readRIFFChunk(chunk.chunkData));
    }
    
    // region header
    const regionHeader = regionChunks.find(c => c.header === "rgnh");
    // key range
    let keyMin = readLittleEndian(regionHeader.chunkData, 2);
    let keyMax = readLittleEndian(regionHeader.chunkData, 2);
    // vel range
    let velMin = readLittleEndian(regionHeader.chunkData, 2);
    let velMax = readLittleEndian(regionHeader.chunkData, 2);
    
    // a fix for not cool files
    if (velMin === 0 && velMax === 0)
    {
        velMax = 127;
        velMin = 0;
    }
    // cannot do the same to key zones sadly
    
    const zone = new DLSZone(
        { min: keyMin, max: keyMax },
        { min: velMin, max: velMax }
    );
    
    // fusOptions: no idea about that one???
    readLittleEndian(regionHeader.chunkData, 2);
    
    // keyGroup: essentially exclusive class
    const exclusive = readLittleEndian(regionHeader.chunkData, 2);
    if (exclusive !== 0)
    {
        zone.generators.push(new Generator(generatorTypes.exclusiveClass, exclusive));
    }
    
    // lart
    const lart = findRIFFListType(regionChunks, "lart");
    const lar2 = findRIFFListType(regionChunks, "lar2");
    this.readLart(lart, lar2, zone);
    
    // wsmp: wave sample chunk
    zone.isGlobal = false;
    const waveSampleChunk = regionChunks.find(c => c.header === "wsmp");
    // cbSize
    readLittleEndian(waveSampleChunk.chunkData, 4);
    let originalKey = readLittleEndian(waveSampleChunk.chunkData, 2);
    
    // sFineTune
    let pitchCorrection = signedInt16(
        waveSampleChunk.chunkData[waveSampleChunk.chunkData.currentIndex++],
        waveSampleChunk.chunkData[waveSampleChunk.chunkData.currentIndex++]
    );
    
    // gain correction: Each unit of gain represents 1/655360 dB
    // it is set after linking the sample
    const gainCorrection = readLittleEndian(waveSampleChunk.chunkData, 4);
    // convert to signed and turn into attenuation (invert)
    const dbCorrection = (gainCorrection | 0) / -655360;
    
    // skip options
    readLittleEndian(waveSampleChunk.chunkData, 4);
    
    // read loop count (always one or zero)
    const loopsAmount = readLittleEndian(waveSampleChunk.chunkData, 4);
    let loopingMode;
    const loop = { start: 0, end: 0 };
    if (loopsAmount === 0)
    {
        // no loop
        loopingMode = 0;
    }
    else
    {
        // ignore cbSize
        readLittleEndian(waveSampleChunk.chunkData, 4);
        // loop type: loop normally or loop until release (like soundfont)
        const loopType = readLittleEndian(waveSampleChunk.chunkData, 4); // why is it long?
        if (loopType === 0)
        {
            loopingMode = 1;
        }
        else
        {
            loopingMode = 3;
        }
        loop.start = readLittleEndian(waveSampleChunk.chunkData, 4);
        const loopLength = readLittleEndian(waveSampleChunk.chunkData, 4);
        loop.end = loop.start + loopLength;
    }
    
    // wave link
    const waveLinkChunk = regionChunks.find(c => c.header === "wlnk");
    if (waveLinkChunk === undefined)
    {
        // No wave link means no sample. What? Why is it even here then?
        return undefined;
    }
    
    // flags
    readLittleEndian(waveLinkChunk.chunkData, 2);
    // phase group
    readLittleEndian(waveLinkChunk.chunkData, 2);
    // channel
    readLittleEndian(waveLinkChunk.chunkData, 4);
    // sampleID
    const sampleID = readLittleEndian(waveLinkChunk.chunkData, 4);
    // noinspection JSValidateTypes
    /**
     * @type {DLSSample}
     */
    const sample = this.samples[sampleID];
    if (sample === undefined)
    {
        throw new Error("Invalid sample ID!");
    }
    
    // this correction overrides the sample gain correction
    const actualDbCorrection = dbCorrection || sample.sampleDbAttenuation;
    // convert to centibels
    const attenuation = (actualDbCorrection * 10) / 0.4; // make sure to apply EMU correction
    
    zone.setWavesample(
        attenuation, loopingMode,
        loop,
        originalKey,
        sample,
        sampleID,
        pitchCorrection
    );
    return zone;
}