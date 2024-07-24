import { writeWord } from '../../utils/byte_functions/little_endian.js'
import { IndexedByteArray } from '../../utils/indexed_array.js'
import { RiffChunk, writeRIFFChunk } from '../read/riff_chunk.js'
import { generatorTypes } from '../read/generators.js'

/**
 * @this {SoundFont2}
 * @returns {IndexedByteArray}
 */
export function getPGEN()
{
    // almost identical to igen, except correct instrument instead of sample gen
    // go through all preset zones and write generators sequentially (add 4 for terminal)
    let pgensize = 4;
    for(const preset of this.presets)
    {
        pgensize += preset.presetZones.reduce((size, z) => {
            // clear instrument and range generators before derermining the size
            z.generators = z.generators.filter(g =>
                g.generatorType !== generatorTypes.instrument &&
                g.generatorType !== generatorTypes.keyRange &&
                g.generatorType !== generatorTypes.velRange
            );
            // unshift vel then key and instrument is last
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
                // write instrument
                z.generators.push({
                    generatorType: generatorTypes.instrument,
                    generatorValue: this.instruments.indexOf(z.instrument)
                });
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