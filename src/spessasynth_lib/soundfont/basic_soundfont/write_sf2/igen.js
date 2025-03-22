import { writeDword, writeWord } from "../../../utils/byte_functions/little_endian.js";
import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { RiffChunk, writeRIFFChunk } from "../riff_chunk.js";

import { Generator, generatorTypes } from "../generator.js";

/**
 * @this {BasicSoundBank}
 * @returns {IndexedByteArray}
 */
export function getIGEN()
{
    // go through all instruments -> zones and write generators sequentially (add 4 for terminal)
    let igensize = 4;
    for (const inst of this.instruments)
    {
        igensize += inst.instrumentZones.reduce((sum, z) =>
        {
            // clear sample and range generators before determining the size
            z.generators = z.generators.filter(g =>
                g.generatorType !== generatorTypes.sampleID &&
                g.generatorType !== generatorTypes.keyRange &&
                g.generatorType !== generatorTypes.velRange
            );
            // add sample and ranges if necessary
            // unshift vel then key (to make key first) and the instrument is last
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
                // write sample
                z.generators.push(new Generator(
                    generatorTypes.sampleID,
                    this.samples.indexOf(z.sample),
                    false
                ));
            }
            return z.generators.length * 4 + sum;
        }, 0);
    }
    const igendata = new IndexedByteArray(igensize);
    let igenIndex = 0;
    for (const instrument of this.instruments)
    {
        for (const instrumentZone of instrument.instrumentZones)
        {
            // set the start index here
            instrumentZone.generatorZoneStartIndex = igenIndex;
            for (const gen of instrumentZone.generators)
            {
                // name is deceptive, it works on negatives
                writeWord(igendata, gen.generatorType);
                writeWord(igendata, gen.generatorValue);
                igenIndex++;
            }
        }
    }
    // terminal generator, is zero
    writeDword(igendata, 0);
    
    return writeRIFFChunk(new RiffChunk(
        "igen",
        igendata.length,
        igendata
    ));
}