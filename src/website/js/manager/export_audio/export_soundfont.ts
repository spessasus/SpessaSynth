import { consoleColors } from "../../utils/console_colors.js";
import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import type { Manager } from "../manager.ts";
import { WorkletSynthesizer } from "spessasynth_lib";

export function exportAndSaveSF2(this: Manager) {
    const path = "locale.exportAudio.formats.formats.soundfont.options.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "toggle",
                translatePathTitle: path + "trim",
                attributes: {
                    "trim-toggle": "1",
                    checked: "checked"
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
                    min: "0",
                    max: "10",
                    value: "5"
                }
            },
            {
                type: "button",
                textContent: this.localeManager.getLocaleString(
                    path + "confirm"
                ),
                onClick: async (n) => {
                    if (!this.synth) {
                        return;
                    }
                    if (this.synth instanceof WorkletSynthesizer) {
                        throw new Error("Not implemented");
                    }
                    const getEl = (q: string) => {
                        const e = n.div.querySelector(q);
                        return e as HTMLInputElement;
                    };
                    const trimmed = getEl("input[trim-toggle='1']").checked;
                    const compressed = getEl(
                        "input[compress-toggle='1']"
                    ).checked;
                    const quality =
                        parseInt(getEl("input[type='range']").value) / 10;
                    closeNotification(n.id);
                    console.group(
                        "%cExporting soundfont...",
                        consoleColors.info
                    );
                    const exportingMessage = this.localeManager.getLocaleString(
                        `locale.exportAudio.formats.formats.soundfont.exportMessage.message`
                    );
                    const notification = showNotification(
                        exportingMessage,
                        [
                            { type: "text", textContent: exportingMessage },
                            { type: "progress" }
                        ],
                        9999999,
                        false
                    );
                    const progressDiv = notification.div.getElementsByClassName(
                        "notification_progress"
                    )[0] as HTMLDivElement;
                    const detailMessage =
                        notification.div.getElementsByTagName("p")[0];
                    const exported = await this.synth.writeSF2({
                        bankID: this.soundBankID,
                        trim: trimmed,
                        compress: compressed,
                        compressionQuality: quality,
                        progressFunction: (p) => {
                            const progress = p.sampleIndex / p.sampleCount;
                            progressDiv.style.width = `${progress * 100}%`;
                            detailMessage.textContent = `${exportingMessage} ${Math.floor(progress * 100)}%`;
                        }
                    });
                    this.seq?.play();
                    this.saveBlob(
                        new Blob([exported.binary]),
                        exported.fileName
                    );
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
