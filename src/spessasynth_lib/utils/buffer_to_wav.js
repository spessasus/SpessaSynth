/**
 * @typedef {Object} WaveMetadata
 * @property {string|undefined} title - the song's title
 * @property {string|undefined} artist - the song's artist
 * @property {string|undefined} album - the song's album
 * @property {string|undefined} genre - the song's genre
 */

import { combineArrays, IndexedByteArray } from './indexed_array.js'
import { getStringBytes } from './byte_functions/string.js'
import { writeRIFFOddSize } from '../soundfont/basic_soundfont/riff_chunk.js'

/**
 *
 * @param audioBuffer {AudioBuffer}
 * @param normalizeAudio {boolean} find the max sample point and set it to 1, and scale others with it
 * @param channelOffset {number} channel offset and channel offset + 1 get saved
 * @param metadata {WaveMetadata}
 * @returns {Blob}
 */
export function audioBufferToWav(audioBuffer, normalizeAudio = true, channelOffset = 0, metadata = {})
{
    const channel1Data = audioBuffer.getChannelData(channelOffset);
    const channel2Data = audioBuffer.getChannelData(channelOffset + 1);
    const length = channel1Data.length;

    const bytesPerSample = 2; // 16-bit PCM

    // prepare INFO chunk
    let infoChunk = new IndexedByteArray(0);
    const infoOn = Object.keys(metadata).length > 0;
    // INFO chunk
    if(infoOn)
    {
        const encoder = new TextEncoder();
        const infoChunks = [
            getStringBytes("INFO"),
            writeRIFFOddSize("ICMT", encoder.encode("Created with SpessaSynth"), true)
        ];
        if(metadata.artist)
        {
            infoChunks.push(
                writeRIFFOddSize("IART", encoder.encode(metadata.artist), true)
            );
        }
        if(metadata.album)
        {
            infoChunks.push(
                writeRIFFOddSize("IPRD", encoder.encode(metadata.album), true)
            );
        }
        if(metadata.genre)
        {
            infoChunks.push(
                writeRIFFOddSize("IGNR", encoder.encode(metadata.genre), true)
            );
        }
        if(metadata.title)
        {
            infoChunks.push(
                writeRIFFOddSize("INAM", encoder.encode(metadata.title), true)
            );
        }
        infoChunk = writeRIFFOddSize("LIST", combineArrays(infoChunks));
    }

    // Prepare the header
    const headerSize = 44;
    const dataSize = length * 2 * bytesPerSample; // 2 channels, 16-bit per channel
    const fileSize = headerSize + dataSize + infoChunk.length - 8; // total file size minus the first 8 bytes
    const header = new Uint8Array(headerSize);

    // 'RIFF'
    header.set([82, 73, 70, 70], 0);
    // file length
    header.set(new Uint8Array([fileSize & 0xff, (fileSize >> 8) & 0xff, (fileSize >> 16) & 0xff, (fileSize >> 24) & 0xff]), 4);
    // 'WAVE'
    header.set([87, 65, 86, 69], 8);
    // 'fmt '
    header.set([102, 109, 116, 32], 12);
    // fmt chunk length
    header.set([16, 0, 0, 0], 16); // 16 for PCM
    // audio format (PCM)
    header.set([1, 0], 20);
    // number of channels (2)
    header.set([2, 0], 22);
    // sample rate
    const sampleRate = audioBuffer.sampleRate;
    header.set(new Uint8Array([sampleRate & 0xff, (sampleRate >> 8) & 0xff, (sampleRate >> 16) & 0xff, (sampleRate >> 24) & 0xff]), 24);
    // byte rate (sample rate * block align)
    const byteRate = sampleRate * 2 * bytesPerSample; // 2 channels, 16-bit per channel
    header.set(new Uint8Array([byteRate & 0xff, (byteRate >> 8) & 0xff, (byteRate >> 16) & 0xff, (byteRate >> 24) & 0xff]), 28);
    // block align (channels * bytes per sample)
    header.set([4, 0], 32); // 2 channels * 16-bit per channel / 8
    // bits per sample
    header.set([16, 0], 34); // 16-bit

    // data chunk identifier 'data'
    header.set([100, 97, 116, 97], 36);
    // data chunk length
    header.set(new Uint8Array([dataSize & 0xff, (dataSize >> 8) & 0xff, (dataSize >> 16) & 0xff, (dataSize >> 24) & 0xff]), 40);

    let wavData;
    let offset = headerSize;
    if(infoOn)
    {
        wavData = new Uint8Array(headerSize + dataSize + infoChunk.length);
    }
    else
    {
        wavData = new Uint8Array(headerSize + dataSize);
    }
    wavData.set(header, 0);

    // Interleave audio data (combine channels)
    let multiplier = 32767;
    if(normalizeAudio)
    {
        // find min and max values to prevent clipping when converting to 16 bits
        const maxAbsValue = channel1Data.map((v, i) => Math.max(Math.abs(v), Math.abs(channel2Data[i]))).reduce( (a,b) => Math.max(a,b))
        multiplier = maxAbsValue > 0 ? (32767 / maxAbsValue) : 1;
    }
    for (let i = 0; i < length; i++)
    {
        // interleave both channels
        const sample1 = Math.min(32767, Math.max(-37268, channel1Data[i] * multiplier));
        const sample2 = Math.min(32767, Math.max(-37268, channel2Data[i] * multiplier));

        // convert to 16-bit
        wavData[offset++] = sample1 & 0xff;
        wavData[offset++] = (sample1 >> 8) & 0xff;
        wavData[offset++] = sample2 & 0xff;
        wavData[offset++] = (sample2 >> 8) & 0xff;
    }

    if(infoOn)
    {
        wavData.set(infoChunk, offset);
    }

    return new Blob([wavData.buffer], { type: 'audio/wav' });
}
