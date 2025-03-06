import { applySnapshotToMIDI } from "../../../spessasynth_lib/midi_parser/midi_editor.js";
import { writeMIDIFile } from "../../../spessasynth_lib/midi_parser/midi_writer.js";
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
        applySnapshotToMIDI(mid, await this.synth.getSynthesizerSnapshot());
    }
    catch (e)
    {
        SpessaSynthWarn("Failed to modify MIDI:", e);
    }
    // export modified midi and write out
    const file = writeMIDIFile(mid);
    const blob = new Blob([file], { type: "audio/mid" });
    this.saveBlob(blob, `${this.seqUI.currentSongTitle || "unnamed_song"}.mid`);
}