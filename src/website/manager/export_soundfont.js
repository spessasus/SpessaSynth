import { applySnapshotToMIDI } from '../../spessasynth_lib/midi_parser/midi_editor.js'
import { SoundFont2 } from '../../spessasynth_lib/soundfont/soundfont.js'
import {
    SpessaSynthGroup,
    SpessaSynthGroupEnd,
} from '../../spessasynth_lib/utils/loggin.js'
import { consoleColors } from '../../spessasynth_lib/utils/other.js'
import { getTrimmedSoundfont } from '../../spessasynth_lib/soundfont/write/soundfont_trimmer.js'

/**
 * @this {Manager}
 * @returns {Promise<void>}
 * @private
 */
export async function _exportSoundfont()
{
    SpessaSynthGroup("%cExporting minified soundfont...",
        consoleColors.info);
    const mid = await this.seq.getMIDI();
    const soundfont = new SoundFont2(mid.embeddedSoundFont || this.soundFont);
    applySnapshotToMIDI(mid, await this.synth.getSynthesizerSnapshot());
    const binary = getTrimmedSoundfont(soundfont, mid);
    const blob = new Blob([binary.buffer], {type: "audio/soundfont"});
    let extension = soundfont.soundFontInfo["ifil"].split(".")[0] === "3" ? "sf3" : "sf2";
    this.saveBlob(blob, `${soundfont.soundFontInfo['INAM'] || "unnamed"}.${extension}`);
    SpessaSynthGroupEnd();
}