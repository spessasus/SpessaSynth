import { consoleColors } from "../utils/console_colors.js";
import { closeNotification, showNotification } from "../notification/notification.js";
import { loadSoundFont } from "spessasynth_core";

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
                    console.group(
                        "%cExporting minified soundfont...",
                        consoleColors.info
                    );
                    const mid = await this.seq.getMIDI();
                    const soundfont = loadSoundFont(mid.embeddedSoundFont || this.soundFont);
                    mid.applySnapshotToMIDI(await this.synth.getSynthesizerSnapshot());
                    if (trimmed)
                    {
                        soundfont.trimSoundBank(mid);
                    }
                    const binary = soundfont.write({
                        compress: compressed,
                        compressionQuality: quality,
                        compressionFunction: await this.getVorbisEncodeFunction()
                    });
                    const blob = new Blob([binary.buffer], { type: "audio/soundfont" });
                    let extension = soundfont.soundFontInfo["ifil"].split(".")[0] === "3" ? "sf3" : "sf2";
                    this.saveBlob(blob, `${soundfont.soundFontInfo["INAM"] || "unnamed"}.${extension}`);
                    console.groupEnd();
                }
            }
        ],
        99999999,
        true,
        this.localeManager
    );
}