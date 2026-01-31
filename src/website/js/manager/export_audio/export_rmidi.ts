import { consoleColors } from "../../utils/console_colors.js";
import {
    closeNotification,
    showNotification
} from "../../notification/notification.js";
import { ANIMATION_REFLOW_TIME } from "../../utils/animation_utils.js";
import type { Manager } from "../manager.ts";
import { WorkerSynthesizer } from "spessasynth_lib";
import { writeSF2 } from "./export_soundfont.ts";

type writeRMIDIOptions =
    NonNullable<
        Parameters<typeof WorkerSynthesizer.prototype.writeRMIDI>[0]
    > extends Partial<infer T>
        ? T
        : never;

async function writeRMIDI(
    this: Manager,
    opts: writeRMIDIOptions
): Promise<ArrayBuffer> {
    if (!this.synth || !this.seq) {
        throw new Error("Unexpected error.");
    }
    if (this.synth instanceof WorkerSynthesizer) {
        return this.synth.writeRMIDI(opts);
    }

    if (!this.seq.midiData) {
        throw new Error("No MIDI is loaded!");
    }
    if (!(opts.format === "sf2")) {
        throw new Error("DLS RMIDI write is not implemented here.");
    }
    const snapshot = await this.synth.getSnapshot();
    const mid = await this.seq.getMIDI();
    mid.applySnapshot(snapshot);
    const sfBin = await writeSF2.call(this, mid, opts);
    if (!sfBin.sf) {
        throw new Error("Unexpected error.");
    }

    return mid.writeRMIDI(sfBin.binary, {
        ...opts,
        soundBank: sfBin.sf
    });
}

export function _exportRMIDI(this: Manager) {
    if (!this.seq || !this.synth) {
        return;
    }
    const mid = this.seq.midiData!;

    const startAlbum = mid.getRMIDInfo("album") ?? "";
    const startArtist = mid.getRMIDInfo("artist") ?? "";
    const startGenre = mid.getRMIDInfo("genre") ?? "";
    const startComment =
        mid.getRMIDInfo("comment") ??
        "Created using SpessaSynth: https://spessasus.github.io/SpessaSynth";

    let pictureFile: File | undefined = undefined;
    if (mid.rmidiInfo.picture) {
        pictureFile = new File([mid.rmidiInfo.picture], "cover.png");
    }

    const path = "locale.exportAudio.formats.formats.rmidi.options.";
    const metadataPath = "locale.exportAudio.formats.metadata.";
    const n = showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "text",
                textContent: this.localeManager.getLocaleString(
                    path + "description"
                ),
                attributes: {
                    style: "max-width: 30ch; font-style: italic"
                }
            },
            {
                type: "toggle",
                translatePathTitle: path + "compress",
                attributes: {
                    "compress-toggle": "1",
                    checked: "checked"
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
                type: "input",
                translatePathTitle: metadataPath + "songTitle",
                attributes: {
                    name: "song_title",
                    type: "text",
                    value: this.seqUI!.currentSongTitle
                }
            },
            {
                type: "input",
                translatePathTitle: metadataPath + "album",
                attributes: {
                    value: startAlbum,
                    name: "album",
                    type: "text"
                }
            },
            {
                type: "input",
                translatePathTitle: metadataPath + "artist",
                attributes: {
                    value: startArtist,
                    name: "artist",
                    type: "text"
                }
            },
            {
                type: "input",
                translatePathTitle: metadataPath + "genre",
                attributes: {
                    value: startGenre,
                    name: "genre",
                    type: "text"
                }
            },
            {
                type: "input",
                translatePathTitle: metadataPath + "comment",
                attributes: {
                    value: startComment,
                    name: "comment",
                    type: "text"
                }
            },
            {
                type: "file",
                translatePathTitle: metadataPath + "albumCover",
                attributes: {
                    name: "cover",
                    accept: "image/*"
                }
            },
            {
                type: "input",
                translatePathTitle: path + "bankOffset",
                attributes: {
                    value:
                        this.extraBank?.offset?.toString?.() ??
                        mid.bankOffset.toString(),
                    name: "bank_offset",
                    type: "number"
                }
            },
            {
                type: "toggle",
                translatePathTitle: path + "adjust",
                attributes: {
                    name: "adjust",
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
                    const getEl = (q: string) => {
                        const e = n.div.querySelector(q);
                        return e as HTMLInputElement;
                    };
                    const compressed = getEl(
                        "input[compress-toggle='1']"
                    ).checked;
                    const quality =
                        Number.parseInt(getEl("input[type='range']").value) /
                        10;
                    const album = getEl("input[name='album']").value;
                    const artist = getEl("input[name='artist']").value;
                    const songTitle = getEl("input[name='song_title']").value;
                    const comment = getEl("input[name='comment']").value;
                    const genre = getEl("input[name='genre']").value;
                    const bankOffset = Number.parseInt(
                        getEl("input[name='bank_offset']").value
                    );
                    const adjust = getEl("input[name='adjust']").checked;

                    const picture =
                        getEl("input[type='file']")?.files?.[0] ?? pictureFile;
                    closeNotification(n.id);

                    console.groupCollapsed(
                        "%cExporting RMIDI...",
                        consoleColors.info
                    );
                    const localePath =
                        "locale.exportAudio.formats.formats.rmidi.progress.";
                    const notification = showNotification(
                        this.localeManager.getLocaleString(
                            localePath + "title"
                        ),
                        [
                            {
                                type: "text",
                                textContent: this.localeManager.getLocaleString(
                                    localePath + "loading"
                                ),
                                attributes: {
                                    class: "export_rmidi_message"
                                }
                            },
                            {
                                type: "progress"
                            }
                        ],
                        9_999_999,
                        false
                    );
                    // Allow the notification to show
                    await new Promise((r) => setTimeout(r, 500));
                    const message = notification.div.querySelectorAll(
                        ".export_rmidi_message"
                    )[0] as HTMLDivElement;
                    const progressDiv = notification.div.querySelectorAll(
                        ".notification_progress"
                    )[0] as HTMLDivElement;
                    message.textContent = this.localeManager.getLocaleString(
                        localePath + "modifyingMIDI"
                    );
                    await new Promise((r) =>
                        setTimeout(r, ANIMATION_REFLOW_TIME)
                    );

                    let pictureBuffer = undefined;
                    if (picture?.type?.split("/")[0] === "image") {
                        pictureBuffer = await picture.arrayBuffer();
                    }

                    const modifyingSoundFont =
                        this.localeManager.getLocaleString(
                            localePath + "modifyingSoundfont"
                        );

                    let copy = mid.getRMIDInfo("copyright");

                    if (!copy) {
                        const enc = this.seqUI!.encoding;
                        const dec = new TextDecoder(enc);
                        copy = mid.extraMetadata
                            .map((m) => dec.decode(m.data))
                            .join("\n");
                    }

                    // Export
                    const exported = await writeRMIDI.call(this, {
                        bankID: this.soundBankID,
                        compressionQuality: quality,
                        compress: compressed,
                        metadata: {
                            name: songTitle,
                            artist,
                            album,
                            picture: pictureBuffer,
                            midiEncoding: this.seqUI!.encoding,
                            comment,
                            genre,
                            copyright: copy
                        },
                        trim: true,
                        writeEmbeddedSoundBank: true,
                        format: "sf2",
                        sequencerID: 0,
                        decompress: false,
                        writeDefaultModulators: true,
                        writeExtendedLimits: true,
                        bankOffset,
                        correctBankOffset: adjust,
                        progressFunction: (p) => {
                            message.textContent = modifyingSoundFont;
                            progressDiv.style.width = `${(p.sampleIndex / p.sampleCount) * 100}%`;
                        }
                    });

                    this.saveBlob(new Blob([exported]), `${songTitle}.rmi`);
                    message.textContent = this.localeManager.getLocaleString(
                        localePath + "done"
                    );
                    closeNotification(notification.id);
                    console.groupEnd();
                }
            }
        ],
        9_999_999,
        true,
        this.localeManager
    );

    const getEl = (q: string) => {
        const e = n.div.querySelector(q);
        return e as HTMLInputElement;
    };

    // Adjust for the normal bank only
    getEl("input[name='adjust']").checked =
        mid.embeddedSoundBankSize === undefined;

    const input = getEl("input[type='file']");
    input.addEventListener("input", () => {
        if (input.files?.[0]) {
            input.parentElement!.firstChild!.textContent = input.files[0].name;
        }
    });
}
