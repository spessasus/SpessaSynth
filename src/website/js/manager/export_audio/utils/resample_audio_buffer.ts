// Copied from spessasynth_lib
export async function resampleAudioBuffer(
    audioBuffer: AudioBuffer,
    sampleRate: number
) {
    if (audioBuffer.sampleRate === sampleRate) {
        return audioBuffer;
    }

    const offline = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.ceil(audioBuffer.duration * sampleRate),
        sampleRate
    );
    const source = offline.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offline.destination);
    source.start(0);
    return await offline.startRendering();
}
