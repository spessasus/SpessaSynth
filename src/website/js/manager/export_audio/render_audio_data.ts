import {
    ChorusProcessor,
    ReverbProcessor,
    WorkerSynthesizer
} from "spessasynth_lib";
import type { Manager } from "../manager.ts";
import {
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { EXTRA_BANK_ID, SOUND_BANK_ID } from "../bank_id.ts";

type RenderAudioOptions =
    NonNullable<
        Parameters<typeof WorkerSynthesizer.prototype.renderAudio>[1]
    > extends Partial<infer T>
        ? T
        : never;

const RENDER_BLOCKS_PER_PROGRESS = 256; // Blocks
const BLOCK_SIZE = 128; // Samples

type StereoAudioChunk = [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];

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
        return this.synth.renderAudio(sampleRate, options);
    } else {
        // Worklet
        // Render in the main thread, then add effects in offline Audio Context.
        // Why? Because Firefox (the browser worklet mode is used on)
        // Does not like copying 4GB buffers into the worklet thread.

        // Extract options
        const progressCallback = options.progressCallback;
        const loopCount = options.loopCount;
        const extraTime = options.extraTime;
        const separated = options.separateChannels;

        // SYNTH INIT
        const rendererSynth = new SpessaSynthProcessor(sampleRate, {
            enableEventSystem: false,
            enableEffects: !separated
        });
        // No cap
        rendererSynth.setMasterParameter("voiceCap", 4_294_967_296);
        console.info("Parsing and loading the sound bank in the main thread.");
        const sf = SoundBankLoader.fromArrayBuffer(this.sBankBuffer);
        rendererSynth.soundBankManager.addSoundBank(sf, SOUND_BANK_ID);

        // Extra sound bank
        if (this.extraBank) {
            const extraSF = SoundBankLoader.fromArrayBuffer(
                this.extraBank.buffer
            );
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
        await rendererSynth.processorInitialized;
        // Apply snapshot
        const snapshot = await this.synth.getSnapshot();

        snapshot.apply(rendererSynth);
        console.info("Synthesizer has been initialized.");

        // Calculate the duration
        const parsedMid = await this.seq.getMIDI();
        const playbackRate = this.seq.playbackRate;
        const loopStartAbsolute =
            parsedMid.midiTicksToSeconds(parsedMid.loop.start) / playbackRate;
        const loopEndAbsolute =
            parsedMid.midiTicksToSeconds(parsedMid.loop.end) / playbackRate;
        const loopDuration = loopEndAbsolute - loopStartAbsolute;
        const totalDuration =
            parsedMid.duration / playbackRate +
            extraTime +
            loopDuration * loopCount;
        const sampleDuration = sampleRate * totalDuration;

        // SEQUENCER INIT
        const rendererSeq = new SpessaSynthSequencer(rendererSynth);
        rendererSeq.loopCount = loopCount;
        rendererSeq.playbackRate = playbackRate;

        rendererSeq.loadNewSongList([parsedMid]);
        rendererSeq.play();
        console.info("Sequencer has been initialized.");

        const sampleDurationNoLastQuantum = sampleDuration - BLOCK_SIZE;

        if (separated) {
            return new Promise<AudioBuffer[]>((resolve) => {
                // Allocate memory (16 stereo pairs)
                const dry: StereoAudioChunk[] = [];
                for (let i = 0; i < 16; i++) {
                    const d: StereoAudioChunk = [
                        new Float32Array(sampleDuration),
                        new Float32Array(sampleDuration)
                    ];
                    dry.push(d);
                }
                // Sample tracking
                let index = 0;
                const renderQuantum = async () => {
                    for (let i = 0; i < RENDER_BLOCKS_PER_PROGRESS; i++) {
                        if (index >= sampleDurationNoLastQuantum) {
                            rendererSeq.processTick();
                            rendererSynth.renderAudioSplit(
                                [],
                                [],
                                dry,
                                index,
                                sampleDuration - index
                            );
                            // Convert to audio buffers
                            resolve(
                                dry.map((dryPair) => {
                                    const buffer = new AudioBuffer({
                                        sampleRate,
                                        numberOfChannels: 2,
                                        length: sampleDuration
                                    });
                                    buffer.copyToChannel(dryPair[0], 0);
                                    buffer.copyToChannel(dryPair[1], 1);
                                    return buffer;
                                })
                            );
                            this.seq!.currentTime -= 0.1;
                            // No effects, just return the dry buffers
                            return;
                        }
                        rendererSeq.processTick();
                        rendererSynth.renderAudioSplit(
                            [],
                            [],
                            dry,
                            index,
                            BLOCK_SIZE
                        );
                        index += BLOCK_SIZE;
                    }
                    await progressCallback?.(index / sampleDuration, 0);
                    setTimeout(renderQuantum);
                };

                // Begin!
                void renderQuantum();
                console.info("Rendering separate channels has started.");
            });
        }

        return new Promise<AudioBuffer[]>((resolve) => {
            // Allocate memory
            // Reverb, chorus
            const reverb: StereoAudioChunk = [
                new Float32Array(sampleDuration),
                new Float32Array(sampleDuration)
            ];
            const chorus: StereoAudioChunk = [
                new Float32Array(sampleDuration),
                new Float32Array(sampleDuration)
            ];
            const dry: StereoAudioChunk = [
                new Float32Array(sampleDuration),
                new Float32Array(sampleDuration)
            ];

            // Sample tracking
            let index = 0;
            const renderQuantum = async () => {
                for (let i = 0; i < RENDER_BLOCKS_PER_PROGRESS; i++) {
                    if (index >= sampleDurationNoLastQuantum) {
                        rendererSeq.processTick();
                        rendererSynth.renderAudio(
                            dry,
                            reverb,
                            chorus,
                            index,
                            sampleDuration - index
                        );
                        if (!this.synth) {
                            return;
                        }

                        // Second pass:
                        // Render the effects in OfflineAudioContext
                        console.info(
                            "Initializing the second pass for effects..."
                        );
                        const reverbBuffer = new AudioBuffer({
                            sampleRate,
                            numberOfChannels: 2,
                            length: sampleDuration
                        });
                        reverbBuffer.copyToChannel(reverb[0], 0);
                        reverbBuffer.copyToChannel(reverb[1], 1);
                        const chorusBuffer = new AudioBuffer({
                            sampleRate,
                            numberOfChannels: 2,
                            length: sampleDuration
                        });
                        chorusBuffer.copyToChannel(chorus[0], 0);
                        chorusBuffer.copyToChannel(chorus[1], 1);

                        const dryBuffer = new AudioBuffer({
                            sampleRate,
                            numberOfChannels: 2,
                            length: sampleDuration
                        });
                        dryBuffer.copyToChannel(dry[0], 0);
                        dryBuffer.copyToChannel(dry[1], 1);

                        // Prepare the context
                        const offline = new OfflineAudioContext({
                            sampleRate,
                            numberOfChannels: 2,
                            length: sampleDuration
                        });

                        // Connect the playback buffers
                        // Dry
                        const dryPlayer = offline.createBufferSource();
                        dryPlayer.buffer = dryBuffer;
                        dryPlayer.connect(offline.destination);
                        dryPlayer.start();

                        // Chorus
                        const chorusProcessor = new ChorusProcessor(
                            offline,
                            this.synth.chorusProcessor?.config
                        );
                        const chorusPlayer = offline.createBufferSource();
                        chorusPlayer.buffer = chorusBuffer;
                        chorusPlayer.connect(chorusProcessor.input);
                        chorusProcessor.connect(offline.destination);
                        chorusPlayer.start();

                        // Reverb
                        const reverbProcessor = new ReverbProcessor(
                            offline,
                            this.synth.reverbProcessor?.config
                        );
                        await reverbProcessor.isReady;
                        const reverbPlayer = offline.createBufferSource();
                        reverbPlayer.connect(reverbProcessor.input);
                        reverbProcessor.connect(offline.destination);
                        reverbPlayer.buffer = reverbBuffer;
                        reverbPlayer.start();

                        const updateInterval = window.setInterval(() => {
                            progressCallback?.(
                                offline.currentTime / totalDuration,
                                1
                            );
                        });

                        console.info("Rendering effects has started.");
                        const rendered = await offline.startRendering();
                        clearInterval(updateInterval);
                        resolve([rendered]);
                        return;
                    }
                    rendererSeq.processTick();
                    rendererSynth.renderAudio(
                        dry,
                        reverb,
                        chorus,
                        index,
                        BLOCK_SIZE
                    );
                    index += BLOCK_SIZE;
                }
                await progressCallback?.(index / sampleDuration, 0);
                setTimeout(renderQuantum.bind(this));
            };

            // Begin!
            void renderQuantum();
            console.info("Rendering with effects has started.");
        });
    }
}
