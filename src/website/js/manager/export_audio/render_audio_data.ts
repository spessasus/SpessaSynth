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

type RenderAudioOptions = (NonNullable<
    Parameters<typeof WorkerSynthesizer.prototype.renderAudio>[1]
> extends Partial<infer T>
    ? T
    : never) & {
    separateChannels?: boolean;
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
     * Will be empty for regular render
     */
    visual: AudioBuffer[];
}

// Renders using the built-in function for worker and a custom one for worklet
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
    if (this.synth instanceof WorkerSynthesizer) {
        // Worker:
        // Render the audio in the worker thread using the built-in function

        if (options.separateChannels) {
            return await this.synth.renderAudioSplit(sampleRate, options);
        }

        return {
            output: await this.synth.renderAudio(sampleRate, options),
            visual: []
        };
    }

    // Worklet
    // Render in the main thread, then add effects in offline Audio Context.
    // Why? Because Firefox (the browser worklet mode is used on)
    // Does not like copying 4GB buffers into the worklet thread.
    const { progressCallback, loopCount, extraTime, separateChannels } =
        options;
    const reverbCapture = this.convolverMode ? new ReverbCapture() : undefined;
    const rendererSynth = new SpessaSynthProcessor(sampleRate, {
        eventsEnabled: false,
        effectsEnabled: true,
        reverbProcessor: reverbCapture
    });
    console.info("Parsing and loading the sound bank in the main thread.");
    const sf = SoundBankLoader.fromArrayBuffer(this.sBankBuffer);
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
    const sampleDuration =
        sampleRate *
        (parsedMid.duration / playbackRate +
            extraTime +
            loopDuration * loopCount);

    // SEQUENCER INIT
    const rendererSeq = new SpessaSynthSequencer(rendererSynth);
    rendererSeq.loopCount = loopCount;
    rendererSeq.playbackRate = playbackRate;
    rendererSeq.loadNewSongList([parsedMid]);
    rendererSeq.play();
    console.info("Sequencer has been initialized.");

    return new Promise<RenderedAudioData>((resolve) => {
        const output: StereoAudioChunk = [
            new Float32Array(sampleDuration),
            new Float32Array(sampleDuration)
        ];
        // Dry channel outputs for the separate channels export
        const dry: StereoAudioChunk[] = separateChannels
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
        // Current sample rendered
        let index = 0;
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
                    separateChannels ? dry : undefined
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
                    // If convolver mode is on, render it
                    const impulseResponse = this.synth!.convolverNode?.buffer;
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
                            visual: separateChannels
                                ? dry.map((dryPair) =>
                                      makeAudioBuffer(dryPair, sampleRate)
                                  )
                                : []
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
