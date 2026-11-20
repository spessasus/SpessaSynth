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
import { showOutOfMemoryWarning } from "./utils/show_out_of_memory_warning.ts";

type writeSFeOptions =
    NonNullable<
        Parameters<typeof WorkerSynthesizer.prototype.writeSFe>[0]
    > extends Partial<infer T>
        ? T
        : never;

export async function writeSFe(
    this: Manager,
    options: writeSFeOptions,
    midi?: BasicMIDI
): Promise<{ binary: ArrayBuffer; fileName: string; sf?: BasicSoundBank }> {
    if (!this.synth || !this.seq) {
        throw new Error("Unexpected error.");
    }
    if (this.synth instanceof WorkerSynthesizer) {
        return this.synth.writeSFe(options);
    }

    // The RMIDI export passes its MIDI with the synthesizer snapshot applied, so trimming keeps those presets
    const mid = midi ?? (await this.seq.getMIDI());

    const sfBin = mid.embeddedSoundBank ?? this.sBankBuffer;

    const sf = SoundBankLoader.fromArrayBuffer(sfBin);

    if (options.trim) {
        sf.trim(mid.getUsedProgramsAndKeys(sf));
    }

    const b = sf.writeSFe(options);
    return {
        binary: b,
        fileName: sf.soundBankInfo.name + ".sf4",
        sf
    };
}

export function exportAndSaveSFe(this: Manager) {
    const path = "locale.exportFile.formats.formats.sfe.options.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "text",
                textContent: this.localeManager.getLocaleString(
                    path + "message"
                )
            },
            {
                type: "toggle",
                translatePathTitle:
                    "locale.exportFile.formats.formats.soundfont.options.trim",
                attributes: {
                    "trim-toggle": "1",
                    checked: "checked"
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
                    const trimmed = n.div.querySelector<HTMLInputElement>(
                        "input[trim-toggle='1']"
                    )!.checked;
                    closeNotification(n.id);
                    console.group("%cExporting SFe...", consoleColors.info);
                    const exportingMessage = this.localeManager.getLocaleString(
                        `locale.exportFile.formats.formats.sfe.exportMessage.message`
                    );
                    const notification = showNotification(
                        exportingMessage,
                        [
                            { type: "text", textContent: exportingMessage },
                            { type: "progress" }
                        ],
                        9_999_999,
                        false
                    );
                    const progressDiv = notification.div.querySelectorAll(
                        ".notification_progress"
                    )[0] as HTMLDivElement;
                    let exported;
                    try {
                        exported = await writeSFe.call(this, {
                            bankID: this.soundBankID,
                            trim: trimmed,
                            writeEmbeddedSoundBank: true,
                            sequencerID: 0,
                            rf64: false,
                            software: "SpessaSynth",
                            progressFunction: (p) => {
                                progressDiv.style.width = `${p * 100}%`;
                            }
                        });
                    } catch (error) {
                        closeNotification(notification.id);
                        console.groupEnd();
                        showOutOfMemoryWarning(this.localeManager, error);
                        return;
                    }
                    this.seq?.play();
                    this.saveBlob(
                        new Blob([exported.binary]),
                        exported.fileName
                    );
                    closeNotification(notification.id);
                    console.groupEnd();
                }
            }
        ],
        99_999_999,
        true,
        this.localeManager
    );
}
