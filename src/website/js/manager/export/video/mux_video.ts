import {
    type AudioCodec,
    BufferTarget,
    EncodedAudioPacketSource,
    EncodedPacket,
    EncodedVideoPacketSource,
    Mp4OutputFormat,
    Output,
    type VideoCodec,
    WebMOutputFormat
} from "mediabunny";
import type { OfflineRenderer } from "../../../renderer/offline/offline_renderer.ts";

export interface VideoMuxAndRenderOptions {
    format: "webm" | "mp4";
    width: number;
    height: number;
    fps: number;
    sampleRate: number;
    normalizeAudio: boolean;
    onProgress?: (fraction: number) => unknown;
}

interface EncoderState {
    error: Error | null;
    waiters: Set<() => void>;
}

function getEncoderError(value: unknown) {
    if (value instanceof Error) {
        return value;
    }
    if (typeof value === "string" && value.length > 0) {
        return new Error(value);
    }
    return new Error("Video export error: encoder failed!");
}

function callWaiters(state: EncoderState) {
    for (const waiter of state.waiters) {
        waiter();
    }
    state.waiters.clear();
}

/**
 * Waits until the encoder queue drains below `drainTo` threshold.
 * Prevents uncompressed raw frames from filling up the memory.
 */
async function waitForEncoderQueue(
    encoder: VideoEncoder | AudioEncoder,
    state: EncoderState,
    maxQueue = 4,
    drainTo = 2
) {
    const initialError = state.error;
    if (initialError instanceof Error) {
        throw initialError;
    }
    if (encoder.encodeQueueSize <= maxQueue) {
        return;
    }
    while (encoder.encodeQueueSize > drainTo) {
        const loopError = state.error;
        if (loopError instanceof Error) {
            throw loopError;
        }
        if (encoder.state === "closed") {
            throw new Error("Encoder closed while draining queue");
        }
        await new Promise<void>((resolve) => {
            state.waiters.add(resolve);
        });
    }
}

const VP9_LEVELS = [
    { cap: 36_864, token: "10" },
    { cap: 82_944, token: "11" },
    { cap: 122_880, token: "20" },
    { cap: 245_760, token: "21" },
    { cap: 552_960, token: "30" },
    { cap: 983_040, token: "31" },
    { cap: 2_228_224, token: "40" },
    { cap: 2_228_224, token: "41" },
    { cap: 8_912_896, token: "50" },
    { cap: 8_912_896, token: "51" },
    { cap: 35_651_584, token: "60" },
    { cap: 35_651_584, token: "61" }
];

const AVC_LEVELS = [
    { cap: 921_600, token: "1f" },
    { cap: 2_073_600, token: "28" },
    { cap: 2_073_600, token: "2a" },
    { cap: 8_294_400, token: "33" },
    { cap: 35_651_584, token: "34" }
];

async function getVideoCodec(
    format: "webm" | "mp4",
    width: number,
    height: number,
    fps: number,
    bitrate: number
) {
    if (typeof VideoEncoder === "undefined") {
        throw new TypeError(
            "WebCodecs video encoding is not supported in this browser."
        );
    }
    const samples = width * height;
    const avcLevel = AVC_LEVELS.find((l) => l.cap >= samples)?.token ?? "34";
    const vp9Level = VP9_LEVELS.find((l) => l.cap >= samples)?.token ?? "61";

    const candidates: {
        codec: string;
        mediaBunnyCodec: VideoCodec;
        mimeCodec: string;
    }[] =
        format === "mp4"
            ? [
                  {
                      codec: `avc1.6400${avcLevel}`,
                      mediaBunnyCodec: "avc",
                      mimeCodec: `avc1.6400${avcLevel}`
                  },
                  {
                      codec: `avc1.4200${avcLevel}`,
                      mediaBunnyCodec: "avc",
                      mimeCodec: `avc1.4200${avcLevel}`
                  },
                  {
                      codec: `vp09.00.${vp9Level}.08`,
                      mediaBunnyCodec: "vp9",
                      mimeCodec: "vp09"
                  },
                  {
                      codec: "av01.0.08M.08",
                      mediaBunnyCodec: "av1",
                      mimeCodec: "av01"
                  }
              ]
            : [
                  {
                      codec: `vp09.00.${vp9Level}.08`,
                      mediaBunnyCodec: "vp9",
                      mimeCodec: "vp09"
                  },
                  {
                      codec: "av01.0.08M.08",
                      mediaBunnyCodec: "av1",
                      mimeCodec: "av01"
                  },
                  {
                      codec: "vp8",
                      mediaBunnyCodec: "vp8",
                      mimeCodec: "vp8"
                  }
              ];

    const attempts = new Array<string>();
    for (const hw of ["prefer-hardware", "no-preference"] as const) {
        for (const c of candidates) {
            const config: VideoEncoderConfig = {
                codec: c.codec,
                width,
                height,
                bitrate,
                framerate: fps,
                hardwareAcceleration: hw
            };
            let ok: boolean;
            try {
                const support = await VideoEncoder.isConfigSupported(config);
                ok = support.supported === true;
            } catch {
                ok = false;
            }

            attempts.push(
                `${c.codec}${hw === "prefer-hardware" ? "+hw" : ""}: ${ok ? "yes" : "no"}`
            );
            if (ok) {
                console.info(
                    `Video export: using ${c.codec} ` +
                        `(${hw === "prefer-hardware" ? "prefer-hardware" : "default"} hint)`
                );
                return {
                    config,
                    ...c
                };
            }
        }
    }
    console.error(
        `Video export: no supported video codec (${attempts.join(", ")})!`
    );
    throw new Error(
        "WebCodecs video encoding is not supported in this browser " +
            `(video probes: ${attempts.join(", ")})`
    );
}

async function getAudioCodec(format: "webm" | "mp4", sampleRate: number) {
    if (typeof AudioEncoder === "undefined") {
        throw new TypeError(
            "WebCodecs audio encoding is not supported in this browser."
        );
    }
    const candidates: {
        config: AudioEncoderConfig;
        mediaBunnyCodec: AudioCodec;
        mimeCodec: string;
    }[] =
        format === "mp4"
            ? [
                  {
                      config: {
                          codec: "mp4a.40.2",
                          sampleRate,
                          numberOfChannels: 2,
                          bitrate: 256_000
                      },
                      mediaBunnyCodec: "aac",
                      mimeCodec: "mp4a.40.2"
                  },
                  {
                      config: {
                          codec: "opus",
                          sampleRate,
                          numberOfChannels: 2,
                          bitrate: 192_000
                      },
                      mediaBunnyCodec: "opus",
                      mimeCodec: "opus"
                  }
              ]
            : [
                  {
                      config: {
                          codec: "opus",
                          sampleRate,
                          numberOfChannels: 2,
                          bitrate: 192_000
                      },
                      mediaBunnyCodec: "opus",
                      mimeCodec: "opus"
                  },
                  {
                      config: {
                          codec: "vorbis",
                          sampleRate,
                          numberOfChannels: 2,
                          bitrate: 256_000
                      },
                      mediaBunnyCodec: "vorbis",
                      mimeCodec: "vorbis"
                  }
              ];

    const attempts: string[] = [];
    for (const cand of candidates) {
        let ok: boolean;
        try {
            const support = await AudioEncoder.isConfigSupported(cand.config);
            ok = support.supported === true;
        } catch {
            ok = false;
        }
        attempts.push(`${cand.config.codec}: ${ok ? "yes" : "no"}`);
        if (ok) {
            console.info(`Video export: using audio ${cand.config.codec}`);
            return cand;
        }
    }
    console.error(
        `Video export: no supported audio codec (${attempts.join(", ")})`
    );
    throw new Error(
        "WebCodecs audio encoding is not supported in this browser " +
            `(audio probes: ${attempts.join(", ")})`
    );
}

/**
 * Muxes rendered frames at `width x height @ fps` with the rendered stereo
 * audio into a video blob.
 */
export async function renderAndMuxVideo(
    audio: AudioBuffer,
    options: VideoMuxAndRenderOptions,
    renderer: OfflineRenderer
) {
    const {
        format,
        width,
        height,
        fps,
        sampleRate,
        normalizeAudio,
        onProgress
    } = options;
    const bitrate = Math.min(
        20_000_000,
        Math.max(1_000_000, Math.round(width * height * fps * 0.1))
    );
    const videoCodec = await getVideoCodec(format, width, height, fps, bitrate);
    const audioCodec = await getAudioCodec(format, sampleRate);

    const totalSamples = audio.length;
    const durationSec = totalSamples / audio.sampleRate;
    const totalFrames = Math.max(1, Math.round(durationSec * fps));

    const output = new Output({
        format:
            format === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat(),
        target: new BufferTarget()
    });

    const videoSource = new EncodedVideoPacketSource(
        videoCodec.mediaBunnyCodec
    );
    const audioSource = new EncodedAudioPacketSource(
        audioCodec.mediaBunnyCodec
    );

    output.addVideoTrack(videoSource);
    output.addAudioTrack(audioSource);
    await output.start();

    let muxTail = Promise.resolve();
    let muxError: Error | null = null;

    const videoState: EncoderState = {
        error: null,
        waiters: new Set()
    };

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
            const packet = EncodedPacket.fromEncodedChunk(chunk);
            muxTail = muxTail
                .then(() => videoSource.add(packet, meta))
                .catch((error: unknown) => {
                    muxError ??= getEncoderError(error);
                });
        },
        error: (error) => {
            videoState.error ??= getEncoderError(error);
            callWaiters(videoState);
            console.error(error);
        }
    });
    videoEncoder.addEventListener("dequeue", () => {
        callWaiters(videoState);
    });
    videoEncoder.configure(videoCodec.config);

    const audioState: EncoderState = {
        error: null,
        waiters: new Set()
    };

    const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => {
            const packet = EncodedPacket.fromEncodedChunk(chunk);
            muxTail = muxTail
                .then(() => audioSource.add(packet, meta))
                .catch((error: unknown) => {
                    muxError ??= getEncoderError(error);
                });
        },
        error: (error) => {
            audioState.error ??= getEncoderError(error);
            callWaiters(audioState);
            console.error(error);
        }
    });
    audioEncoder.addEventListener("dequeue", () => {
        callWaiters(audioState);
    });
    audioEncoder.configure(audioCodec.config);

    const canvas = renderer.canvas;
    const frameDurationUs = 1_000_000 / fps;
    const keyFrameEvery = Math.max(1, Math.round(fps * 5));
    try {
        for (let f = 0; f < totalFrames; f++) {
            // Render and save frame
            renderer.drawFrame(f / fps);
            const frame = new VideoFrame(canvas, {
                timestamp: Math.round(f * frameDurationUs),
                duration: Math.round(frameDurationUs)
            });
            videoEncoder.encode(frame, {
                keyFrame: f % keyFrameEvery === 0
            });
            frame.close();

            // Throttle frame generation to match encoder consumption rate
            // Without this, `encode()` queues faster than the encoder drains
            // And raw frames eat up memory
            if (videoEncoder.encodeQueueSize > 4) {
                await waitForEncoderQueue(videoEncoder, videoState, 4, 2);
            }
            if (f % 10 === 0) {
                // Use the full progress bar
                onProgress?.(f / totalFrames);
            }
        }

        const left = audio.getChannelData(0);
        const right =
            audio.numberOfChannels > 1
                ? audio.getChannelData(1)
                : audio.getChannelData(0);
        let gain = 1;
        if (normalizeAudio) {
            // Normalize gain like core does
            let peak = 0;
            for (let i = 0; i < left.length; i++) {
                const a = Math.abs(left[i]);
                const b = Math.abs(right[i]);
                if (a > peak) {
                    peak = a;
                }
                if (b > peak) {
                    peak = b;
                }
            }
            if (peak > 0 && peak !== 1) {
                gain = 1 / peak;
            }
        }
        const chunkSize = Math.max(1, Math.floor(audio.sampleRate / 100));
        let encodedSamples = 0;
        while (encodedSamples < totalSamples) {
            const count = Math.min(chunkSize, totalSamples - encodedSamples);
            const planar = new Float32Array(count * 2);
            if (gain === 1) {
                planar.set(
                    left.subarray(encodedSamples, encodedSamples + count),
                    0
                );
                planar.set(
                    right.subarray(encodedSamples, encodedSamples + count),
                    count
                );
            } else {
                for (let i = 0; i < count; i++) {
                    planar[i] = left[encodedSamples + i] * gain;
                    planar[count + i] = right[encodedSamples + i] * gain;
                }
            }
            const data = new AudioData({
                format: "f32-planar",
                sampleRate: audio.sampleRate,
                numberOfFrames: count,
                numberOfChannels: 2,
                timestamp: Math.round(
                    (encodedSamples / audio.sampleRate) * 1_000_000
                ),
                data: new Uint8Array(
                    planar.buffer,
                    0,
                    count * 2 * Float32Array.BYTES_PER_ELEMENT
                )
            });
            audioEncoder.encode(data);
            data.close();
            encodedSamples += count;

            if (audioEncoder.encodeQueueSize > 8) {
                await waitForEncoderQueue(audioEncoder, audioState, 8, 4);
            }
            if (encodedSamples % (chunkSize * 50) === 0) {
                onProgress?.(0.85 + 0.15 * (encodedSamples / totalSamples));
            }
        }

        await videoEncoder.flush();
        await audioEncoder.flush();
        const finalVideoError = videoState.error;
        if (finalVideoError) {
            throw getEncoderError(finalVideoError);
        }
        const finalAudioError = audioState.error;
        if (finalAudioError) {
            throw getEncoderError(finalAudioError);
        }
        // Await packets before closing tracks and finalizing
        await muxTail;
        const finalMuxError = muxError;
        if (finalMuxError) {
            throw getEncoderError(finalMuxError);
        }
    } finally {
        try {
            videoEncoder.close();
        } catch {
            // Ignore
        }
        try {
            audioEncoder.close();
        } catch {
            // Ignore
        }
    }
    videoSource.close();
    audioSource.close();
    await output.finalize();

    onProgress?.(1);

    const buffer = output.target.buffer;
    if (!buffer) {
        throw new Error("Video export: Mux failed to produce output buffer!");
    }

    const type =
        format === "mp4"
            ? `video/mp4;codecs="${videoCodec.mimeCodec},${audioCodec.mimeCodec}"`
            : `video/webm;codecs="${videoCodec.mimeCodec},${audioCodec.mimeCodec}"`;

    return new Blob([buffer], { type });
}
