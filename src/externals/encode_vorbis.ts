import { libvorbis } from "./libvorbis/OggVorbisEncoder.min.js";

interface OggVorbisEncoder {
    encode: (data: Float32Array[]) => unknown;
    finish: () => Uint8Array<ArrayBuffer>[];
}

const vorbisEncoder = libvorbis as {
    init: () => unknown;
    OggVorbisEncoder?: (
        sampleRate: number,
        channels: number,
        quality: number
    ) => OggVorbisEncoder;
};

// noinspection JSUnusedGlobalSymbols
export async function encodeVorbis(
    audioDatas: Float32Array[],
    sampleRate: number,
    quality: number
): Promise<Uint8Array> {
    // https://github.com/higuma/ogg-vorbis-encoder-js
    if (!("OggVorbisEncoder" in vorbisEncoder)) {
        vorbisEncoder.init();
    }
    const encoder = vorbisEncoder?.OggVorbisEncoder?.(
        sampleRate,
        audioDatas.length,
        quality
    );
    if (!encoder) {
        throw new Error("Unexpected vorbis encoder error.");
    }
    encoder.encode(audioDatas);
    const arrs = encoder.finish();
    const outLen = arrs.reduce((l, c) => l + c.length, 0);
    const out = new Uint8Array(outLen);
    let offset = 0;
    for (const a of arrs) {
        out.set(a, offset);
        offset += a.length;
    }
    return new Promise((r) => r(out));
}
