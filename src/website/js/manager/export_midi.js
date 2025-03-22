import { SpessaSynthWarn } from "../../../spessasynth_lib/utils/loggin.js";

/**
 * Changes the MIDI according to locked controllers and programs and exports it as a file
 * @private
 * @this {Manager}
 */
export async function exportMidi()
{
    const mid = await this.seq.getMIDI();
    try
    {
        mid.applySnapshotToMIDI(await this.synth.getSynthesizerSnapshot());
    }
    catch (e)
    {
        SpessaSynthWarn("Failed to modify MIDI:", e);
    }
    // export modified midi and write out
    const file = mid.writeMIDI();
    const blob = new Blob([file], { type: "audio/mid" });
    this.saveBlob(blob, `${this.seqUI.currentSongTitle || "unnamed_song"}.mid`);
}