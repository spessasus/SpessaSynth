import { SoundFont2 } from '../../spessasynth_lib/soundfont/soundfont.js'
import { getTrimmedSoundfont } from '../../spessasynth_lib/soundfont/write/soundfont_trimmer.js'
import { applySnapshotToMIDI } from '../../spessasynth_lib/midi_parser/midi_editor.js'
import { closeNotification, showNotification } from '../js/notification/notification.js'
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd } from '../../spessasynth_lib/utils/loggin.js'
import { consoleColors } from '../../spessasynth_lib/utils/other.js'
import { writeRMIDI } from '../../spessasynth_lib/midi_parser/rmidi_writer.js'

/**
 * @this {Manager}
 * @returns {Promise<void>}
 * @private
 */
export async function _exportRMIDI()
{
    SpessaSynthGroupCollapsed("%cExporting RMIDI...",
        consoleColors.info);
    const localePath = "locale.exportAudio.formats.formats.rmidi.progress.";
    const notification = showNotification(
        this.localeManager.getLocaleString(localePath + "title"),
        [{
            type: "text",
            textContent: this.localeManager.getLocaleString(localePath + "loading"),
            attributes: {
                "class": "export_rmidi_message"
            }
        }],
        9999999,
        false
    );
    // allow the notification to show
    await new Promise(r => setTimeout(r, 500));
    const message = notification.div.getElementsByClassName("export_rmidi_message")[0];
    const mid = await this.seq.getMIDI();
    const font = new SoundFont2(mid.embeddedSoundFont || this.soundFont);

    message.textContent = this.localeManager.getLocaleString(localePath + "modifyingMIDI");
    await new Promise(r => setTimeout(r, 10));

    applySnapshotToMIDI(mid, await this.synth.getSynthesizerSnapshot());

    message.textContent = this.localeManager.getLocaleString(localePath + "modifyingSoundfont");
    await new Promise(r => setTimeout(r, 10));

    const newFont = getTrimmedSoundfont(font, mid);

    message.textContent = this.localeManager.getLocaleString(localePath + "saving");
    await new Promise(r => setTimeout(r, 10));

    const rmidBinary = writeRMIDI(newFont, mid, font);
    const blob = new Blob([rmidBinary.buffer], {type: "audio/rmid"})
    this.saveBlob(blob, `${mid.midiName || "unnamed_song"}.rmi`);
    message.textContent = this.localeManager.getLocaleString(localePath + "done");
    closeNotification(notification.id);
    SpessaSynthGroupEnd();
}