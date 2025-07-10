import { consoleColors } from "../../utils/console_colors.js";
import { closeNotification, showNotification } from "../../notification/notification.js";

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
                    const exportingMessage = manager.localeManager.getLocaleString(`locale.exportAudio.formats.formats.dls.exportMessage.message`);
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
                    const callback = (p) =>
                    {
                        progressDiv.style.width = `${p * 100}%`;
                    };
                    const exported = await this.synth.exportDLS(trimmed, callback);
                    this.saveUrl(exported.url, exported.fileName);
                    closeNotification(notification.id);
                    console.groupEnd();
                }
            }
        ],
        99999999,
        true,
        this.localeManager
    );
}