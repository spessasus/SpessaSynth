import { combineArrays, IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeDword, writeWord } from "../../../utils/byte_functions/little_endian.js";
import { generatorTypes } from "../generator.js";
import { writeRIFFOddSize } from "../riff_chunk.js";
import { writeWavesample } from "./wsmp.js";
import { writeArticulator } from "./art2.js";

/**
 * @param zone {BasicInstrumentZone}
 * @param globalZone {BasicInstrumentZone}
 * @this {BasicSoundBank}
 * @returns {IndexedByteArray}
 */
export function writeDLSRegion(zone, globalZone)
{
    // region header
    const rgnhData = new IndexedByteArray(12);
    // keyRange
    writeWord(rgnhData, Math.max(zone.keyRange.min, 0));
    writeWord(rgnhData, zone.keyRange.max);
    // velRange
    writeWord(rgnhData, Math.max(zone.velRange.min, 0));
    writeWord(rgnhData, zone.velRange.max);
    // fusOptions: 0 it seems
    writeWord(rgnhData, 0);
    // keyGroup (exclusive class)
    const exclusive = zone.getGeneratorValue(generatorTypes.exclusiveClass, 0);
    writeWord(rgnhData, exclusive);
    // usLayer
    writeWord(rgnhData, 0);
    const rgnh = writeRIFFOddSize(
        "rgnh",
        rgnhData
    );
    
    let rootKey = zone.getGeneratorValue(generatorTypes.overridingRootKey, zone.sample.samplePitch);
    
    // a lot of soundfonts like to set scale tuning to 0 in drums and keep the key at 60
    // since we implement scale tuning via a dls articulator and fluid doesn't support these,
    // change the root key here
    const scaleTuning = zone.getGeneratorValue(
        generatorTypes.scaleTuning,
        globalZone.getGeneratorValue(generatorTypes.scaleTuning, 100)
    );
    if (scaleTuning === 0 && zone.keyRange.max - zone.keyRange.min === 0)
    {
        rootKey = zone.keyRange.min;
    }
    
    // wave sample (Wsmp)
    const wsmp = writeWavesample(
        zone.sample,
        rootKey,
        zone.getGeneratorValue(
            generatorTypes.fineTune,
            0
        ) + zone.getGeneratorValue(generatorTypes.coarseTune, 0) * 100
        + zone.sample.samplePitchCorrection,
        zone.getGeneratorValue(generatorTypes.initialAttenuation, 0),
        // calculate loop with offsets
        zone.sample.sampleLoopStartIndex
        + zone.getGeneratorValue(generatorTypes.startloopAddrsOffset, 0)
        + zone.getGeneratorValue(generatorTypes.startloopAddrsCoarseOffset, 0) * 32768,
        zone.sample.sampleLoopEndIndex
        + zone.getGeneratorValue(generatorTypes.endloopAddrsOffset, 0)
        + zone.getGeneratorValue(generatorTypes.endloopAddrsCoarseOffset, 0) * 32768,
        zone.getGeneratorValue(generatorTypes.sampleModes, 0)
    );
    
    // wave link (wlnk)
    const wlnkData = new IndexedByteArray(12);
    writeWord(wlnkData, 0); // fusOptions
    writeWord(wlnkData, 0); // usPhaseGroup
    // let sampleType = 0;
    // switch (zone.sample.sampleType)
    // {
    //     default:
    //     case 1:
    //     case 4:
    //         // mono/left
    //         sampleType = 0;
    //         break;
    //
    //     case 2:
    //         // right
    //         sampleType = 1;
    // }
    // 1 means that the first bit is on so mono/left
    writeDword(wlnkData, 1); // ulChannel
    writeDword(wlnkData, this.samples.indexOf(zone.sample)); // ulTableIndex
    const wlnk = writeRIFFOddSize(
        "wlnk",
        wlnkData
    );
    
    // art
    let lar2 = new IndexedByteArray(0);
    if (zone.modulators.length + zone.generators.length > 0)
    {
        const art2 = writeArticulator(zone);
        
        lar2 = writeRIFFOddSize(
            "lar2",
            art2,
            false,
            true
        );
    }
    
    return writeRIFFOddSize(
        "rgn2",
        combineArrays([
            rgnh,
            wsmp,
            wlnk,
            lar2
        ]),
        false,
        true
    );
}