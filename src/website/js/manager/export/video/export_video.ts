import {
    closeNotification,
    type NotificationContent,
    showNotification
} from "../../../notification/notification.js";
import type { Manager } from "../../manager.ts";
import { getVideoSettingsSnapshot } from "./snapshot_settings.ts";
import { renderAudioData } from "../render_audio_data.ts";
import { getOfflineMIDIData } from "../../../renderer/offline/offline_renderer.ts";
import { renderAndMuxVideo } from "./mux_video.ts";

const LOCALE_PATH = `locale.exportFile.formats.formats.video.`;

const RESOLUTIONS = {
    "1280x720": "1280x720",
    "1920x1080": "1920x1080",
    "2560x1440": "2560x1440",
    "3840x2160": "3840x2160",
    match: "Auto"
};

const FORMATS = {
    webm: "WebM",
    mp4: "MP4"
};
const FPS_MIN = 15;
const FPS_MAX = 240;

export interface VideoExportOptions {
    format: "webm" | "mp4";
    normalizeAudio: boolean;
    sampleRate: number;
    additionalTime: number;
    loopCount: number;
    resolution: {
        width: number;
        height: number;
    };
    fps: number;
    songTitle: string;
}

export function showVideoExportMenu(this: Manager) {
    if (!this.synth || this.isExporting || !this.seqUI?.currentSongTitle) {
        return;
    }
    const optionsPath = LOCALE_PATH + `options.`;
    const wavOptionsPath = `locale.exportFile.formats.formats.wav.options.`;
    const metadataPath = `locale.exportFile.formats.metadata.`;

    const contents: NotificationContent[] = [
        {
            type: "text",
            textContent: this.localeManager.getLocaleString(
                optionsPath + "description"
            ),
            attributes: {
                style: "max-width: 30ch; font-style: italic"
            }
        },
        {
            type: "select",
            translatePathTitle: optionsPath + "format",
            selectOptions: FORMATS,
            attributes: {
                "video-format": "1"
            }
        },
        {
            type: "toggle",
            translatePathTitle: wavOptionsPath + "normalizeVolume",
            attributes: {
                "normalize-volume-toggle": "1",
                checked: "checked"
            }
        },
        {
            type: "input",
            translatePathTitle: wavOptionsPath + "additionalTime",
            attributes: {
                value: "2",
                type: "number",
                "additional-time": "1"
            }
        },
        {
            type: "input",
            translatePathTitle: wavOptionsPath + "sampleRate",
            attributes: {
                value: this.synth.context.sampleRate.toString(),
                type: "number",
                "sample-rate": "1"
            }
        },
        {
            type: "input",
            translatePathTitle: wavOptionsPath + "loopCount",
            attributes: {
                value: "0",
                type: "number",
                "loop-count": "1"
            }
        },
        {
            type: "select",
            translatePathTitle: optionsPath + "resolution",
            selectOptions: RESOLUTIONS,
            attributes: {
                "video-resolution": "1"
            }
        },
        {
            type: "input",
            translatePathTitle: optionsPath + "frameRate",
            attributes: {
                value: "60",
                type: "number",
                "frame-rate": "1",
                min: FPS_MIN.toString(),
                max: FPS_MAX.toString()
            }
        },
        {
            type: "input",
            translatePathTitle: metadataPath + "songTitle",
            attributes: {
                name: "song_title",
                type: "text",
                value: this.seqUI.currentSongTitle
            }
        },
        {
            type: "button",
            textContent: this.localeManager.getLocaleString(
                optionsPath + "confirm"
            ),
            onClick: (n) => {
                const getEl = (q: string) => {
                    const e = n.div.querySelector(q);
                    return e as HTMLInputElement;
                };
                const getSelect = (q: string) => {
                    const e = n.div.querySelector(q);
                    return e as HTMLSelectElement;
                };

                const formatValue = getSelect("select[video-format]").value;
                const format = formatValue as "webm" | "mp4";
                const normalizeAudio = getEl(
                    "input[normalize-volume-toggle]"
                ).checked;
                const additionalTime = Number.parseFloat(
                    getEl("input[additional-time]").value
                );
                const sampleRate = Number.parseInt(
                    getEl("input[sample-rate]").value
                );
                const loopCount = Number.parseInt(
                    getEl("input[loop-count]").value
                );
                const resolutionValue = getSelect(
                    "select[video-resolution]"
                ).value;
                const fps = Math.max(
                    FPS_MIN,
                    Math.min(
                        FPS_MAX,
                        Number.parseInt(getEl("input[frame-rate]").value)
                    )
                );
                const songTitle = getEl("input[name='song_title']").value;
                const canvas =
                    document.querySelector<HTMLCanvasElement>("#note_canvas")!;
                let resolution;
                if (resolutionValue === "match") {
                    resolution = {
                        width: Math.floor(canvas.clientWidth),
                        height: Math.floor(canvas.clientHeight)
                    };
                } else {
                    const match = /^(\d+)x(\d+)$/.exec(resolutionValue.trim());
                    if (!match) {
                        showNotification(
                            this.localeManager.getLocaleString(
                                LOCALE_PATH + `exportMessage.invalidResolution`
                            ),
                            [],
                            5,
                            true
                        );
                        return;
                    }
                    const width = Number.parseInt(match[1]);
                    const height = Number.parseInt(match[2]);
                    if (width < 2 || height < 2) {
                        showNotification(
                            this.localeManager.getLocaleString(
                                LOCALE_PATH + `exportMessage.invalidResolution`
                            ),
                            [],
                            5,
                            true
                        );
                        return;
                    }
                    resolution = { width, height };
                }

                closeNotification(n.id);
                void renderAndExportVideoData.call(this, {
                    format,
                    normalizeAudio,
                    sampleRate,
                    additionalTime,
                    loopCount: Math.floor(loopCount),
                    resolution,
                    fps,
                    songTitle
                });
            }
        }
    ];

    showNotification(
        this.localeManager.getLocaleString(optionsPath + "title"),
        contents,
        9_999_999,
        true,
        this.localeManager
    );
}

function audioBufferToMono(buffer: AudioBuffer) {
    const left = buffer.getChannelData(0);
    if (buffer.numberOfChannels <= 1) {
        return new Float32Array(left);
    }
    const right = buffer.getChannelData(1);
    const len = left.length;
    const mono = new Float32Array(len);
    for (let i = 0; i < len; i++) {
        mono[i] = (left[i] + right[i]) / 2;
    }
    return mono;
}

export async function renderAndExportVideoData(
    this: Manager,
    options: VideoExportOptions
) {
    this.isExporting = true;
    const messagePath = LOCALE_PATH + `exportMessage.`;
    const notification = showNotification(
        this.localeManager.getLocaleString(messagePath + "message"),
        [
            {
                type: "text",
                textContent: this.localeManager.getLocaleString(
                    messagePath + "renderingAudio"
                )
            },
            { type: "progress" }
        ],
        9_999_999,
        false
    );
    const detailMessage = notification.div.querySelector("p")!;
    const progressDiv = notification.div.querySelector<HTMLDivElement>(
        ".notification_progress"
    )!;
    const setProgress = (fraction: number, label: string) => {
        progressDiv.style.width = `${Math.min(1, Math.max(0, fraction)) * 100}%`;
        detailMessage.textContent = `${label} ${Math.round(fraction * 10_000) / 100}%`;
    };
    try {
        const snapshot = getVideoSettingsSnapshot.call(this);

        // Render audio and capture events
        const rendered = await renderAudioData.call(this, options.sampleRate, {
            extraTime: options.additionalTime,
            loopCount: options.loopCount,
            separateChannels: true,
            recordEvents: true,
            preserveSynthParams: true,
            sequencerID: 0,
            enableEffects: true,
            progressCallback: (progress) => {
                setProgress(
                    progress * 0.2,
                    this.localeManager.getLocaleString(
                        messagePath + "renderingAudio"
                    )
                );
            }
        });
        if (!rendered.eventLog || rendered.duration === undefined) {
            console.error("Unexpected lack of event log.");
            return;
        }

        const midi = await this.seq!.getMIDI();
        console.info(
            `Video export event log: ${rendered.eventLog.events.length} recorded events. ` +
                `Snapshot: ${snapshot.renderer.rendererMode} mode, ` +
                `${snapshot.renderer.keyRange.min}-${snapshot.renderer.keyRange.max} keys.`
        );

        setProgress(
            0.2,
            this.localeManager.getLocaleString(messagePath + "renderingVideo")
        );
        const waveforms = rendered.visual
            .slice(0, 16)
            .map((buffer) => audioBufferToMono(buffer));
        const rendererData = {
            snapshot,
            waveforms,
            waveformOffset: 0,
            waveformLength: waveforms[0]?.length ?? 0,
            sampleRate: rendered.visual[0]?.sampleRate ?? options.sampleRate,
            eventLog: rendered.eventLog,
            midi: getOfflineMIDIData(
                midi,
                rendered.loopCount ?? 0,
                snapshot.playbackRate,
                rendered.duration
            ),
            width: options.resolution.width,
            height: options.resolution.height
        };
        const blob = await renderAndMuxVideo(
            rendered.output,
            {
                format: options.format,
                width: options.resolution.width,
                height: options.resolution.height,
                fps: options.fps,
                sampleRate: options.sampleRate,
                normalizeAudio: options.normalizeAudio,
                onProgress: (fraction) => {
                    setProgress(
                        0.2 + 0.8 * fraction,
                        this.localeManager.getLocaleString(
                            messagePath + "renderingVideo"
                        )
                    );
                }
            },
            rendererData
        );
        const extension = options.format === "mp4" ? "mp4" : "webm";
        this.saveBlob(
            blob,
            `${options.songTitle || "unnamed_song"}.${extension}`
        );
    } catch (error) {
        console.error(error);

        detailMessage.textContent =
            error instanceof Error &&
            error.message.includes("not supported in this browser")
                ? this.localeManager.getLocaleString(
                      messagePath + "webCodecsMissing"
                  )
                : this.localeManager.getLocaleString(messagePath + "failed");
        await new Promise((r) => setTimeout(r, 3000));
    } finally {
        closeNotification(notification.id);
        this.isExporting = false;
    }
}
