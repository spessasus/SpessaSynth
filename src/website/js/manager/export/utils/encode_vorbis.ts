import { createOggEncoder } from "wasm-media-encoders";

// Instantiating the WASM module is expensive, reuse the encoder after use
let encoderPromise: ReturnType<typeof createOggEncoder> | undefined;

// noinspection JSUnusedGlobalSymbols
export async function encodeVorbis(
    audioData: Float32Array,
    sampleRate: number,
    quality: number
) {
    encoderPromise ??= createOggEncoder();
    const encoder = await encoderPromise;
    encoder.configure({
        channels: 1,
        sampleRate,
        // Encoder expects -1 to 10
        vbrQuality: quality * 10
    });
    // Returned buffers are owned by the encoder and must be copied for us to use
    const encoded = encoder.encode([audioData]).slice();
    const final = encoder.finalize();
    const out = new Uint8Array(encoded.length + final.length);
    out.set(encoded);
    out.set(final, encoded.length);
    return out;
}
