import { applySnapshotToMIDI } from "../../../spessasynth_lib/midi_parser/midi_editor.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd } from "../../../spessasynth_lib/utils/loggin.js";
import { consoleColors } from "../../../spessasynth_lib/utils/other.js";
import { trimSoundfont } from "../../../spessasynth_lib/soundfont/basic_soundfont/write_sf2/soundfont_trimmer.js";
import { closeNotification, showNotification } from "../notification/notification.js";
import { loadSoundFont } from "../../../spessasynth_lib/soundfont/load_soundfont.js";

/**
 * @this {Manager}
 * @returns {Promise<void>}
 * @private
 */
export async function _exportSoundfont()
{
    const path = "locale.exportAudio.formats.formats.soundfont.options.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "toggle",
                translatePathTitle: path + "trim",
                attributes: {
                    "trim-toggle": "1",
                    "checked": "checked"
                }
            },
            {
                type: "toggle",
                translatePathTitle: path + "compress",
                attributes: {
                    "compress-toggle": "1"
                }
            },
            {
                type: "range",
                translatePathTitle: path + "quality",
                attributes: {
                    "min": "0",
                    "max": "10",
                    "value": "5"
                }
            },
            {
                type: "button",
                textContent: this.localeManager.getLocaleString(path + "confirm"),
                onClick: async n =>
                {
                    const trimmed = n.div.querySelector("input[trim-toggle='1']").checked;
                    const compressed = n.div.querySelector("input[compress-toggle='1']").checked;
                    const quality = parseInt(n.div.querySelector("input[type='range']").value) / 10;
                    closeNotification(n.id);
                    SpessaSynthGroup(
                        "%cExporting minified soundfont...",
                        consoleColors.info
                    );
                    const mid = await this.seq.getMIDI();
                    const soundfont = loadSoundFont(mid.embeddedSoundFont || this.soundFont);
                    applySnapshotToMIDI(mid, await this.synth.getSynthesizerSnapshot());
                    if (trimmed)
                    {
                        trimSoundfont(soundfont, mid);
                    }
                    const binary = soundfont.write({
                        compress: compressed,
                        compressionQuality: quality,
                        compressionFunction: this.compressionFunc
                    });
                    const blob = new Blob([binary.buffer], { type: "audio/soundfont" });
                    let extension = soundfont.soundFontInfo["ifil"].split(".")[0] === "3" ? "sf3" : "sf2";
                    this.saveBlob(blob, `${soundfont.soundFontInfo["INAM"] || "unnamed"}.${extension}`);
                    SpessaSynthGroupEnd();
                }
            }
        ],
        99999999,
        true,
        this.localeManager
    );
}