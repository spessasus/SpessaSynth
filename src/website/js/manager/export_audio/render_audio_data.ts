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

// Renders using the built-in function for worker and a custom one for worklet
export async function renderAudioData(
    this: Manager,
    sampleRate: number,
    options: RenderAudioOptions
): Promise<AudioBuffer[]> {
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
            const out = await this.synth.renderAudioSplit(sampleRate, options);
            return out.channels;
        }

        return [await this.synth.renderAudio(sampleRate, options)];
    }

    // Worklet
    // Render in the main thread, then add effects in offline Audio Context.
    // Why? Because Firefox (the browser worklet mode is used on)
    // Does not like copying 4GB buffers into the worklet thread.
    const { progressCallback, loopCount, extraTime, separateChannels } =
        options;
    const effectsEnabled = !separateChannels && options.enableEffects;
    const reverbCapture =
        effectsEnabled && this.convolverMode ? new ReverbCapture() : undefined;
    const rendererSynth = new SpessaSynthProcessor(sampleRate, {
        eventsEnabled: false,
        effectsEnabled,
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

    if (separateChannels) {
        return new Promise<AudioBuffer[]>((resolve) => {
            const dry: StereoAudioChunk[] = Array.from({ length: 16 }, () => [
                new Float32Array(sampleDuration),
                new Float32Array(sampleDuration)
            ]);
            // Effect outputs (unused)
            const dummy = new Float32Array(BLOCK_SIZE);
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
                    rendererSynth.processSplit(
                        dry,
                        dummy,
                        dummy,
                        index,
                        sampleCount
                    );
                    index += sampleCount;
                    if (index >= sampleDuration) {
                        // We now finished rendering
                        resolve(
                            dry.map((dryPair) =>
                                makeAudioBuffer(dryPair, sampleRate)
                            )
                        );
                        return;
                    }
                }

                // Set timeout so the progress callback has a chance to execute.
                await progressCallback?.(index / sampleDuration, 0);
                setTimeout(renderQuantum);
            };

            void renderQuantum();
            console.info("Rendering separate channels has started.");
        });
    }

    return new Promise<AudioBuffer[]>((resolve) => {
        const output: StereoAudioChunk = [
            new Float32Array(sampleDuration),
            new Float32Array(sampleDuration)
        ];
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
                rendererSynth.process(output[0], output[1], index, sampleCount);
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
                    if (convolverData && impulseResponse) {
                        await progressCallback?.(0, 1);
                        console.info("Rendering convolver data has started");
                        const convolved = await renderConvolverBuffer(
                            convolverData,
                            impulseResponse,
                            sampleRate
                        );
                        mergeAudioBuffer(buffer, convolved);
                        await progressCallback?.(1, 1);
                    }
                    resolve([buffer]);
                    return;
                }
            }
            // Set timeout so the progress callback has a chance to execute.
            await progressCallback?.(index / sampleDuration, 0);
            setTimeout(renderQuantum);
        };

        void renderQuantum();
        console.info("Rendering with effects has started.");
    });
}
