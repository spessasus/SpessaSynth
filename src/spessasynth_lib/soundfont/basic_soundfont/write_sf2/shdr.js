import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeStringAsBytes } from "../../../utils/byte_functions/string.js";
import { writeDword, writeWord } from "../../../utils/byte_functions/little_endian.js";
import { RiffChunk, writeRIFFChunk } from "../riff_chunk.js";

/**
 * @this {BasicSoundBank}
 * @param smplStartOffsets {number[]}
 * @param smplEndOffsets {number[]}
 * @returns {IndexedByteArray}
 */
export function getSHDR(smplStartOffsets, smplEndOffsets)
{
    const sampleLength = 46;
    const shdrData = new IndexedByteArray(sampleLength * (this.samples.length + 1)); // +1 because EOP
    this.samples.forEach((sample, index) =>
    {
        // sample name
        writeStringAsBytes(shdrData, sample.sampleName, 20);
        // start offset
        const dwStart = smplStartOffsets[index];
        writeDword(shdrData, dwStart);
        // end offset
        const dwEnd = smplEndOffsets[index];
        writeDword(shdrData, dwEnd);
        // loop is stored as relative in sample points, change it to absolute sample points here
        let loopStart = sample.sampleLoopStartIndex + dwStart;
        let loopEnd = sample.sampleLoopEndIndex + dwStart;
        if (sample.isCompressed)
        {
            // https://github.com/FluidSynth/fluidsynth/wiki/SoundFont3Format
            loopStart -= dwStart;
            loopEnd -= dwStart;
        }
        writeDword(shdrData, loopStart);
        writeDword(shdrData, loopEnd);
        // sample rate
        writeDword(shdrData, sample.sampleRate);
        // pitch and correction
        shdrData[shdrData.currentIndex++] = sample.samplePitch;
        shdrData[shdrData.currentIndex++] = sample.samplePitchCorrection;
        // sample link
        writeWord(shdrData, sample.sampleLink);
        // sample type: write raw because we simply copy compressed samples
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