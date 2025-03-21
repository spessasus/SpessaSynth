import { RiffChunk, writeRIFFChunk } from "../riff_chunk.js";
import { IndexedByteArray } from "../../../utils/indexed_array.js";
import { SpessaSynthInfo } from "../../../utils/loggin.js";
import { consoleColors } from "../../../utils/other.js";

/**
 * @this {BasicSoundBank}
 * @param smplStartOffsets {number[]}
 * @param smplEndOffsets {number[]}
 * @param compress {boolean}
 * @param quality {number}
 * @param vorbisFunc {EncodeVorbisFunction}
 * @returns {IndexedByteArray}
 */
export function getSDTA(smplStartOffsets, smplEndOffsets, compress, quality, vorbisFunc)
{
    // write smpl: write int16 data of each sample linearly
    // get size (calling getAudioData twice doesn't matter since it gets cached)
    const sampleDatas = this.samples.map((s, i) =>
    {
        if (compress)
        {
            s.compressSample(quality, vorbisFunc);
        }
        const r = s.getRawData();
        SpessaSynthInfo(
            `%cEncoded sample %c${i}. ${s.sampleName}%c of %c${this.samples.length}%c. Compressed: %c${s.isCompressed}%c.`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            s.isCompressed ? consoleColors.recognized : consoleColors.unrecognized,
            consoleColors.info
        );
        return r;
    });
    const smplSize = this.samples.reduce((total, s, i) =>
    {
        return total + sampleDatas[i].length + 46;
    }, 0);
    const smplData = new IndexedByteArray(smplSize);
    // resample to int16 and write out
    this.samples.forEach((sample, i) =>
    {
        const data = sampleDatas[i];
        let startOffset;
        let endOffset;
        let jump = data.length;
        if (sample.isCompressed)
        {
            // sf3 offset is in bytes
            startOffset = smplData.currentIndex;
            endOffset = startOffset + data.length;
        }
        else
        {
            // sf2 in sample data points
            startOffset = smplData.currentIndex / 2;
            endOffset = startOffset + data.length / 2;
            jump += 46;
        }
        smplStartOffsets.push(startOffset);
        smplData.set(data, smplData.currentIndex);
        smplData.currentIndex += jump;
        smplEndOffsets.push(endOffset);
    });
    
    const smplChunk = writeRIFFChunk(new RiffChunk(
        "smpl",
        smplData.length,
        smplData
    ), new IndexedByteArray([115, 100, 116, 97])); // `sdta`
    
    return writeRIFFChunk(new RiffChunk(
        "LIST",
        smplChunk.length,
        smplChunk
    ));
}