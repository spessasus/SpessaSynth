import { applySnapshotToMIDI } from '../../spessasynth_lib/midi_parser/midi_editor.js'
import { writeMIDIFile } from '../../spessasynth_lib/midi_parser/midi_writer.js'

/**
 * Changes the MIDI according to locked controllers and programs and exports it as a file
 * @private
 * @this {Manager}
 */
export async function exportMidi()
{
    const mid = await this.seq.getMIDI();
    applySnapshotToMIDI(mid, await this.synth.getSynthesizerSnapshot());
    // export modified midi and write out
    const file = writeMIDIFile(mid);
    const blob = new Blob([file], { type: "audio/mid" });
    this.saveBlob(blob, `${this.seqUI.currentSongTitle || "unnamed_song"}.mid`)
}