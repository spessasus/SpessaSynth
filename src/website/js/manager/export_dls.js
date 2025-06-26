import { consoleColors } from "../utils/console_colors.js";
import { closeNotification, showNotification } from "../notification/notification.js";
import { loadSoundFont } from "spessasynth_core";

/**
 * @this {Manager}
 * @returns {Promise<void>}
 * @private
 */
export async function _exportDLS()
{
    const path = "locale.exportAudio.formats.formats.dls.warning.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "text",
                textContent: this.localeManager.getLocaleString(path + "message"),
                attributes: {
                    "style": "font-weight: bold"
                }
            },
            {
                type: "toggle",
                translatePathTitle: "locale.exportAudio.formats.formats.soundfont.options.trim",
                attributes: {
                    "trim-toggle": "1"
                }
            },
            {
                type: "button",
                textContent: this.localeManager.getLocaleString(path + "details"),
                onClick: () =>
                {
                    window.open("https://github.com/spessasus/SpessaSynth/wiki/DLS-Conversion-Problem");
                }
            },
            {
                type: "button",
                textContent: this.localeManager.getLocaleString(path + "confirm"),
                onClick: async n =>
                {
                    const trimmed = n.div.querySelector("input[trim-toggle='1']").checked;
                    closeNotification(n.id);
                    console.group(
                        "%cExporting DLS...",
                        consoleColors.info
                    );
                    const mid = await this.seq.getMIDI();
                    const soundfont = loadSoundFont(mid.embeddedSoundFont || this.soundFont);
                    mid.applySnapshotToMIDI(await this.synth.getSynthesizerSnapshot());
                    if (trimmed)
                    {
                        soundfont.trimSoundBank(mid);
                    }
                    try
                    {
                        const binary = await soundfont.writeDLS();
                        const blob = new Blob([binary.buffer], { type: "audio/dls" });
                        this.saveBlob(blob, `${soundfont.soundFontInfo["INAM"] || "unnamed"}.dls`);
                    }
                    catch (e)
                    {
                        console.warn(
                            "Failed to export DLS: ",
                            e
                        );
                        showNotification(
                            this.localeManager.getLocaleString("locale.error"),
                            [
                                {
                                    type: "text",
                                    textContent: e,
                                    attributes: {
                                        "style": "font-weight: bold; color: red"
                                    }
                                }
                            ]
                        );
                    }
                    console.groupEnd();
                }
            }
        ],
        99999999,
        true,
        this.localeManager
    );
}