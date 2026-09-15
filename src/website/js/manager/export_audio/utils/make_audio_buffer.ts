// Copied from spessasynth_lib
import type { StereoAudioChunk } from "./render_convolver_buffer.ts";

export function makeAudioBuffer(
    pair: StereoAudioChunk,
    sampleRate: number
): AudioBuffer {
    const buffer = new AudioBuffer({
        sampleRate,
        numberOfChannels: 2,
        length: pair[0].length
    });
    buffer.copyToChannel(pair[0], 0);
    buffer.copyToChannel(pair[1], 1);
    return buffer;
}
