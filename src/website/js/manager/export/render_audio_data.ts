import { WorkerSynthesizer } from "spessasynth_lib";
import type { Manager } from "../manager.ts";
import {
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { EXTRA_BANK_ID, SOUND_BANK_ID } from "../bank_id.ts";
import { mergeAudioBuffer } from "./utils/merge_audio_buffer.ts";
import {
    renderConvolverBuffer,
    type StereoAudioChunk
} from "./utils/render_convolver_buffer.ts";
import { ReverbCapture } from "./utils/reverb_capture.ts";
import { makeAudioBuffer } from "./utils/make_audio_buffer.ts";
import { decodeDefaultImpulseResponse } from "../../reverb/compressed_reverb_decoder.ts";
import type { VideoSynthData } from "../../renderer/offline/events.ts";

type RenderAudioOptions = (NonNullable<
    Parameters<typeof WorkerSynthesizer.prototype.renderAudio>[1]
> extends Partial<infer T>
    ? T
    : never) & {
    separateChannels?: boolean;
    /**
     * For video renderer
     */
    recordEvents?: boolean;
};

const RENDER_BLOCKS_PER_PROGRESS = 256; // Blocks
export const BLOCK_SIZE = 128; // Samples

export interface RenderedAudioData {
    /**
     * The complete stereo output
     */
    output: AudioBuffer;
    /**
     * The dry per-channel outputs, used only for the separate channels export.
     * Will be empty for regular render.
     */
    visual: AudioBuffer[];
    /**
     * Event log, present only when `recordEvents` is set.
     */
    eventLog?: VideoSynthData;
    /**
     * Total duration in seconds, present only when `recordEvents` is set.
     */
    duration?: number;
    /**
     * Number of loop iterations, present only when `recordEvents` is set.
     */
    loopCount?: number;
}

/**
 * Renders using the built-in function for worker and a custom one for worklet.
 * When `recordEvents` is set, we always use the custom one for recording
 */
export async function renderAudioData(
    this: Manager,
    sampleRate: number,
    options: RenderAudioOptions
): Promise<RenderedAudioData> {
    if (!this.synth) {
        throw new Error("Unexpected lack of the synthesizer!");
    }
    if (!this.seq) {
        throw new Error("No sequencer active");
    }
    const {
        progressCallback,
        loopCount,
        extraTime,
        separateChannels,
        recordEvents
    } = options;
    if (this.synth instanceof WorkerSynthesizer && !recordEvents) {
        // Worker:
        // Render the audio in the worker thread using the built-in function
        const { recordEvents, ...workerOptions } = options;
        // TypeScript stuff
        void recordEvents;
        if (options.separateChannels) {
            return await this.synth.renderAudioSplit(sampleRate, workerOptions);
        }

        return {
            output: await this.synth.renderAudio(sampleRate, workerOptions),
            visual: []
        };
    }

    // Main-thread render (worklet fallback, or forced for video event logging).
    // Then add effects in offline Audio Context.
    // Why? Because Firefox (the browser worklet mode is used on)
    // Does not like copying 4GB buffers into the worklet thread.
    const renderSeparate = separateChannels === true || recordEvents === true;
    const reverbCapture = this.convolverMode ? new ReverbCapture() : undefined;
    const rendererSynth = new SpessaSynthProcessor(sampleRate, {
        eventsEnabled: !!recordEvents,
        effectsEnabled: true,
        gsReverbProcessor: reverbCapture
    });
    console.info("Parsing and loading the sound bank in the main thread.");
    // Worker mode transfers (detaches) the main-thread bank at load.
    // Copy it back from the worker only when a main-thread render needs it.
    let bankBytes = this.sBankBuffer;
    if (bankBytes.byteLength === 0) {
        if (!(this.synth instanceof WorkerSynthesizer)) {
            throw new TypeError(
                "Offline render: the sound bank is unavailable on the main thread. " +
                    "Reload the soundfont and try again."
            );
        }
        console.info("Copying the sound bank back from the worker...");
        bankBytes = await this.getWorkerSoundBankCopy(SOUND_BANK_ID);
    }
    const sf = SoundBankLoader.fromArrayBuffer(bankBytes);
    rendererSynth.soundBankManager.addSoundBank(sf, SOUND_BANK_ID);

    // Extra sound bank
    if (this.extraBank) {
        const extraSF = SoundBankLoader.fromArrayBuffer(this.extraBank.buffer);
        rendererSynth.soundBankManager.addSoundBank(
            extraSF,
            EXTRA_BANK_ID,
            this.extraBank.offset
        );
        rendererSynth.soundBankManager.priorityOrder = [
            EXTRA_BANK_ID,
            SOUND_BANK_ID
        ];
    }
    await rendererSynth.ready;
    console.info("Synthesizer initialized, applying snapshot.");
    const snapshot = await this.synth.getSnapshot();
    rendererSynth.applySnapshot(snapshot);
    console.info("Synthesizer has been initialized.");

    // No voice cap (after restoring snapshot)
    rendererSynth.setSystemParameter("autoAllocateVoices", true);
    // Always with effects!
    rendererSynth.setSystemParameter("effectsEnabled", true);

    // Calculate the duration
    const parsedMid = await this.seq.getMIDI();
    const playbackRate = this.seq.playbackRate;
    const loopStartAbsolute =
        parsedMid.midiTicksToSeconds(parsedMid.loop.start) / playbackRate;
    const loopEndAbsolute =
        parsedMid.midiTicksToSeconds(parsedMid.loop.end) / playbackRate;
    const loopDuration = loopEndAbsolute - loopStartAbsolute;
    const sampleDuration = Math.ceil(
        sampleRate *
            (parsedMid.duration / playbackRate +
                extraTime +
                loopDuration * loopCount)
    );

    // SEQUENCER INIT
    const rendererSeq = new SpessaSynthSequencer(rendererSynth);
    rendererSeq.loopCount = loopCount;
    rendererSeq.playbackRate = playbackRate;

    // Current sample rendered
    let index = 0;

    // Attach listeners
    let eventLog: VideoSynthData | undefined;
    if (recordEvents) {
        eventLog = {
            initialState: {
                global: {
                    systemKeyShift: rendererSynth.systemParameters.keyShift,
                    systemFineTune: rendererSynth.systemParameters.fineTune,
                    midiKeyShift: rendererSynth.midiParameters.keyShift,
                    midiFineTune: rendererSynth.midiParameters.fineTune,
                    system: rendererSynth.midiParameters.system
                },
                channel: rendererSynth.midiChannels
                    .slice(0, 16)
                    .map((channel) => ({
                        systemKeyShift: channel.systemParameters.keyShift,
                        systemFineTune: channel.systemParameters.fineTune,
                        midiKeyShift: channel.midiParameters.keyShift,
                        midiFineTune: channel.midiParameters.fineTune,
                        pitchWheel: channel.midiParameters.pitchWheel,
                        pitchWheelRange: channel.midiParameters.pitchWheelRange,
                        efxAssign: channel.midiParameters.efxAssign
                    })),
                programs: rendererSynth.midiChannels.map((channel) => ({
                    name: channel.preset?.name ?? "",
                    isDrum: channel.drumChannel
                }))
            },
            events: []
        };
        rendererSeq.onEventCall = (event) => {
            if (event.type !== "metaEvent") {
                return;
            }
            eventLog!.events.push({
                ...event,
                t: index / sampleRate
            });
        };
        rendererSynth.onEventCall = (event) => {
            switch (event.type) {
                case "noteOn":
                case "noteOff":
                case "channelParamChange":
                case "globalParamChange":
                case "displayMessage":
                case "programChange": {
                    eventLog!.events.push({
                        ...event,
                        t: index / sampleRate
                    });
                    break;
                }
                default: {
                    break;
                }
            }
        };
    }
    rendererSeq.loadNewSongList([parsedMid]);
    rendererSeq.play();
    console.info("Sequencer has been initialized.");

    return new Promise<RenderedAudioData>((resolve) => {
        const output: StereoAudioChunk = [
            new Float32Array(sampleDuration),
            new Float32Array(sampleDuration)
        ];
        // Dry channel outputs for the separate channels export
        // Also video
        const dry: StereoAudioChunk[] = renderSeparate
            ? Array.from({ length: 16 }, () => [
                  new Float32Array(sampleDuration),
                  new Float32Array(sampleDuration)
              ])
            : [];
        // Convolver outputs
        const convolverData: StereoAudioChunk | undefined = reverbCapture
            ? [
                  new Float32Array(sampleDuration),
                  new Float32Array(sampleDuration)
              ]
            : undefined;
        const renderQuantum = async () => {
            for (let i = 0; i < RENDER_BLOCKS_PER_PROGRESS; i++) {
                const sampleCount = Math.min(
                    BLOCK_SIZE,
                    sampleDuration - index
                );
                // Render
                rendererSeq.processTick();
                rendererSynth.process(
                    output[0],
                    output[1],
                    index,
                    sampleCount,
                    renderSeparate ? dry : undefined
                );
                // Capture convolver and append
                if (convolverData) {
                    const captured = reverbCapture!.capturedData.subarray(
                        0,
                        sampleCount
                    );
                    convolverData[0].set(captured, index);
                    convolverData[1].set(captured, index);
                }
                index += sampleCount;
                if (index >= sampleDuration) {
                    // We now finished rendering
                    const buffer = makeAudioBuffer(output, sampleRate);
                    // If convolver mode is on, render it.
                    let impulseResponse =
                        this.synth!.convolverNode?.buffer ?? null;
                    if (convolverData && !impulseResponse) {
                        try {
                            impulseResponse =
                                await decodeDefaultImpulseResponse(
                                    this.synth!.context
                                );
                        } catch (error) {
                            console.warn(
                                "Could not decode the default convolver impulse response!",
                                error
                            );
                        }
                    }
                    const finish = async () => {
                        if (convolverData && impulseResponse) {
                            console.info(
                                "Rendering convolver data has started"
                            );
                            const convolved = await renderConvolverBuffer(
                                convolverData,
                                impulseResponse,
                                sampleRate,
                                (progress) => progressCallback?.(progress, 1)
                            );
                            mergeAudioBuffer(buffer, convolved);
                            await progressCallback?.(1, 1);
                        }
                        resolve({
                            output: buffer,
                            visual: renderSeparate
                                ? dry.map((dryPair) =>
                                      makeAudioBuffer(dryPair, sampleRate)
                                  )
                                : [],
                            ...(eventLog
                                ? {
                                      eventLog,
                                      duration: sampleDuration / sampleRate,
                                      loopCount
                                  }
                                : {})
                        });
                    };
                    void finish();
                    return;
                }
            }

            // Set timeout so the progress callback has a chance to execute.
            await progressCallback?.(index / sampleDuration, 0);
            setTimeout(renderQuantum);
        };

        void renderQuantum();
        console.info(
            separateChannels
                ? "Rendering separate channels has started."
                : "Rendering with effects has started."
        );
    });
}
