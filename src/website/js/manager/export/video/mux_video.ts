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
import {
    MAX_WAVEFORM_SAMPLES,
    OfflineRenderer,
    type OfflineRendererData
} from "../../../renderer/offline/offline_renderer.ts";
import {
    callWaiters,
    createVideoEncoder,
    type EncoderState,
    getEncoderError,
    type RenderLane,
    renderLaneFrame,
    waitForEncoderQueue
} from "./encoder_utils.ts";
import type {
    VideoLaneRequest,
    VideoLaneResponse
} from "./video_lane_worker.ts";

export interface VideoMuxAndRenderOptions {
    format: "webm" | "mp4";
    width: number;
    height: number;
    fps: number;
    sampleRate: number;
    normalizeAudio: boolean;
    onProgress?: (fraction: number) => unknown;
}

interface PendingPacket {
    segment: number;
    packet: EncodedPacket;
    meta?: EncodedVideoChunkMetadata;
}

/**
 * Codecs that carry their parameters in-band,
 * so packets from separate encoders can share one track.
 */
const LANE_CODECS = new Set<VideoCodec>(["vp9", "av1", "vp8"]);
/**
 * More lanes did not help on a 16-thread CPU (Chromium VP9 already
 * uses multiple threads per encoder, Firefox becomes draw-bound).
 */
const MAX_DEFAULT_LANES = 4;
const THREADS_PER_LANE = 4;

function getLaneCount(codec: VideoCodec) {
    if (!LANE_CODECS.has(codec)) {
        return 1;
    }
    const threads = navigator.hardwareConcurrency || 1;
    return Math.max(
        1,
        Math.min(MAX_DEFAULT_LANES, Math.floor(threads / THREADS_PER_LANE))
    );
}

/**
 * Rendering the lanes in workers draws them in parallel.
 * Firefox is draw-bound and up to 1.85x faster with workers.
 * Chromium is encoder-bound and ~6% slower, so it renders on the main thread.
 */
function shouldUseWorkers() {
    return typeof Worker !== "undefined" && !("chrome" in window);
}

const VP9_LEVELS = [
    { size: 36_864, rate: 829_440, token: "10" },
    { size: 73_728, rate: 2_764_800, token: "11" },
    { size: 122_880, rate: 4_608_000, token: "20" },
    { size: 245_760, rate: 9_216_000, token: "21" },
    { size: 552_960, rate: 20_736_000, token: "30" },
    { size: 983_040, rate: 36_864_000, token: "31" },
    { size: 2_228_224, rate: 83_558_400, token: "40" },
    { size: 2_228_224, rate: 160_432_128, token: "41" },
    { size: 8_912_896, rate: 311_951_360, token: "50" },
    { size: 8_912_896, rate: 588_251_136, token: "51" },
    { size: 8_912_896, rate: 1_176_502_272, token: "52" },
    { size: 35_651_584, rate: 1_176_502_272, token: "60" },
    { size: 35_651_584, rate: 2_353_004_544, token: "61" },
    { size: 35_651_584, rate: 4_706_009_088, token: "62" }
];

const AVC_LEVELS = [
    { size: 3600, rate: 108_000, token: "1f" },
    { size: 5120, rate: 216_000, token: "20" },
    { size: 8192, rate: 245_760, token: "28" },
    { size: 8704, rate: 522_240, token: "2a" },
    { size: 22_080, rate: 589_824, token: "32" },
    { size: 36_864, rate: 983_040, token: "33" },
    { size: 36_864, rate: 2_073_600, token: "34" },
    { size: 139_264, rate: 4_177_920, token: "3c" },
    { size: 139_264, rate: 8_355_840, token: "3d" },
    { size: 139_264, rate: 16_711_680, token: "3e" }
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
    // Levels limit both the frame size and the processing rate
    const samples = width * height;
    const vp9Level =
        VP9_LEVELS.find((l) => l.size >= samples && l.rate >= samples * fps)
            ?.token ?? "62";
    const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
    const avcLevel =
        AVC_LEVELS.find(
            (l) => l.size >= macroblocks && l.rate >= macroblocks * fps
        )?.token ?? "3e";

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
                hardwareAcceleration: hw,
                // The "quality" mode is several times slower in Firefox
                // (For some reason)
                latencyMode: "realtime"
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
 * @param audio The rendered audio.
 * @param options The video options.
 * @param rendererData The data for the renderers, one is created per encoder lane.
 */
export async function renderAndMuxVideo(
    audio: AudioBuffer,
    options: VideoMuxAndRenderOptions,
    rendererData: OfflineRendererData
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

    const frameDurationUs = 1_000_000 / fps;
    // Every segment starts with a keyframe
    const segmentFrames = Math.max(1, Math.round(fps * 5));
    const segmentCount = Math.ceil(totalFrames / segmentFrames);
    const laneCount = Math.min(
        segmentCount,
        getLaneCount(videoCodec.mediaBunnyCodec)
    );

    /**
     * Encoded packets of each lane, waiting for their segment to be muxed.
     */
    const pending: PendingPacket[][] = Array.from(
        { length: laneCount },
        () => []
    );

    /**
     * Sends the finished packets to the muxer in segment order.
     * @param flushed If all encoders have been flushed.
     */
    let muxSegment = 0;
    const muxPending = (flushed: boolean) => {
        while (muxSegment < segmentCount) {
            const lanePending = pending[muxSegment % laneCount];
            const next = lanePending[0];
            if (next === undefined) {
                if (!flushed) {
                    // The segment may not be finished yet
                    return;
                }
                muxSegment++;
                continue;
            }
            if (next.segment !== muxSegment) {
                // The lane started its next segment, so this one is done
                muxSegment++;
                continue;
            }
            lanePending.shift();
            muxTail = muxTail
                .then(() => videoSource.add(next.packet, next.meta))
                .catch((error: unknown) => {
                    muxError ??= getEncoderError(error);
                });
        }
    };

    /**
     * Maps an encoded chunk from the lane's timeline back to the video and queues it.
     * @param laneIndex The lane that encoded the chunk.
     * @param data The chunk data.
     * @param type The chunk type.
     * @param timestamp The lane timestamp, in microseconds.
     * @param duration The duration, in microseconds.
     * @param meta The encoder metadata.
     */
    const addLanePacket = (
        laneIndex: number,
        data: Uint8Array,
        type: EncodedVideoChunkType,
        timestamp: number,
        duration: number | null,
        meta?: EncodedVideoChunkMetadata
    ) => {
        const laneFrame = Math.round(timestamp / frameDurationUs);
        const round = Math.floor(laneFrame / segmentFrames);
        const segment = round * laneCount + laneIndex;
        const frame = segment * segmentFrames + (laneFrame % segmentFrames);
        pending[laneIndex].push({
            segment,
            packet: new EncodedPacket(
                data,
                type,
                frame === laneFrame
                    ? timestamp / 1e6
                    : Math.round(frame * frameDurationUs) / 1e6,
                (duration ?? 0) / 1e6
            ),
            // The track uses the decoder config of the first lane
            meta: laneIndex === 0 ? meta : undefined
        });
        muxPending(false);
    };

    let framesDone = 0;
    const addFramesDone = (frames: number) => {
        const before = Math.floor(framesDone / 10);
        framesDone += frames;
        if (Math.floor(framesDone / 10) !== before) {
            // Use the full progress bar
            onProgress?.(framesDone / totalFrames);
        }
    };

    /**
     * Renders the lanes on this thread, one frame of each lane at a time,
     * so all encoders stay busy.
     */
    const renderLanesInThread = async () => {
        const lanes = Array.from(
            { length: laneCount },
            (_, laneIndex): RenderLane => {
                const state: EncoderState = {
                    error: null,
                    waiters: new Set()
                };
                const encoder = createVideoEncoder(
                    videoCodec.config,
                    state,
                    (chunk, meta) => {
                        const data = new Uint8Array(chunk.byteLength);
                        chunk.copyTo(data);
                        addLanePacket(
                            laneIndex,
                            data,
                            chunk.type,
                            chunk.timestamp,
                            chunk.duration,
                            meta
                        );
                    }
                );
                return {
                    renderer: new OfflineRenderer(rendererData),
                    encoder,
                    state,
                    nextFrame: 0,
                    encodedFrames: 0
                };
            }
        );
        try {
            for (let round = 0; round < segmentCount; round += laneCount) {
                for (let i = 0; i < segmentFrames; i++) {
                    for (const [laneIndex, lane] of lanes.entries()) {
                        const f = (round + laneIndex) * segmentFrames + i;
                        if (f >= totalFrames) {
                            continue;
                        }
                        await renderLaneFrame(lane, f, i === 0, fps);
                        addFramesDone(1);
                    }
                }
            }
            await Promise.all(lanes.map((lane) => lane.encoder.flush()));
            for (const lane of lanes) {
                const finalVideoError = lane.state.error;
                if (finalVideoError) {
                    throw getEncoderError(finalVideoError);
                }
            }
        } finally {
            for (const lane of lanes) {
                try {
                    lane.encoder.close();
                } catch {
                    // Ignore
                }
            }
        }
    };

    /**
     * Slices the waveforms needed to draw a segment.
     * @param segment The segment index.
     */
    const sliceSegment = (segment: number) => {
        const firstFrame = segment * segmentFrames;
        const lastFrame = Math.min(totalFrames, firstFrame + segmentFrames) - 1;
        // The waveform of a frame ends at the frame time
        const offset = Math.max(
            0,
            Math.floor((firstFrame / fps) * rendererData.sampleRate) -
                MAX_WAVEFORM_SAMPLES
        );
        const end = Math.floor((lastFrame / fps) * rendererData.sampleRate);
        return {
            offset,
            waveforms: rendererData.waveforms.map((w) => w.slice(offset, end))
        };
    };

    /**
     * Renders the lanes in workers, each worker draws and encodes one lane.
     * The waveforms are sent per segment.
     * @returns False if the workers could not start, nothing was encoded then.
     */
    const renderLanesInWorkers = async () => {
        const workers: Worker[] = [];
        try {
            const finished = new Array<Promise<void>>();
            const ready = new Array<Promise<void>>();
            for (let laneIndex = 0; laneIndex < laneCount; laneIndex++) {
                const worker = new Worker(
                    new URL("video_lane_worker.ts", import.meta.url),
                    { type: "module" }
                );
                workers.push(worker);
                let onReady: () => void;
                let onFail: (error: Error) => void;
                ready.push(
                    new Promise<void>((resolve, reject) => {
                        onReady = resolve;
                        onFail = reject;
                    })
                );
                finished.push(
                    new Promise<void>((resolve, reject) => {
                        const fail = (error: Error) => {
                            // Before ready, this rejects the start instead
                            onFail(error);
                            reject(error);
                        };
                        worker.addEventListener("error", (e) => {
                            e.preventDefault();
                            fail(new Error(`Video lane worker: ${e.message}`));
                        });
                        worker.addEventListener("messageerror", () => {
                            fail(new Error("Video lane worker: bad message"));
                        });
                        worker.addEventListener(
                            "message",
                            (e: MessageEvent<VideoLaneResponse>) => {
                                const message = e.data;
                                switch (message.type) {
                                    case "ready": {
                                        onReady();
                                        break;
                                    }

                                    case "segment": {
                                        const slice = sliceSegment(
                                            message.segment
                                        );
                                        worker.postMessage(
                                            {
                                                type: "segment",
                                                segment: message.segment,
                                                ...slice
                                            } satisfies VideoLaneRequest,
                                            slice.waveforms.map((w) => w.buffer)
                                        );
                                        break;
                                    }

                                    case "chunk": {
                                        addLanePacket(
                                            laneIndex,
                                            new Uint8Array(message.data),
                                            message.chunkType,
                                            message.timestamp,
                                            message.duration,
                                            message.meta
                                        );
                                        break;
                                    }

                                    case "progress": {
                                        addFramesDone(message.frames);
                                        break;
                                    }

                                    case "done": {
                                        resolve();
                                        break;
                                    }

                                    case "error": {
                                        fail(new Error(message.message));
                                        break;
                                    }
                                }
                            }
                        );
                    })
                );
                // Avoid unhandled rejections before they are awaited
                finished[laneIndex].catch(() => {
                    // Handled below
                });
                worker.postMessage({
                    type: "init",
                    renderer: {
                        ...rendererData,
                        waveforms: [],
                        waveformOffset: 0
                    },
                    encoderConfig: videoCodec.config,
                    laneIndex,
                    laneCount,
                    fps,
                    segmentFrames,
                    totalFrames
                } satisfies VideoLaneRequest);
            }
            try {
                await Promise.all(ready);
            } catch (error) {
                console.warn(
                    "Video export: workers unavailable, rendering on the main thread.",
                    error
                );
                return false;
            }
            for (const worker of workers) {
                worker.postMessage({
                    type: "start"
                } satisfies VideoLaneRequest);
            }
            await Promise.all(finished);
            return true;
        } finally {
            for (const worker of workers) {
                worker.terminate();
            }
        }
    };

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

    try {
        const inWorkers = shouldUseWorkers() && (await renderLanesInWorkers());
        if (!inWorkers) {
            await renderLanesInThread();
        }
        muxPending(true);

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

        await audioEncoder.flush();
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
