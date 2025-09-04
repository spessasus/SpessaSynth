import { encodeAudioBuffer } from "./sl-web-ogg/dist/index.min";
import type { encodeAudioBuffer as abuf } from "sl-web-ogg";

const encodeFunc = encodeAudioBuffer as typeof abuf;

// noinspection JSUnusedGlobalSymbols
export async function encodeVorbis(
    audioData: Float32Array,
    sampleRate: number,
    quality: number
): Promise<Uint8Array> {
    const chunks = await encodeFunc([audioData], sampleRate, {
        quality
    });
    if (!chunks) {
        throw new Error("Unexpected vorbis encoder error.");
    }
    const arr = new Uint8Array(chunks.reduce((l, c) => l + c.length, 0));
    let offset = 0;
    chunks.forEach((c) => {
        arr.set(c, offset);
        offset += c.length;
    });
    return arr;
}
