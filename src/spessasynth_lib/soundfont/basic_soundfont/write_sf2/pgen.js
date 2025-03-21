import { writeWord } from "../../../utils/byte_functions/little_endian.js";
import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { RiffChunk, writeRIFFChunk } from "../riff_chunk.js";

import { Generator, generatorTypes } from "../generator.js";

/**
 * @this {BasicSoundBank}
 * @returns {IndexedByteArray}
 */
export function getPGEN()
{
    // almost identical to igen, except the correct instrument instead of sample gen
    // goes through all preset zones and writes generators sequentially (add 4 for terminal)
    let pgensize = 4;
    for (const preset of this.presets)
    {
        pgensize += preset.presetZones.reduce((size, z) =>
        {
            // clear instrument and range generators before determining the size
            z.generators = z.generators.filter(g =>
                g.generatorType !== generatorTypes.instrument &&
                g.generatorType !== generatorTypes.keyRange &&
                g.generatorType !== generatorTypes.velRange
            );
            // unshift vel then key and instrument is last
            if (z.velRange.max !== 127 || z.velRange.min !== 0)
            {
                z.generators.unshift(new Generator(
                    generatorTypes.velRange,
                    z.velRange.max << 8 | Math.max(z.velRange.min, 0),
                    false
                ));
            }
            if (z.keyRange.max !== 127 || z.keyRange.min !== 0)
            {
                z.generators.unshift(new Generator(
                    generatorTypes.keyRange,
                    z.keyRange.max << 8 | Math.max(z.keyRange.min, 0),
                    false
                ));
            }
            if (!z.isGlobal)
            {
                // write the instrument
                z.generators.push(new Generator(
                    generatorTypes.instrument,
                    this.instruments.indexOf(z.instrument),
                    false
                ));
            }
            return z.generators.length * 4 + size;
        }, 0);
    }
    const pgendata = new IndexedByteArray(pgensize);
    let pgenIndex = 0;
    for (const preset of this.presets)
    {
        for (const presetZone of preset.presetZones)
        {
            // set the start index here
            presetZone.generatorZoneStartIndex = pgenIndex;
            // write generators
            for (const gen of presetZone.generators)
            {
                // name is deceptive, it works on negatives
                writeWord(pgendata, gen.generatorType);
                writeWord(pgendata, gen.generatorValue);
            }
            pgenIndex += presetZone.generators.length;
        }
    }
    // terminal generator, is zero
    writeWord(pgendata, 0);
    writeWord(pgendata, 0);
    
    return writeRIFFChunk(new RiffChunk(
        "pgen",
        pgendata.length,
        pgendata
    ));
}