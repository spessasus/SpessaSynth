import { IndexedByteArray } from '../../utils/indexed_array.js'
import { writeStringAsBytes } from '../../utils/byte_functions/string.js'
import { writeDword, writeWord } from '../../utils/byte_functions/little_endian.js'
import { RiffChunk, writeRIFFChunk } from '../read/riff_chunk.js'

/**
 * @this {SoundFont2}
 * @param smplStartOffsets {number[]}
 * @param smplEndOffsets {number[]}
 * @returns {IndexedByteArray}
 */
export function getSHDR(smplStartOffsets, smplEndOffsets)
{
    const sampleLength = 46;
    const shdrData = new IndexedByteArray(sampleLength * (this.samples.length + 1 )); // +1 because EOP
    this.samples.forEach((sample, index) => {
        // sample name
        writeStringAsBytes(shdrData, sample.sampleName, 20);
        // start offset
        const dwStart = smplStartOffsets[index];
        writeDword(shdrData, dwStart);
        // end offset
        const dwEnd = smplEndOffsets[index];
        writeDword(shdrData, dwEnd);
        // loop is stored as relative in sample points, change it to absolute sample points here
        writeDword(shdrData, sample.sampleLoopStartIndex / 2 + dwStart);
        writeDword(shdrData, sample.sampleLoopEndIndex / 2 + dwStart);
        // sample rate
        writeDword(shdrData, sample.sampleRate);
        // pitch and correction
        shdrData[shdrData.currentIndex++] = sample.samplePitch;
        shdrData[shdrData.currentIndex++] = sample.samplePitchCorrection;
        // sample link is not supported
        shdrData[shdrData.currentIndex++] = 0;
        shdrData[shdrData.currentIndex++] = 0;
        // sample type
        // unflag from compression if compressed
        sample.sampleType &= -17; // -17 is all 1 except bit 4
        writeWord(shdrData, sample.sampleType);
    });

    // write EOS and zero everything else
    writeStringAsBytes(shdrData, "EOS", sampleLength);
    return writeRIFFChunk(new RiffChunk(
        "shdr",
        shdrData.length,
        shdrData
    ));
}