/// <reference lib="webworker" />
import {
    OfflineRenderer,
    type OfflineRendererData
} from "../../../renderer/offline/offline_renderer.ts";
import {
    createVideoEncoder,
    type EncoderState,
    getEncoderError,
    type RenderLane,
    renderLaneFrame
} from "./encoder_utils.ts";

/**
 * Starts a lane in the worker.
 */
export interface VideoLaneInit {
    type: "init";
    renderer: OfflineRendererData;
    encoderConfig: VideoEncoderConfig;
    laneIndex: number;
    laneCount: number;
    fps: number;
    segmentFrames: number;
    totalFrames: number;
}

/**
 * The waveform slice for a segment.
 */
export interface VideoLaneSegment {
    type: "segment";
    segment: number;
    waveforms: Float32Array[];
    offset: number;
}

export type VideoLaneRequest =
    | VideoLaneInit
    | VideoLaneSegment
    | {
          /**
           * All lanes are ready, start rendering.
           */
          type: "start";
      };

export type VideoLaneResponse =
    | {
          /**
           * The lane is set up and starts rendering.
           */
          type: "ready";
      }
    | {
          /**
           * Requests the waveform slice for a segment.
           */
          type: "segment";
          segment: number;
      }
    | {
          type: "chunk";
          data: ArrayBuffer;
          chunkType: EncodedVideoChunkType;
          /**
           * Timestamp on the lane's timeline, in microseconds.
           */
          timestamp: number;
          duration: number | null;
          meta?: EncodedVideoChunkMetadata;
      }
    | {
          /**
           * Frames rendered since the last progress message.
           */
          type: "progress";
          frames: number;
      }
    | {
          type: "done";
      }
    | {
          type: "error";
          message: string;
      };

const post = (message: VideoLaneResponse, transfer: Transferable[] = []) => {
    postMessage(message, { transfer });
};

let startLane = () => {
    // Replaced below
};
const started = new Promise<void>((resolve) => {
    startLane = resolve;
});

const segmentResolvers = new Map<number, (s: VideoLaneSegment) => void>();

const requestSegment = (segment: number) =>
    new Promise<VideoLaneSegment>((resolve) => {
        segmentResolvers.set(segment, resolve);
        post({ type: "segment", segment });
    });

/**
 * Copies the metadata into a plain object, the color space may be a class instance.
 * @param meta The encoder metadata.
 */
function cloneableMeta(meta?: EncodedVideoChunkMetadata) {
    const config = meta?.decoderConfig;
    if (!config) {
        return;
    }
    const colorSpace = config.colorSpace;
    return {
        decoderConfig: {
            ...config,
            colorSpace:
                colorSpace instanceof VideoColorSpace
                    ? colorSpace.toJSON()
                    : colorSpace
        }
    };
}

async function runLane(init: VideoLaneInit) {
    const { laneIndex, laneCount, fps, segmentFrames, totalFrames } = init;
    // Report a missing worker encoder before starting, so the exporter can fall back
    const support = await VideoEncoder.isConfigSupported(init.encoderConfig);
    if (support.supported !== true) {
        throw new Error("Video encoder configuration not supported in worker");
    }
    const state: EncoderState = {
        error: null,
        waiters: new Set()
    };
    const encoder = createVideoEncoder(
        init.encoderConfig,
        state,
        (chunk, meta) => {
            const data = new ArrayBuffer(chunk.byteLength);
            chunk.copyTo(data);
            post(
                {
                    type: "chunk",
                    data,
                    chunkType: chunk.type,
                    timestamp: chunk.timestamp,
                    duration: chunk.duration,
                    // The track uses the decoder config of the first lane
                    meta: laneIndex === 0 ? cloneableMeta(meta) : undefined
                },
                [data]
            );
        }
    );
    try {
        const lane: RenderLane = {
            renderer: new OfflineRenderer(init.renderer),
            encoder,
            state,
            nextFrame: 0,
            encodedFrames: 0
        };
        post({ type: "ready" });
        await started;

        const segmentCount = Math.ceil(totalFrames / segmentFrames);
        let next =
            laneIndex < segmentCount ? requestSegment(laneIndex) : undefined;
        let frames = 0;
        for (let s = laneIndex; s < segmentCount; s += laneCount) {
            const slice = await next!;
            // Fetch the next slice while this segment renders
            next =
                s + laneCount < segmentCount
                    ? requestSegment(s + laneCount)
                    : undefined;
            lane.renderer.setWaveforms(slice.waveforms, slice.offset);
            for (let i = 0; i < segmentFrames; i++) {
                const f = s * segmentFrames + i;
                if (f >= totalFrames) {
                    break;
                }
                await renderLaneFrame(lane, f, i === 0, fps);
                if (++frames % 10 === 0) {
                    post({ type: "progress", frames: 10 });
                }
            }
        }
        post({ type: "progress", frames: frames % 10 });
        await encoder.flush();
        if (state.error) {
            throw state.error;
        }
        post({ type: "done" });
    } finally {
        try {
            encoder.close();
        } catch {
            // Ignore
        }
    }
}

onmessage = (e: MessageEvent<VideoLaneRequest>) => {
    const message = e.data;
    switch (message.type) {
        case "init": {
            runLane(message).catch((error: unknown) => {
                console.error(error);
                post({
                    type: "error",
                    message: getEncoderError(error).message
                });
            });
            break;
        }

        case "start": {
            startLane();
            break;
        }

        case "segment": {
            segmentResolvers.get(message.segment)?.(message);
            segmentResolvers.delete(message.segment);
            break;
        }
    }
};
