/**
 * initializes libvorbis
 * @returns {null}
 */
declare const libvorbis: {
    OggVorbisEncoder: typeof Encoder;
    init(): null;
};

/**
 * Represents an Ogg Vorbis encoder.
 */
declare class Encoder {
    /**
     * Creates an instance of Encoder
     * @param {number} sampleRate - The sample rate of the audio in Hz
     * @param {number} channels - The number of audio channels (e.g., 1 for mono, 2 for stereo)
     * @param {number} quality - The quality of the encoding, between -0.1 and 1
     */
    constructor(sampleRate: number, channels: number, quality: number);

    /**
     * Encodes audio data
     * @param {Float32Array[]} audioData - An array of Float32Arrays, where each Float32Array represents a block of audio samples
     * @returns {null}
     */
    encode(audioData: Float32Array[]): null;

    /**
     * Finishes the encoding process and retrieves the encoded data
     * @returns {Uint8Array[]} An array of Uint8Arrays representing the encoded audio data
     */
    finish(): Uint8Array[];
}
