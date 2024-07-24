import { RiffChunk, writeRIFFChunk } from '../read/riff_chunk.js'
import { IndexedByteArray } from '../../utils/indexed_array.js'
import { SpessaSynthInfo } from '../../utils/loggin.js'
import { consoleColors } from '../../utils/other.js'

/**
 * @this {SoundFont2}
 * @param smplStartOffsets {number[]}
 * @param smplEndOffsets {number[]}
 * @returns {IndexedByteArray}
 */
export function getSDTA(smplStartOffsets, smplEndOffsets)
{
    // write smpl: write int16 data of each sample linearly
    // get size (calling getAudioData twice doesn't matter since it gets cached)
    const smplSize = this.samples.reduce((total, sample) => total + sample.getAudioData().length * 2 + 46, 0);
    const smplData = new IndexedByteArray(smplSize);
    // resample to int16 and write out
    this.samples.forEach((sample, i) => {
        // this is a float32, resample to int16
        const data = sample.getAudioData();
        const sampleSize = data.length - (sample.isCompressed ? 0 : 1);
        // sfspec24 section 6.1: 46 pad bytes
        const resampled = new IndexedByteArray(sampleSize * 2 + 46);
        for (let i = 0; i < sampleSize; i++)
        {
            const int16 = data[i] * 32767;
            resampled[resampled.currentIndex++] = int16 & 0xFF; // lsb
            resampled[resampled.currentIndex++] = int16 >> 8;   // msb
        }
        smplStartOffsets.push(smplData.currentIndex / 2); // sample data points, not bytes
        smplData.set(resampled, smplData.currentIndex);
        smplData.currentIndex += resampled.length - 46;
        smplEndOffsets.push(smplData.currentIndex / 2);
        SpessaSynthInfo(`%cSaved sample %c${i}%c of %c${this.samples.length}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized);
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