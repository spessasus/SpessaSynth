import { combineArrays, IndexedByteArray } from "../../../utils/indexed_array.js";
import { writeDword, writeWord } from "../../../utils/byte_functions/little_endian.js";
import { writeRIFFOddSize } from "../riff_chunk.js";
import { writeWavesample } from "./wsmp.js";
import { getStringBytesZero } from "../../../utils/byte_functions/string.js";
import { SpessaSynthInfo } from "../../../utils/loggin.js";
import { consoleColors } from "../../../utils/other.js";

/**
 * @param sample {BasicSample}
 * @returns {IndexedByteArray}
 */
export function writeDLSSample(sample)
{
    const fmtData = new IndexedByteArray(18);
    writeWord(fmtData, 1); // wFormatTag
    writeWord(fmtData, 1); // wChannels
    writeDword(fmtData, sample.sampleRate);
    writeDword(fmtData, sample.sampleRate * 2); // 16-bit samples
    writeWord(fmtData, 2); // wBlockAlign
    writeWord(fmtData, 16); // wBitsPerSample
    const fmt = writeRIFFOddSize(
        "fmt ",
        fmtData
    );
    let loop = 1;
    if (sample.sampleLoopStartIndex + Math.abs(sample.getAudioData().length - sample.sampleLoopEndIndex) < 2)
    {
        loop = 0;
    }
    const wsmp = writeWavesample(
        sample,
        sample.samplePitch,
        sample.samplePitchCorrection,
        0,
        sample.sampleLoopStartIndex,
        sample.sampleLoopEndIndex,
        loop
    );
    const audio = sample.getAudioData();
    let data;
    // if sample is compressed, getRawData cannot be used
    if (sample.isCompressed)
    {
        const data16 = new Int16Array(audio.length);
        
        for (let i = 0; i < audio.length; i++)
        {
            // 32,767, as 32,768 may cause overflow (because vorbis can go above 1 sometimes)
            data16[i] = audio[i] * 32767;
        }
        
        
        data = writeRIFFOddSize(
            "data",
            new IndexedByteArray(data16.buffer)
        );
    }
    else
    {
        data = writeRIFFOddSize(
            "data",
            sample.getRawData()
        );
    }
    
    const inam = writeRIFFOddSize(
        "INAM",
        getStringBytesZero(sample.sampleName)
    );
    const info = writeRIFFOddSize(
        "INFO",
        inam,
        false,
        true
    );
    SpessaSynthInfo(
        `%cSaved %c${sample.sampleName}%c succesfully!`,
        consoleColors.recognized,
        consoleColors.value,
        consoleColors.recognized
    );
    return writeRIFFOddSize(
        "wave",
        combineArrays([
            fmt,
            wsmp,
            data,
            info
        ]),
        false,
        true
    );
}