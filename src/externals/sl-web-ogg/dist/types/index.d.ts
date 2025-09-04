declare module "sl-web-ogg" {
    import { EncodeOptions } from "./types";
    export type { EncodeTag, EncodeOptions } from "./types";

    /**
     * Encodes an AudioBuffer to an Ogg blob.
     *
     * @param {Float32Array[]} audioData - the audio channels.
     * @param {number} sampleRate - the sample rate in Hertz.
     * @param {EncodeOptions} encodeOptions An optional object where you can set the following members:
     *    quality: A number between 0 and 1. Default is .5.
     *    tags: An array of objects with "tag" and "value" members containing strings. "tag" values can't contain
     *          tabs ('\t') or equal signs ("="). "value" values can't contain tabs.
     * @throws {Error} If tags in an invalid format were passed or something unexpected happens.
     * @returns {Promise<Uint8Array[]>} A Blob containing the encoded Ogg file.
     */
    export function encodeAudioBuffer(
        audioData: Float32Array[],
        sampleRate: number,
        encodeOptions?: Partial<EncodeOptions>
    ): Promise<Uint8Array[]>;
}
