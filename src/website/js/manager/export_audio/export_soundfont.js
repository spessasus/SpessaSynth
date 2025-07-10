import { consoleColors } from "../../utils/console_colors.js";
import { closeNotification, showNotification } from "../../notification/notification.js";

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
                        "%cExporting soundfont...",
                        consoleColors.info
                    );
                    const exportingMessage = manager.localeManager.getLocaleString(`locale.exportAudio.formats.formats.soundfont.exportMessage.message`);
                    const notification = showNotification(
                        exportingMessage,
                        [
                            { type: "text", textContent: exportingMessage },
                            { type: "progress" }
                        ],
                        9999999,
                        false
                    );
                    const progressDiv = notification.div.getElementsByClassName("notification_progress")[0];
                    const detailMessage = notification.div.getElementsByTagName("p")[0];
                    const callback = (p) =>
                    {
                        progressDiv.style.width = `${p * 100}%`;
                        detailMessage.textContent = `${exportingMessage} ${Math.floor(p * 100)}%`;
                    };
                    const exported = await this.synth.exportSoundFont(trimmed, compressed, quality, callback);
                    this.saveUrl(exported.url, exported.fileName);
                    console.groupEnd();
                    closeNotification(notification.id);
                }
            }
        ],
        99999999,
        true,
        this.localeManager
    );
}