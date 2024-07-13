/**
 *
 * @param audioBuffer {AudioBuffer}
 * @param normalizeAudio {boolean} find the max sample point and set it to 1, and scale others with it
 * @returns {Blob}
 */
export function audioBufferToWav(audioBuffer, normalizeAudio = true)
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

    let multiplier;
    if(normalizeAudio)
    {
        // find min and max values to prevent clipping when converting to 16 bits
        const initialMultiplier = 32767;

        const max = Math.max(
            channel1Data.reduce((max, value) => (value > max ? value : max), -Infinity),
            channel2Data.reduce((max, value) => (value > max ? value : max), -Infinity)
        );

        const min = Math.min(
            channel1Data.reduce((min, value) => (value < min ? value : min), Infinity),
            channel2Data.reduce((min, value) => (value < min ? value : min), Infinity)
        );
        const maxAbsValue = Math.max(max, Math.abs(min));
        multiplier = initialMultiplier / maxAbsValue;
    }
    else
    {
        multiplier = 32767;
        // clip audio
        for(let i = 0; i < length; i++)
        {
            channel1Data[i] = Math.min(1, Math.max(-1, channel1Data[i]));
            channel2Data[i] = Math.min(1, Math.max(-1, channel2Data[i]));
        }
    }
    for (let i = 0; i < length; i++)
    {
        // interleave both channels
        const sample1 = channel1Data[i] * multiplier;
        const sample2 = channel2Data[i] * multiplier;

        // convert to 16-bit
        wavData[offset++] = sample1 & 0xff;
        wavData[offset++] = (sample1 >> 8) & 0xff;
        wavData[offset++] = sample2 & 0xff;
        wavData[offset++] = (sample2 >> 8) & 0xff;
    }


    return new Blob([wavData.buffer], { type: 'audio/wav' });
}
