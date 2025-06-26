import { libvorbis } from "./libvorbis/OggVorbisEncoder.min.js";

/**
 * @typedef {function} EncodeVorbisFunction
 * @param audioDatas {Float32Array[]}
 * @param sampleRate {number}
 * @param quality {number}
 * @returns {Uint8Array}
 */

/**
 * @param audioDatas {Float32Array[]}
 * @param sampleRate {number}
 * @param quality {number}
 * @returns {Uint8Array}
 */
export async function encodeVorbis(audioDatas, sampleRate, quality)
{
    // https://github.com/higuma/ogg-vorbis-encoder-js
    //libvorbis.init();
    const encoder = new libvorbis.OggVorbisEncoder(sampleRate, audioDatas.length, quality);
    encoder.encode(audioDatas);
    /**
     * @type {Uint8Array[]}
     */
    const arrs = encoder.finish();
    const outLen = arrs.reduce((l, c) => l + c.length, 0);
    const out = new Uint8Array(outLen);
    let offset = 0;
    for (const a of arrs)
    {
        out.set(a, offset);
        offset += a.length;
    }
    return out;
}