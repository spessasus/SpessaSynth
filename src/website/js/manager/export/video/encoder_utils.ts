import type { OfflineRenderer } from "../../../renderer/offline/offline_renderer.ts";

export interface EncoderState {
    error: Error | null;
    waiters: Set<() => void>;
}

/**
 * One renderer and video encoder pair. Each lane encodes every n-th segment
 * of the video on its own continuous timeline,
 * so multiple software encoders can run in parallel.
 */
export interface RenderLane {
    renderer: OfflineRenderer;
    encoder: VideoEncoder;
    state: EncoderState;
    /**
     * The first frame that the renderer has not processed yet.
     */
    nextFrame: number;
    /**
     * The frames sent to this lane's encoder.
     */
    encodedFrames: number;
}

export function getEncoderError(value: unknown) {
    if (value instanceof Error) {
        return value;
    }
    if (typeof value === "string" && value.length > 0) {
        return new Error(value);
    }
    return new Error("Video export error: encoder failed!");
}

export function callWaiters(state: EncoderState) {
    for (const waiter of state.waiters) {
        waiter();
    }
    state.waiters.clear();
}

/**
 * Waits until the encoder queue drains below `drainTo` threshold.
 * Prevents uncompressed raw frames from filling up the memory.
 */
export async function waitForEncoderQueue(
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

const yieldChannel = new MessageChannel();
const yieldResolvers: (() => void)[] = [];
yieldChannel.port1.addEventListener("message", () =>
    yieldResolvers.shift()?.()
);
yieldChannel.port1.start();

/**
 * Lets the event loop run a task, without the timer clamping of `setTimeout`.
 * The browsers pass the queued `encode()` calls to the encoders in tasks,
 * so a frame loop that never yields starves them.
 * Confirmed with benchmark
 */
export function yieldToEventLoop() {
    return new Promise<void>((resolve) => {
        yieldResolvers.push(resolve);
        yieldChannel.port2.postMessage(null);
    });
}

/**
 * Creates a video encoder that reports its errors and dequeues to the state.
 * @param config The encoder configuration.
 * @param state The encoder state to update.
 * @param output The encoded chunk callback.
 */
export function createVideoEncoder(
    config: VideoEncoderConfig,
    state: EncoderState,
    output: EncodedVideoChunkOutputCallback
) {
    const encoder = new VideoEncoder({
        output,
        error: (error) => {
            state.error ??= getEncoderError(error);
            callWaiters(state);
            console.error(error);
        }
    });
    encoder.addEventListener("dequeue", () => {
        callWaiters(state);
    });
    encoder.configure(config);
    return encoder;
}

/**
 * Renders a frame of the lane and sends it to the lane's encoder.
 * Frames of the other lanes in between are skipped.
 * @param lane The lane.
 * @param frame The frame index in the video.
 * @param keyFrame If the frame starts a segment.
 * @param fps The video frame rate.
 */
export async function renderLaneFrame(
    lane: RenderLane,
    frame: number,
    keyFrame: boolean,
    fps: number
) {
    const { renderer, encoder } = lane;
    const frameDurationUs = 1_000_000 / fps;
    // Catch up on the frames of the other lanes
    while (lane.nextFrame < frame) {
        renderer.skipFrame(lane.nextFrame++ / fps);
    }

    // Render and save frame
    renderer.drawFrame(frame / fps);
    lane.nextFrame = frame + 1;
    const videoFrame = new VideoFrame(renderer.canvas, {
        timestamp: Math.round(lane.encodedFrames++ * frameDurationUs),
        duration: Math.round(frameDurationUs)
    });
    encoder.encode(videoFrame, { keyFrame });
    videoFrame.close();

    // Throttle frame generation to match encoder consumption rate
    // Without this, `encode()` queues faster than the encoder drains
    // And raw frames eat up memory
    await (encoder.encodeQueueSize > 4
        ? waitForEncoderQueue(encoder, lane.state, 4, 2)
        : yieldToEventLoop());
}
