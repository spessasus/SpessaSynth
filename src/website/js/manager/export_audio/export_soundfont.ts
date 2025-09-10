import { consoleColors } from "../../utils/console_colors.js";
import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import type { Manager } from "../manager.ts";
import { WorkerSynthesizer } from "spessasynth_lib";
import {
    type BasicMIDI,
    type BasicSoundBank,
    SoundBankLoader
} from "spessasynth_core";
import { encodeVorbis } from "../../../../externals/encode_vorbis.ts";

type writeSF2Options =
    NonNullable<
        Parameters<typeof WorkerSynthesizer.prototype.writeSF2>[0]
    > extends Partial<infer T>
        ? T
        : never;

export async function writeSF2(
    this: Manager,
    mid: BasicMIDI,
    options: writeSF2Options
): Promise<{ binary: ArrayBuffer; fileName: string; sf?: BasicSoundBank }> {
    if (!this.synth || !this.seq) {
        throw new Error("Unexpected error.");
    }
    if (this.synth instanceof WorkerSynthesizer) {
        return this.synth.writeSF2(options);
    }

    const sfBin = mid.embeddedSoundBank ?? this.sBankBuffer;

    const sf = SoundBankLoader.fromArrayBuffer(sfBin);

    console.log("TRIM");
    if (options.trim) {
        sf.trimSoundBank(mid);
    }

    const compressionFunction = (audioData: Float32Array, sampleRate: number) =>
        encodeVorbis(audioData, sampleRate, options.compressionQuality);

    const b = await sf.writeSF2({
        ...options,
        progressFunction: async (sampleName, sampleIndex, sampleCount) =>
            await options.progressFunction?.({
                sampleCount,
                sampleIndex,
                sampleName
            }),
        compressionFunction: compressionFunction
    });
    return {
        binary: b,
        sf,
        fileName:
            sf.soundBankInfo.name +
            (sf.soundBankInfo.version.major === 3 ? ".sf3" : ".sf2")
    };
}

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
                    const exported = await writeSF2.call(
                        this,
                        await this.seq!.getMIDI(),
                        {
                            bankID: this.soundBankID,
                            trim: trimmed,
                            compress: compressed,
                            writeDefaultModulators: true,
                            writeExtendedLimits: true,
                            writeEmbeddedSoundBank: true,
                            decompress: false,
                            compressionQuality: quality,
                            progressFunction: (p) => {
                                const progress = p.sampleIndex / p.sampleCount;
                                progressDiv.style.width = `${progress * 100}%`;
                                detailMessage.textContent = `${exportingMessage} ${Math.floor(progress * 100)}%`;
                            }
                        }
                    );
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
