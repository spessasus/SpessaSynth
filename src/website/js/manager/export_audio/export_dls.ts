import { consoleColors } from "../../utils/console_colors.js";
import { closeNotification, showNotification } from "../../notification/notification.js";
import type { Manager } from "../manager.ts";
import { WorkerSynthesizer, WorkletSynthesizer } from "spessasynth_lib";
import { type BasicSoundBank, SoundBankLoader } from "spessasynth_core";

type writeDLSOptions =
    NonNullable<
        Parameters<typeof WorkerSynthesizer.prototype.writeDLS>[0]
    > extends Partial<infer T>
        ? T
        : never;

export async function writeDLS(
    this: Manager,
    options: writeDLSOptions
): Promise<{ binary: ArrayBuffer; fileName: string; sf?: BasicSoundBank }> {
    if (!this.synth || !this.seq) {
        throw new Error("Unexpected error.");
    }
    if (this.synth instanceof WorkerSynthesizer) {
        return this.synth.writeDLS(options);
    }

    const mid = await this.seq.getMIDI();

    const sfBin = mid.embeddedSoundBank ?? this.sBankBuffer;

    const sf = SoundBankLoader.fromArrayBuffer(sfBin);

    if (options.trim) {
        sf.trimSoundBank(mid);
    }

    const b = await sf.writeDLS({
        ...options,
        progressFunction: async (sampleName, sampleIndex, sampleCount) =>
            await options.progressFunction?.({
                sampleCount,
                sampleIndex,
                sampleName
            })
    });
    return {
        binary: b,
        fileName: sf.soundBankInfo.name + ".dls",
        sf
    };
}

export function _exportDLS(this: Manager) {
    const path = "locale.exportAudio.formats.formats.dls.warning.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "text",
                textContent: this.localeManager.getLocaleString(
                    path + "message"
                ),
                attributes: {
                    style: "font-weight: bold"
                }
            },
            {
                type: "toggle",
                translatePathTitle:
                    "locale.exportAudio.formats.formats.soundfont.options.trim",
                attributes: {
                    "trim-toggle": "1"
                }
            },
            {
                type: "button",
                textContent: this.localeManager.getLocaleString(
                    path + "details"
                ),
                onClick: () => {
                    window.open(
                        "https://github.com/spessasus/SpessaSynth/wiki/DLS-Conversion-Problem"
                    );
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
                    closeNotification(n.id);
                    console.group("%cExporting DLS...", consoleColors.info);
                    const exportingMessage = this.localeManager.getLocaleString(
                        `locale.exportAudio.formats.formats.dls.exportMessage.message`
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
                    const exported = await writeDLS.call(this, {
                        bankID: this.soundBankID,
                        trim: trimmed,
                        writeEmbeddedSoundBank: true,
                        progressFunction: (p) => {
                            const progress = p.sampleIndex / p.sampleCount;
                            progressDiv.style.width = `${progress * 100}%`;
                        }
                    });
                    this.seq?.play();
                    this.saveBlob(
                        new Blob([exported.binary], { type: "audio/dls" }),
                        exported.fileName
                    );
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
