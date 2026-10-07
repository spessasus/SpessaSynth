import { resampleAudioBuffer } from "./resample_audio_buffer.ts";

import { makeAudioBuffer } from "./make_audio_buffer.ts";

export type StereoAudioChunk = [
    Float32Array<ArrayBuffer>,
    Float32Array<ArrayBuffer>
];

// Copied from spessasynth_lib
export async function renderConvolverBuffer(
    convolverData: StereoAudioChunk,
    impulseResponse: AudioBuffer,
    sampleRate: number,
    progressCallback?: (progress: number) => void
) {
    const offline = new OfflineAudioContext({
        numberOfChannels: 2,
        length: convolverData[0].length,
        sampleRate
    });
    const source = offline.createBufferSource();
    source.buffer = makeAudioBuffer(convolverData, sampleRate);
    const convolver = offline.createConvolver();
    convolver.buffer = await resampleAudioBuffer(impulseResponse, sampleRate);
    source.connect(convolver);
    convolver.connect(offline.destination);
    source.start(0);

    const totalTime = convolverData[0].length / sampleRate;
    let progressTimer;

    if (progressCallback && totalTime > 0) {
        progressTimer = setInterval(() => {
            progressCallback(Math.min(offline.currentTime / totalTime, 1));
        }, 250);
    }

    const rendered = await offline.startRendering();

    if (progressTimer) {
        clearInterval(progressTimer);
    }
    return rendered;
}
