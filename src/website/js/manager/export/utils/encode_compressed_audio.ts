import {
    createMp3Encoder,
    createOggEncoder,
    type WasmMediaEncoder
} from "wasm-media-encoders";

// Instantiating the WASM modules is expensive, so reuse the encoders after use
let oggEncoderPromise: ReturnType<typeof createOggEncoder> | undefined;
let mp3EncoderPromise: ReturnType<typeof createMp3Encoder> | undefined;

// Samples per channel fed to the encoder at once
const ENCODE_CHUNK_SIZE = 65_536;

export const BITRATE_VORBIS_QUALITY = {
    96: 2,
    128: 4,
    160: 5,
    192: 6,
    256: 8,
    320: 9
} as const;
export type CompressedBitrate = keyof typeof BITRATE_VORBIS_QUALITY;

export interface CompressedAudioOptions {
    /**
     * The target bitrate in kbps.
     */
    bitrate: CompressedBitrate;
}

/**
 * Feeds the channels to a configured encoder in chunks
 * @param encoder
 * @param channels
 * @param gain
 * @param progressCallback
 */
async function encodeChunks(
    encoder: WasmMediaEncoder<"audio/ogg"> | WasmMediaEncoder<"audio/mpeg">,
    channels: Float32Array[],
    gain: number,
    progressCallback?: (progress: number) => unknown
) {
    const length = channels[0].length;
    const parts = new Array<Uint8Array>();
    let totalLength = 0;
    for (let i = 0; i < length; i += ENCODE_CHUNK_SIZE) {
        const chunk = channels.map((c) => {
            const part = c.subarray(i, i + ENCODE_CHUNK_SIZE);
            if (gain === 1) {
                return part;
            }
            const scaled = new Float32Array(part.length);
            for (let s = 0; s < part.length; s++) {
                scaled[s] = part[s] * gain;
            }
            return scaled;
        });
        // Returned buffers are owned by the encoder and must be copied for us to use
        const encoded = encoder.encode(chunk).slice();
        parts.push(encoded);
        totalLength += encoded.length;
        if (progressCallback) {
            progressCallback(Math.min(1, (i + ENCODE_CHUNK_SIZE) / length));
            await new Promise((r) => setTimeout(r));
        }
    }
    const final = encoder.finalize().slice();
    parts.push(final);
    totalLength += final.length;

    const out = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

/**
 * Encodes one or two channels as Ogg Vorbis or MP3.
 * @param format The output format.
 * @param channels The channel data (1 or 2 channels of equal length).
 * @param sampleRate The sample rate in Hz.
 * @param options The encoding options.
 * @param gain The gain to multiply the samples by.
 * @param progressCallback Called with the progress from 0 to 1 after each chunk.
 */
export async function encodeCompressedAudio(
    format: "ogg" | "mp3",
    channels: Float32Array[],
    sampleRate: number,
    { bitrate }: CompressedAudioOptions,
    gain = 1,
    progressCallback?: (progress: number) => unknown
) {
    const channelCount = channels.length as 1 | 2;
    if (format === "ogg") {
        oggEncoderPromise ??= createOggEncoder();
        const encoder = await oggEncoderPromise;
        encoder.configure({
            channels: channelCount,
            sampleRate,
            vbrQuality: BITRATE_VORBIS_QUALITY[bitrate]
        });
        return encodeChunks(encoder, channels, gain, progressCallback);
    }
    mp3EncoderPromise ??= createMp3Encoder();
    const encoder = await mp3EncoderPromise;
    // CBR for MP3 for simplicity
    encoder.configure({
        channels: channelCount,
        sampleRate,
        bitrate
    });
    return encodeChunks(encoder, channels, gain, progressCallback);
}

// noinspection JSUnusedGlobalSymbols
export async function encodeVorbis(
    audioData: Float32Array,
    sampleRate: number,
    quality: number
) {
    oggEncoderPromise ??= createOggEncoder();
    const encoder = await oggEncoderPromise;
    encoder.configure({
        channels: 1,
        sampleRate,
        // Encoder expects -1 to 10
        vbrQuality: quality * 10
    });
    return encodeChunks(encoder, [audioData], 1);
}
