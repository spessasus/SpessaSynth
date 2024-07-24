import { writeDword, writeWord } from '../../utils/byte_functions/little_endian.js'
import { IndexedByteArray } from '../../utils/indexed_array.js'
import { RiffChunk, writeRIFFChunk } from '../read/riff_chunk.js'
import { generatorTypes } from '../read/generators.js'

/**
 * @this {SoundFont2}
 * @returns {IndexedByteArray}
 */
export function getIGEN()
{
    // go through all instruments -> zones and write generators sequentially (add 4 for terminal)
    let igensize = 4;
    for(const inst of this.instruments)
    {
        igensize += inst.instrumentZones.reduce((sum, z) => {
            // clear sample and range generators before derermining the size
            z.generators = z.generators.filter(g =>
                g.generatorType !== generatorTypes.sampleID &&
                g.generatorType !== generatorTypes.keyRange &&
                g.generatorType !== generatorTypes.velRange
            );
            // add sample and ranges if needed
            // unshift vel then key ( to make key first)     and instrument is last
            if(z.velRange.max !== 127 || z.velRange.min !== 0)
            {
                z.generators.unshift({
                    generatorType: generatorTypes.velRange,
                    generatorValue: z.velRange.max << 8 | z.velRange.min
                });
            }
            if(z.keyRange.max !== 127 || z.keyRange.min !== 0)
            {
                z.generators.unshift({
                    generatorType: generatorTypes.keyRange,
                    generatorValue: z.keyRange.max << 8 | z.keyRange.min
                });
            }
            if(!z.isGlobal)
            {
                // write sample
                z.generators.push({
                    generatorType: generatorTypes.sampleID,
                    generatorValue: this.samples.indexOf(z.sample)
                });
            }
            return z.generators.length * 4 + sum;
        }, 0);
    }
    const igendata = new IndexedByteArray(igensize);
    let igenIndex = 0;
    for(const instrument of this.instruments)
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