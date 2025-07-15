import {
    BasicMIDI,
    BasicSoundBank,
    SpessaSynthProcessor,
    SpessaSynthSequencer,
    SynthesizerSnapshot
} from "spessasynth_core";
import { EXTRA_BANK_ID } from "../../extra_bank_id.js";

const RENDER_BLOCKS_PER_PROGRESS = 64;
const BLOCK_SIZE = 128;

/**
 * @param extraBank {BasicSoundBank|null}
 * @param extraBankOffset {number}
 * @param sampleRate {number}
 * @param separateChannels {boolean}
 * @param loopCount {number}
 * @param additionalTime {number}
 * @param progressCallback {(p: number) => void}
 * @returns {Promise<AudioChunks>}
 * @this {WorkerSynthEngine}
 */
export async function renderAudio(
    extraBank,
    extraBankOffset,
    sampleRate,
    separateChannels,
    loopCount,
    additionalTime,
    progressCallback
)
{
    const synthEngine = this.synthEngine;
    const seqEngine = this.seqEngine;
    const soundBank = this.soundBank;
    const playing = !this.seqEngine.paused;
    this.stopAudioLoop();
    // load MIDI
    const parsedMid = BasicMIDI.copyFrom(seqEngine.midiData);
    const playbackRate = seqEngine._playbackRate;
    // calculate times
    const loopStartAbsolute = parsedMid.MIDIticksToSeconds(parsedMid.loop.start) / playbackRate;
    const loopEndAbsolute = parsedMid.MIDIticksToSeconds(parsedMid.loop.end) / playbackRate;
    let loopDuration = loopEndAbsolute - loopStartAbsolute;
    const duration = parsedMid.duration / playbackRate + additionalTime + loopDuration * loopCount;
    let sampleDuration = sampleRate * duration;
    
    const synth = new SpessaSynthProcessor(sampleRate, {
        enableEventSystem: false
    });
    
    // load font
    synth.soundfontManager.reloadManager(soundBank);
    if (extraBank)
    {
        synth.soundfontManager.addNewSoundFont(extraBank, EXTRA_BANK_ID, extraBankOffset);
        synth.soundfontManager.rearrangeSoundFonts([EXTRA_BANK_ID, "main"]);
    }
    // apply snapshot
    const snapshot = SynthesizerSnapshot.createSynthesizerSnapshot(synthEngine);
    SynthesizerSnapshot.applySnapshot(synth, snapshot);
    
    const seq = new SpessaSynthSequencer(synth);
    seq.loopCount = loopCount;
    seq.playbackRate = playbackRate;
    if (!loopCount)
    {
        seq.loop = false;
    }
    seq.loadNewSongList([parsedMid]);
    // reverb, chorus
    const reverb = [new Float32Array(sampleDuration), new Float32Array(sampleDuration)];
    const chorus = [new Float32Array(sampleDuration), new Float32Array(sampleDuration)];
    const out = [reverb, chorus];
    const sampleDurationNoLastQuantum = sampleDuration - BLOCK_SIZE;
    if (separateChannels)
    {
        /**
         * @type {AudioChunks}
         */
        const dry = [];
        for (let i = 0; i < 16; i++)
        {
            const d = [new Float32Array(sampleDuration), new Float32Array(sampleDuration)];
            dry.push(d);
            out.push(d);
        }
        let index = 0;
        while (true)
        {
            for (let i = 0; i < RENDER_BLOCKS_PER_PROGRESS; i++)
            {
                if (index >= sampleDurationNoLastQuantum)
                {
                    seq.processTick();
                    synth.renderAudioSplit(reverb, chorus, dry, index, sampleDuration - index);
                    this.startAudioLoop();
                    return out;
                }
                seq.processTick();
                synth.renderAudioSplit(reverb, chorus, dry, index, BLOCK_SIZE);
                index += BLOCK_SIZE;
            }
            progressCallback(index / sampleDuration);
        }
    }
    else
    {
        const dry = [new Float32Array(sampleDuration), new Float32Array(sampleDuration)];
        out.push(dry);
        let index = 0;
        while (true)
        {
            for (let i = 0; i < RENDER_BLOCKS_PER_PROGRESS; i++)
            {
                if (index >= sampleDurationNoLastQuantum)
                {
                    seq.processTick();
                    synth.renderAudio(dry, reverb, chorus, index, sampleDuration - index);
                    this.startAudioLoop();
                    if (playing)
                    {
                        this.resumeSeq();
                    }
                    return out;
                }
                seq.processTick();
                synth.renderAudio(dry, reverb, chorus, index, BLOCK_SIZE);
                index += BLOCK_SIZE;
            }
            progressCallback(index / sampleDuration);
        }
    }
}