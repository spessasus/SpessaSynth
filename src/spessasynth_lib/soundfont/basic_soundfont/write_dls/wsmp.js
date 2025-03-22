import { writeDword, writeWord } from "../../../utils/byte_functions/little_endian.js";
import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeRIFFOddSize } from "../riff_chunk.js";

const WSMP_SIZE = 20;

/**
 * @param sample {BasicSample}
 * @param rootKey {number}
 * @param tuning {number}
 * @param attenuationCentibels {number} CENTIBELS, NO CORRECTION
 * @param loopStart {number}
 * @param loopEnd {number}
 * @param loopingMode {number}
 * @returns {IndexedByteArray}
 */
export function writeWavesample(
    sample,
    rootKey,
    tuning,
    attenuationCentibels,
    loopStart,
    loopEnd,
    loopingMode)
{
    let loopCount = loopingMode === 0 ? 0 : 1;
    const wsmpData = new IndexedByteArray(WSMP_SIZE + loopCount * 16);
    writeDword(wsmpData, WSMP_SIZE); // cbSize
    // usUnityNote (apply root pitch here)
    writeWord(wsmpData, rootKey);
    // sFineTune
    writeWord(wsmpData, tuning);
    
    // gain correction, use InitialAttenuation, apply attenuation correction
    const attenuationCb = attenuationCentibels * 0.4;
    
    // gain correction: Each unit of gain represents 1/655360 dB
    const lGain = Math.floor(attenuationCb * -65536);
    writeDword(wsmpData, lGain);
    // fulOptions: has to be 2, according to all DLS files I have
    writeDword(wsmpData, 2);
    
    const loopSize = loopEnd - loopStart;
    let ulLoopType = 0;
    switch (loopingMode)
    {
        default:
        case 0:
            // no loop
            loopCount = 0;
            break;
        
        case 1:
            // loop
            ulLoopType = 0;
            loopCount = 1;
            break;
        
        case 3:
            // loop and release
            ulLoopType = 1;
            loopCount = 1;
    }
    
    // cSampleLoops
    writeDword(wsmpData, loopCount);
    if (loopCount === 1)
    {
        writeDword(wsmpData, 16); // cbSize
        writeDword(wsmpData, ulLoopType);
        writeDword(wsmpData, loopStart);
        writeDword(wsmpData, loopSize);
    }
    return writeRIFFOddSize(
        "wsmp",
        wsmpData
    );
}