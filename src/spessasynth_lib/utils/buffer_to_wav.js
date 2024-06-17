/**
 *
 * @param audioBuffer {AudioBuffer}
 * @returns {Blob}
 */
export function audioBufferToWav(audioBuffer)
{

    const channel1Data = audioBuffer.getChannelData(0);
    const channel2Data = audioBuffer.getChannelData(1);
    const length = channel1Data.length;

    const bytesPerSample = 2; // 16-bit PCM

    // Prepare the header
    const headerSize = 44;
    const dataSize = length * 2 * bytesPerSample; // 2 channels, 16-bit per channel
    const fileSize = headerSize + dataSize - 8; // total file size minus the first 8 bytes
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

    const wavData = new Uint8Array(headerSize + dataSize);
    wavData.set(header, 0);

    // Interleave audio data (combine channels)
    let offset = headerSize;
    for (let i = 0; i < length; i++)
    {
        // interleave both channels
        const sample1 = Math.max(-1, Math.min(1, channel1Data[i])) * 0x7FFF;
        const sample2 = Math.max(-1, Math.min(1, channel2Data[i])) * 0x7FFF;

        // convert to 16-bit
        wavData[offset++] = sample1 & 0xff;
        wavData[offset++] = (sample1 >> 8) & 0xff;
        wavData[offset++] = sample2 & 0xff;
        wavData[offset++] = (sample2 >> 8) & 0xff;
    }


    return new Blob([wavData.buffer], { type: 'audio/wav' });
}
