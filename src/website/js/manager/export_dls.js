import { applySnapshotToMIDI } from "../../../spessasynth_lib/midi_parser/midi_editor.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthWarn } from "../../../spessasynth_lib/utils/loggin.js";
import { consoleColors } from "../../../spessasynth_lib/utils/other.js";
import { trimSoundfont } from "../../../spessasynth_lib/soundfont/basic_soundfont/write_sf2/soundfont_trimmer.js";
import { closeNotification, showNotification } from "../notification/notification.js";
import { loadSoundFont } from "../../../spessasynth_lib/soundfont/load_soundfont.js";

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
                    SpessaSynthGroup(
                        "%cExporting DLS...",
                        consoleColors.info
                    );
                    const mid = await this.seq.getMIDI();
                    const soundfont = loadSoundFont(mid.embeddedSoundFont || this.soundFont);
                    applySnapshotToMIDI(mid, await this.synth.getSynthesizerSnapshot());
                    if (trimmed)
                    {
                        trimSoundfont(soundfont, mid);
                    }
                    try
                    {
                        const binary = soundfont.writeDLS();
                        const blob = new Blob([binary.buffer], { type: "audio/dls" });
                        this.saveBlob(blob, `${soundfont.soundFontInfo["INAM"] || "unnamed"}.dls`);
                    }
                    catch (e)
                    {
                        SpessaSynthWarn(
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
                    SpessaSynthGroupEnd();
                }
            }
        ],
        99999999,
        true,
        this.localeManager
    );
}