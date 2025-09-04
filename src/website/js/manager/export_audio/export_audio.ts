import {
    closeNotification,
    type NotificationContent,
    showNotification
} from "../../notification/notification.js";
import { audioBufferToWav } from "spessasynth_lib";
import { formatTime } from "../../utils/other.js";
import { consoleColors } from "../../utils/console_colors.js";

import { ANIMATION_REFLOW_TIME } from "../../utils/animation_utils.js";
import { type WaveMetadata } from "spessasynth_core";
import JSZip from "jszip";
import type { Manager } from "../manager.ts";

const RENDER_AUDIO_TIME_INTERVAL = 250;

export async function _doExportAudioData(
    this: Manager,
    normalizeAudio = true,
    sampleRate = 44100,
    additionalTime = 2,
    separateChannels = false,
    meta: Partial<WaveMetadata>,
    loopCount = 0
): Promise<void> {
    this.isExporting = true;
    if (!this.seq?.midiData) {
        throw new Error("No sequencer active");
    }
    if (!this.synth) {
        throw new Error("No Synth active!");
    }
    // Get locales
    const exportingMessage = this.localeManager.getLocaleString(
        `locale.exportAudio.formats.formats.wav.exportMessage.message`
    );
    const estimatedMessage = this.localeManager.getLocaleString(
        `locale.exportAudio.formats.formats.wav.exportMessage.estimated`
    );
    const addingEffects = this.localeManager.getLocaleString(
        "locale.exportAudio.formats.formats.wav.exportMessage.addingEffects"
    );
    const loadingMessage = this.localeManager.getLocaleString(
        `locale.synthInit.genericLoading`
    );
    const notification = showNotification(
        exportingMessage,
        [{ type: "text", textContent: loadingMessage }, { type: "progress" }],
        9999999,
        false
    );

    const parsedMid = this.seq.midiData;
    // Calculate times
    const playbackRate = this.seq.playbackRate;
    const loopStartAbsolute =
        parsedMid.midiTicksToSeconds(parsedMid.loop.start) / playbackRate;
    const loopEndAbsolute =
        parsedMid.midiTicksToSeconds(parsedMid.loop.end) / playbackRate;
    const loopDuration = loopEndAbsolute - loopStartAbsolute;
    const duration =
        parsedMid.duration / playbackRate +
        additionalTime +
        loopDuration * loopCount;

    // Progress tracking
    const detailMessage = notification.div.getElementsByTagName("p")[0];
    const progressDiv = notification.div.getElementsByClassName(
        "notification_progress"
    )[0] as HTMLDivElement;
    const RATI_SECONDS = RENDER_AUDIO_TIME_INTERVAL / 1000;
    let estimatedTime = duration * playbackRate;
    const smoothingFactor = 0.1; // For smoothing estimated time

    let lastProgress = 0;
    const showProgress = (prog: number, str: string, time = true) => {
        progressDiv.style.width = `${prog * 100}%`;
        if (time) {
            // Calculate estimated time
            const hasRendered = (prog - lastProgress) * duration;
            lastProgress = prog;
            const speed = hasRendered / RATI_SECONDS;
            const estimated = ((1 - prog) / speed) * duration;
            if (estimated === Infinity) {
                return;
            }
            // Smooth out estimated using exponential moving average
            estimatedTime =
                smoothingFactor * estimated +
                (1 - smoothingFactor) * estimatedTime;
            detailMessage.innerText = `${str} ${formatTime(estimatedTime).time}`;
        } else {
            detailMessage.innerText = `${str} ${Math.floor(prog * 100_0) / 10}%`;
        }
    };

    // Rendering time!
    const renderedData = await this.synth.renderAudio(sampleRate, {
        extraTime: additionalTime,
        separateChannels,
        loopCount,
        progressCallback: (progress, stage) => {
            if (stage === 0) {
                showProgress(progress, estimatedMessage);
            } else {
                showProgress(progress, addingEffects);
            }
        }
    });
    this.seq.play();

    if (separateChannels) {
        const snapshot = await this.synth.getSnapshot();
        const renderedChannels = renderedData;
        const separatePath = `locale.exportAudio.formats.formats.wav.options.separateChannels.saving.`;
        const content: NotificationContent[] = [];
        const usedChannels = new Set();
        for (const t of parsedMid.tracks) {
            t.channels.forEach((c) => usedChannels.add(c));
        }
        for (let i = 0; i < 16; i++) {
            // Check if all channels are muted
            let muted = true;
            for (let j = i; j < snapshot.channelSnapshots.length; j += 16) {
                if (!snapshot.channelSnapshots[j].isMuted) {
                    muted = false;
                    break;
                }
            }
            if (!usedChannels.has(i) || muted) {
                continue;
            }
            const channel = i;
            const ct: NotificationContent = {
                type: "button",
                textContent: this.localeManager.getLocaleString(
                    separatePath + "save",
                    [i + 1]
                ),
                onClick: async (_n, target) => {
                    const text = target.textContent;
                    target.textContent = this.localeManager.getLocaleString(
                        "locale.exportAudio.formats.formats.wav.exportMessage.convertWav"
                    );
                    await new Promise((r) =>
                        setTimeout(r, ANIMATION_REFLOW_TIME)
                    );

                    // Stereo
                    const audioOut = audioBufferToWav(
                        renderedChannels[channel],
                        {
                            normalizeAudio: false
                        }
                    );
                    const fileName = `${channel + 1} - ${snapshot.channelSnapshots[i].patch.name}.wav`;
                    this.saveBlob(
                        new Blob([audioOut], { type: "audio/wav" }),
                        fileName
                    );
                    target.classList.add("green_button");
                    target.textContent = text;
                }
            };
            content.push(ct);
        }
        content.push({
            type: "button",
            textContent: this.localeManager.getLocaleString(
                separatePath + "saveAll"
            ),
            onClick: async (_n, target) => {
                const text = target.textContent;
                target.textContent = this.localeManager.getLocaleString(
                    "locale.exportAudio.formats.formats.wav.exportMessage.convertWav"
                );
                await new Promise((r) => setTimeout(r, ANIMATION_REFLOW_TIME));

                const zipped = new JSZip();
                renderedChannels.forEach((channel, i) => {
                    // Check if all channels are muted
                    let muted = true;
                    for (
                        let j = i;
                        j < snapshot.channelSnapshots.length;
                        j += 16
                    ) {
                        if (!snapshot.channelSnapshots[j].isMuted) {
                            muted = false;
                            break;
                        }
                    }
                    if (!usedChannels.has(i) || muted) {
                        return;
                    }
                    // Stereo
                    const audioOut = audioBufferToWav(channel, {
                        normalizeAudio: false
                    });
                    const fileName = `${i + 1} - ${snapshot.channelSnapshots[i].patch.name}.wav`;
                    zipped.file(fileName, audioOut);
                    console.info(
                        `%cAdding file %c${fileName}%c to zip...`,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info
                    );
                });
                const zipFile = await zipped.generateAsync({ type: "blob" });
                this.saveBlob(
                    zipFile,
                    `${this.seqUI?.currentSongTitle ?? "unnamed"}.zip`
                );
                target.classList.add("green_button");
                target.textContent = text;
            }
        });
        const n = showNotification(
            this.localeManager.getLocaleString(separatePath + "title"),
            content,
            99999999,
            true,
            undefined,
            {
                display: "flex",
                flexWrap: "wrap",
                flexDirection: "row"
            }
        );
        n.div.style.width = "30rem";
    } else {
        detailMessage.innerText = this.localeManager.getLocaleString(
            "locale.exportAudio.formats.formats.wav.exportMessage.convertWav"
        );
        // Let the browser show
        await new Promise((r) => setTimeout(r, ANIMATION_REFLOW_TIME));

        const startOffset = parsedMid.midiTicksToSeconds(parsedMid.firstNoteOn);
        const loopStart = loopStartAbsolute - startOffset;
        const loopEnd = loopEndAbsolute - startOffset;
        const loop = { start: loopStart, end: loopEnd };
        console.info(
            `%cWriting loop points: start %c${loopStart}%c, end:%c${loopEnd}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized
        );
        const wav = audioBufferToWav(renderedData[0], {
            normalizeAudio,
            metadata: meta,
            loop
        });
        this.saveBlob(
            wav,
            `${this.seqUI!.currentSongTitle || "unnamed_song"}.wav`
        );
    }
    closeNotification(notification.id);
    this.isExporting = false;
}

export function _exportAudioData(this: Manager) {
    if (this.isExporting) {
        return;
    }
    const wavPath = `locale.exportAudio.formats.formats.wav.options.`;
    const metadataPath = "locale.exportAudio.formats.metadata.";
    const mid = this.seq!.midiData!;
    const startAlbum = mid.getRMIDInfo("album") ?? "";
    const startArtist = mid.getRMIDInfo("artist") ?? "";
    const startGenre = mid.getRMIDInfo("genre") ?? "";
    const WAV_OPTIONS: NotificationContent[] = [
        {
            type: "text",
            textContent: this.localeManager.getLocaleString(
                wavPath + "description"
            ),
            attributes: {
                style: "max-width: 30ch; font-style: italic"
            }
        },
        {
            type: "toggle",
            translatePathTitle: wavPath + "normalizeVolume",
            attributes: {
                "normalize-volume-toggle": "1",
                checked: "checked"
            }
        },
        {
            type: "input",
            translatePathTitle: wavPath + "additionalTime",
            attributes: {
                value: "2",
                type: "number",
                "additional-time": "1"
            }
        },
        {
            type: "input",
            translatePathTitle: wavPath + "sampleRate",
            attributes: {
                value: "44100",
                type: "number",
                "sample-rate": "1"
            }
        },
        {
            type: "input",
            translatePathTitle: wavPath + "loopCount",
            attributes: {
                value: "0",
                type: "number",
                "loop-count": "1"
            }
        },
        {
            type: "toggle",
            translatePathTitle: wavPath + "separateChannels",
            attributes: {
                "separate-channels-toggle": "1"
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
            type: "button",
            textContent: this.localeManager.getLocaleString(
                wavPath + "confirm"
            ),
            onClick: (n) => {
                closeNotification(n.id);

                const getEl = (q: string) => {
                    const e = n.div.querySelector(q);
                    return e as HTMLInputElement;
                };

                const normalizeVolume = getEl(
                    "input[normalize-volume-toggle]"
                ).checked;
                const additionalTime = getEl("input[additional-time]").value;
                const sampleRate = getEl("input[sample-rate]").value;
                const loopCount = getEl("input[loop-count]").value;
                const separateChannels = getEl(
                    "input[separate-channels-toggle]"
                ).checked;
                const artist = getEl("input[name='artist']").value;
                const album = getEl("input[name='album']").value;
                const title = getEl("input[name='song_title']").value;
                const genre = getEl("input[name='genre']").value;
                const metadata: Partial<WaveMetadata> = {
                    artist: artist.length > 0 ? artist : undefined,
                    album: album.length > 0 ? album : undefined,
                    title: title.length > 0 ? title : undefined,
                    genre: genre.length > 0 ? genre : undefined
                };

                void this._doExportAudioData(
                    normalizeVolume,
                    parseInt(sampleRate),
                    parseInt(additionalTime),
                    separateChannels,
                    metadata,
                    parseInt(loopCount)
                );
            }
        }
    ];

    showNotification(
        this.localeManager.getLocaleString(wavPath + "title"),
        WAV_OPTIONS,
        9999999,
        true,
        this.localeManager
    );
}
