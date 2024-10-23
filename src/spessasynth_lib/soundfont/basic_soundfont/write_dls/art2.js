import { getDLSArticulatorFromSf2Generator, getDLSArticulatorFromSf2Modulator } from "./modulator_converter.js";
import { writeRIFFOddSize } from "../riff_chunk.js";
import { combineArrays, IndexedByteArray } from "../../../utils/indexed_array.js";
import { generatorTypes } from "../generator.js";
import { writeDword } from "../../../utils/byte_functions/little_endian.js";

/**
 * @param zone {BasicInstrumentZone}
 * @returns {IndexedByteArray}
 */
export function writeArticulator(zone)
{
    /**
     * @type {Articulator[]}
     */
    const generators = zone.generators.reduce((arrs, g) =>
    {
        if (
            g.generatorType === generatorTypes.sampleModes ||
            g.generatorType === generatorTypes.initialAttenuation ||
            g.generatorType === generatorTypes.keyRange ||
            g.generatorType === generatorTypes.velRange ||
            g.generatorType === generatorTypes.sampleID ||
            g.generatorType === generatorTypes.fineTune ||
            g.generatorType === generatorTypes.coarseTune
        )
        {
            return arrs;
        }
        const art = getDLSArticulatorFromSf2Generator(g, arrs);
        if (art !== undefined)
        {
            arrs.push(art);
        }
        return arrs;
    }, []);
    /**
     * @type {Articulator[]}
     */
    const modulators = zone.modulators.reduce((arrs, m) =>
    {
        const art = getDLSArticulatorFromSf2Modulator(m, arrs);
        if (art !== undefined)
        {
            arrs.push(art);
        }
        return arrs;
    }, []);
    generators.push(...modulators);
    
    const art2Data = new IndexedByteArray(8);
    writeDword(art2Data, 8); // cbSize
    writeDword(art2Data, generators.length); // cbConnectionBlocks
    
    
    const out = generators.map(a => a.writeArticulator());
    return writeRIFFOddSize(
        "art2",
        combineArrays([art2Data, ...out])
    );
}