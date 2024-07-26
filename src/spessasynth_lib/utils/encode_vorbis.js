import { libvorbis } from '../externals/OggVorbisEncoder.js'

/**
 * @param channelAudioData {Float32Array[]}
 * @param sampleRate {number}
 * @param channels {number}
 * @param quality {number} -0.1 to 1
 * @returns {Uint8Array}
 */
export function encodeVorbis(channelAudioData, channels,  sampleRate, quality)
{
    // https://github.com/higuma/ogg-vorbis-encoder-js
    //libvorbis.init();
    const encoder = new libvorbis.OggVorbisEncoder(sampleRate, channels, quality);
    encoder.encode(channelAudioData);
    /**
     * @type {Uint8Array[]}
     */
    const arrs = encoder.finish();
    const outLen = arrs.reduce((l, c) => l + c.length, 0);
    const out = new Uint8Array(outLen);
    let offset = 0;
    for(const a of arrs)
    {
        out.set(a, offset);
        offset += a.length;
    }
    return out;
}