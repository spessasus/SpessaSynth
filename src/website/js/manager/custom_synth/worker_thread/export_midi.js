import { SynthesizerSnapshot } from "spessasynth_core";

/**
 * @this {WorkerSynthEngine}
 * @returns {{fileName: string, url: string}}
 */
export function exportMIDI()
{
    const mid = this.seqEngine.midiData;
    try
    {
        mid.applySnapshotToMIDI(SynthesizerSnapshot.createSynthesizerSnapshot(this.synthEngine));
    }
    catch (e)
    {
        console.warn("Failed to modify MIDI:", e);
    }
    // export modified midi and write out
    const file = mid.writeMIDI();
    const blob = new Blob([file], { type: "audio/mid" });
    const url = URL.createObjectURL(blob);
    return {
        url,
        // will take the decoded data from seqUI
        fileName: "unnamed.mid"
    };
}