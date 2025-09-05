"use strict";

import { Manager } from "../manager/manager.js";
import { getCheckSvg, getExclamationSvg, getHourglassSvg } from "../utils/icons.js";
import { closeNotification, type NotificationContent, showNotification } from "../notification/notification.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { LocaleManager } from "../locale/locale_manager.js";

import { BasicSoundBank } from "spessasynth_core";
import { WHATS_NEW } from "../../CHANGELOG.js";
import type { LocaleCode } from "../locale/locale_files/locale_list.ts";
import type { MIDIFile } from "../utils/drop_file_handler.ts";
import { DEFAULT_SAVED_SETTINGS, type SavedSettings } from "../../server/saved_settings.ts";

/**
 * Demo_main.js
 * purpose: main script for the demo, loads the soundfont and passes it to the manager.js
 */
const SAMPLE_RATE = 44100;
const SF_NAME = "GeneralUserGS.sf3";

const titleMessage = document.getElementById("title")!;
const fileInput = document.getElementById(
    "midi_file_input"
) as HTMLInputElement;
const sfInput = document.getElementById("sf_file_input") as HTMLInputElement;
const demoSongButton = document.getElementById("demo_song")!;
const downloadButton = document.getElementById("download_button")!;
const exportButton = document.getElementById("export_button")!;
const loading = document.getElementsByClassName("loading")[0] as HTMLDivElement;
const loadingMessage = document.getElementById("loading_message")!;
const fileUpload = document.getElementById("file_upload")!;
const sfUpload = document.getElementById("sf_upload")!;

// Load version
const p = await fetch("package.json");
const t = await p.text();
const packageJson = JSON.parse(t) as { version: string };
window.SPESSASYNTH_VERSION = packageJson.version || "UNKNOWN";

// Remove the old files
fileInput.value = "";
fileInput.focus();

// IndexedDB stuff
const dbName = "spessasynth-db";
const objectStoreName = "soundFontStore";

let sfBuffer: ArrayBuffer | undefined = undefined;

// Load what's new
const whatsNew = document.getElementById("whats_new_content");
if (whatsNew) {
    whatsNew.innerHTML = "";
    WHATS_NEW.forEach((w) => {
        const li = document.createElement("li");
        li.textContent = w;
        whatsNew.appendChild(li);
    });
    const whatsNewVer = document.getElementById("whats_new_version");
    if (whatsNewVer) {
        whatsNewVer.textContent = window.SPESSASYNTH_VERSION || "0.0.0";
    }
}

function initDatabase(callback: (arg0: IDBDatabase) => unknown) {
    const request = indexedDB.open(dbName, 1);

    request.onsuccess = () => {
        const db = request.result;
        callback(db);
    };

    request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore(objectStoreName, { keyPath: "id" });
    };
}

async function loadLastSoundFontFromDatabase(): Promise<
    ArrayBuffer | undefined
> {
    console.info("Loading the soundfont from the database...");
    return await new Promise((resolve) => {
        // Fetch from db
        initDatabase((db) => {
            const transaction = db.transaction([objectStoreName], "readonly");
            const objectStore = transaction.objectStore(objectStoreName);
            const request = objectStore.get("buffer");

            request.onerror = (e) => {
                console.error("Database error");
                console.error(e);
                resolve(undefined);
            };

            request.onsuccess = () => {
                const result = request.result as
                    | { data: ArrayBuffer }
                    | undefined;
                if (!result) {
                    resolve(undefined);
                    return;
                }
                resolve(result.data);
            };
        });
    });
}

function changeIcon(html: string, disableAnimation = true) {
    const icon = loading.getElementsByClassName(
        "loading_icon"
    )[0] as HTMLElement;
    icon.innerHTML = html;
    icon.style.animation = disableAnimation ? "none" : "";
}

async function saveSoundFontToIndexedDB(arr: ArrayBuffer) {
    const check = arr.slice(8, 12);
    const dec = new TextDecoder().decode(check).toLowerCase();
    if (dec !== "sfbk" && dec !== "sfpl" && dec !== "dls ") {
        console.warn("Not viable to save!");
        return;
    }
    return new Promise<void>((solve) => {
        initDatabase((db) => {
            const transaction = db.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);
            try {
                const request = objectStore.put({ id: "buffer", data: arr });
                request.onsuccess = () => {
                    console.info("SoundFont stored successfully");
                };

                request.onerror = (e) => {
                    console.error("Error saving soundfont", e);
                };
            } catch (e) {
                console.warn("Failed saving soundfont:", e);
            }
            solve();
        });
    });
}

let context: AudioContext;

// Attempt to load soundfont from indexed db
async function demoInit(initLocale: LocaleCode) {
    // Initialize the locale management system. do it here because we want it ready before all js classes do their things
    const localeManager = new LocaleManager(initLocale);
    try {
        context = new AudioContext({
            sampleRate: SAMPLE_RATE
        });
    } catch (e) {
        changeIcon(getExclamationSvg(256));
        loadingMessage.textContent = localeManager.getLocaleString(
            "locale.synthInit.noWebAudio"
        );
        throw e;
    }
    loadingMessage.textContent = localeManager.getLocaleString(
        "locale.synthInit.loadingSoundfont"
    );
    let soundFontBuffer: ArrayBuffer | undefined =
        await loadLastSoundFontFromDatabase();
    let loadedFromDb = true;
    if (soundFontBuffer === undefined) {
        console.warn("Failed to load from db, fetching online instead");
        loadedFromDb = false;
        const progressBar = document.getElementById("progress_bar")!;
        const sFontLoadMessage = localeManager.getLocaleString(
            "locale.synthInit.loadingBundledSoundfont"
        );
        loadingMessage.textContent = sFontLoadMessage;
        try {
            soundFontBuffer = await fetchFont(
                `soundfonts/${SF_NAME}`,
                (percent: number) => {
                    loadingMessage.textContent = `${sFontLoadMessage} ${percent}%`;
                }
            );
        } catch (e) {
            console.error("Error loading bundled:", e);
            soundFontBuffer = await BasicSoundBank.getSampleSoundBankFile();
        }

        progressBar.style.width = "0";
    } else {
        console.info("Loaded the soundfont from the database succesfully");
    }
    sfBuffer = soundFontBuffer;
    if (!loadedFromDb) {
        loadingMessage.textContent = localeManager.getLocaleString(
            "locale.synthInit.savingSoundfont"
        );
        await saveSoundFontToIndexedDB(soundFontBuffer);
    }

    const resumeCtx = () => {
        if (context.state !== "running") {
            void context.resume();
            document.removeEventListener("mousedown", resumeCtx);
        }
    };

    if (context.state !== "running") {
        document.addEventListener("mousedown", resumeCtx);
    }

    // Prepare midi interface
    loadingMessage.textContent = localeManager.getLocaleString(
        "locale.synthInit.startingSynthesizer"
    );
    window.manager = new Manager(context, sfBuffer, localeManager);
    window.manager.sfError = (e) => {
        changeIcon(getExclamationSvg(256));
        if (loadedFromDb) {
            console.warn("Invalid soundfont in the database. Resetting.");
            // Restore to default
            initDatabase((db) => {
                const transaction = db.transaction(
                    [objectStoreName],
                    "readwrite"
                );
                const objectStore = transaction.objectStore(objectStoreName);
                const request = objectStore.delete("buffer");
                request.onsuccess = () => {
                    location.reload();
                };
            });
        } else {
            titleMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold;'>${e}</pre>`;
        }
        loadingMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold;'>${e}</pre>`;
    };
    await window.manager.ready;

    window.manager.synth?.setMasterParameter("voiceCap", voiceCap);

    if (fileInput.files?.[0]) {
        await startMidi(fileInput.files);
    } else {
        fileInput.onclick = null;
        fileInput.onchange = () => {
            if (fileInput.files?.[0]) {
                void startMidi(fileInput.files);
            }
        };
    }

    changeIcon(getCheckSvg(256));
    loadingMessage.textContent = localeManager.getLocaleString(
        "locale.synthInit.done"
    );
}

async function fetchFont(url: string | URL, callback: (p: number) => unknown) {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
        titleMessage.innerText = "Error downloading soundfont!";
        throw new Error(response.statusText);
    }
    const size = parseInt(response.headers.get("content-length") ?? "0");
    const reader = response.body.getReader();
    let done = false;
    /**
     * No data array but chunks because gh pages sends the wrong size?
     */
    const chunks: Uint8Array[] = [];
    let offset = 0;
    do {
        const readData = await reader.read();
        if (readData.value) {
            chunks.push(readData.value);
            offset += readData.value.length;
        }
        done = readData.done;
        const percent = Math.round((offset / size) * 100);
        callback(percent);
    } while (!done);

    // Combine
    const outSize = chunks.reduce((size, chunk) => size + chunk.length, 0);
    const dataArray = new Uint8Array(outSize);
    let written = 0;
    chunks.forEach((c) => {
        dataArray.set(c, written);
        written += c.length;
    });
    return dataArray.buffer;
}

async function startMidi(midiFiles: FileList | File[]) {
    demoSongButton.style.display = "none";
    downloadButton.style.display = "none";
    if (!window.manager) {
        throw new Error("Unexpected lack of manager!");
    }
    let fName;
    if (midiFiles[0].name.length > 20) {
        fName = midiFiles[0].name.substring(0, 21) + "...";
    } else {
        fName = midiFiles[0].name;
    }
    if (midiFiles.length > 1) {
        fName += ` and ${midiFiles.length - 1} others`;
    }
    fileUpload.innerText = fName;
    fileUpload.title = midiFiles[0].name;

    const parsed: MIDIFile[] = [];
    for (const file of midiFiles) {
        parsed.push({
            binary: await file.arrayBuffer(),
            fileName: file.name
        });
    }
    window.manager.synth?.setLogLevel(false, false, false);

    window.manager.play(parsed);

    exportButton.style.display = "flex";
    exportButton.onclick = window.manager.exportSong.bind(window.manager);
}

/**
 * Saves the settings (settings.js) selected data to config.json
 * (only on the local edition that's why it's here and not in the demo_main.js)
 */
function saveSettings(settingsData: SavedSettings) {
    localStorage.setItem("spessasynth-settings", JSON.stringify(settingsData));
    console.info("saved as", settingsData);
}

let voiceCap = 350;

const savedVoiceCap = localStorage.getItem("spessasynth-voice-cap");
if (savedVoiceCap) {
    voiceCap = parseInt(savedVoiceCap);
}
window.rememberVoiceCap = (cap: number) => {
    localStorage.setItem("spessasynth-voice-cap", cap.toString());
    window.location.reload();
};

// INIT STARTS HERE

// Expose the save function
window.saveSettings = saveSettings;

// Load saved settings
let savedJson = localStorage.getItem("spessasynth-settings");
savedJson ??= JSON.stringify(DEFAULT_SAVED_SETTINGS);
const saved = JSON.parse(savedJson) as SavedSettings;
if (saved !== null) {
    /**
     * Reads the settings
     */
    window.savedSettings = new Promise((resolve) => {
        resolve(saved);
    });
}
let initLocale: LocaleCode;
// Get locale from saved settings or browser: "en-US" will turn into just "en"
if (saved?.interface?.language) {
    initLocale =
        (await window.savedSettings)?.interface?.language ??
        (navigator.language.split("-")[0].toLowerCase() as LocaleCode);
} else {
    initLocale = navigator.language.split("-")[0].toLowerCase() as LocaleCode;
}

// Remove the old files
fileInput.value = "";
fileInput.focus();
// Set initial styles
exportButton.style.display = "none";
sfUpload.style.display = "none";
fileUpload.style.display = "none";

async function playDemoSong(fileName: string) {
    if (!window.manager) {
        throw new Error("Unexpected lack of manager!");
    }
    titleMessage.textContent = window.manager.localeManager.getLocaleString(
        "locale.synthInit.genericLoading"
    );
    const r = await fetch(
        "https://spessasus.github.io/spessasynth-demo-songs/demo_songs/" +
            fileName
    );
    // noinspection JSCheckFunctionSignatures
    await startMidi([new File([await r.arrayBuffer()], fileName)]);
}

void demoInit(initLocale).then(() => {
    console.info("Demo init finished");
    sfUpload.style.display = "flex";
    fileUpload.style.display = "flex";
    loading.classList.add("done");
    document.documentElement.classList.add("no_scroll");
    document.body.classList.add("no_scroll");
    setTimeout(() => {
        loading.style.display = "none";
        document.body.classList.remove("no_scroll");
        document.documentElement.classList.remove("no_scroll");
    }, 1000);
    sfInput.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
            return;
        }
        if (!window.manager) {
            throw new Error("Unexpected lack of manager!");
        }

        if (window.manager.seq) {
            window.manager.seq.pause();
        }
        (sfUpload.firstElementChild! as HTMLElement).innerText = file.name;
        loading.style.display = "";
        setTimeout(() => {
            void (async () => {
                if (!window.manager) {
                    throw new Error("Unexpected lack of manager!");
                }
                loading.classList.remove("done");
                changeIcon(getHourglassSvg(256), false);
                loadingMessage.textContent =
                    window.manager.localeManager.getLocaleString(
                        "locale.synthInit.loadingSoundfont"
                    );
                const parseStart = performance.now() / 1000;
                // Parse the soundfont
                let soundFontBuffer;
                try {
                    soundFontBuffer = await file.arrayBuffer();
                    sfBuffer = soundFontBuffer;
                } catch (e) {
                    loadingMessage.textContent =
                        window.manager.localeManager.getLocaleString(
                            "locale.warnings.outOfMemory"
                        );
                    changeIcon(getExclamationSvg(256));
                    showNotification(
                        window.manager.localeManager.getLocaleString(
                            "locale.warnings.warning"
                        ),
                        [
                            {
                                type: "text",
                                textContent:
                                    window.manager.localeManager.getLocaleString(
                                        "locale.warnings.outOfMemory"
                                    )
                            }
                        ]
                    );
                    throw e;
                }
                window.manager.sfError = (e) => {
                    loadingMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold;'>${e}</pre>`;
                    changeIcon(getExclamationSvg(256));
                    console.error(e);
                };

                if (soundFontBuffer.byteLength <= 1_153_433_617) {
                    loadingMessage.textContent =
                        window.manager.localeManager.getLocaleString(
                            "locale.synthInit.savingSoundfont"
                        );
                    await saveSoundFontToIndexedDB(soundFontBuffer);
                }
                loadingMessage.textContent =
                    window.manager.localeManager.getLocaleString(
                        "locale.synthInit.startingSynthesizer"
                    );
                await window.manager.reloadSf(soundFontBuffer);

                // Wait to make sure that the animation has finished
                const elapsed = performance.now() / 1000 - parseStart;
                await new Promise((r) => setTimeout(r, 1000 - elapsed));
                // DONE
                changeIcon(getCheckSvg(256));
                loadingMessage.textContent =
                    window.manager.localeManager.getLocaleString(
                        "locale.synthInit.done"
                    );
                loading.classList.add("done");
                document.documentElement.classList.add("no_scroll");
                document.body.classList.add("no_scroll");
                setTimeout(() => {
                    loading.style.display = "none";
                    document.body.classList.remove("no_scroll");
                    document.documentElement.classList.remove("no_scroll");
                }, 1000);
            })();
        }, ANIMATION_REFLOW_TIME);
    };
    demoSongButton.onclick = async () => {
        if (!window.manager) {
            throw new Error("Unexpected lack of manager!");
        }
        const contents: NotificationContent[] = [
            {
                type: "button",
                textContent: "Bundled SoundFont Credits",
                onClick: () => {
                    window.open(
                        "https://schristiancollins.com/generaluser.php"
                    );
                }
            }
        ];
        titleMessage.textContent = window.manager.localeManager.getLocaleString(
            "locale.synthInit.genericLoading"
        );
        const songs = await (
            await fetch(
                "https://spessasus.github.io/spessasynth-demo-songs/demo_song_list.json"
            )
        ).text();
        const songsJSON = JSON.parse(songs) as {
            name: string;
            fileName: string;
            credits: string;
        }[];
        for (const song of songsJSON) {
            contents.push({
                type: "button",
                textContent: song.name,
                onClick: (n) => {
                    if (!window.manager) {
                        throw new Error("Unexpected lack of manager!");
                    }
                    closeNotification(n.id);
                    showNotification(
                        window.manager.localeManager.getLocaleString(
                            "locale.credits"
                        ),
                        [
                            {
                                type: "text",
                                textContent: song.credits.replace(
                                    "\n",
                                    "\r\n\r\n"
                                ),
                                attributes: { style: "white-space: pre-line;" }
                            },
                            {
                                type: "button",
                                textContent: "Ok",
                                onClick: (n) => {
                                    closeNotification(n.id);
                                }
                            }
                        ],
                        999999,
                        true,
                        undefined,
                        undefined,
                        async () => {
                            await playDemoSong(song.fileName);
                        }
                    );
                }
            });
        }

        showNotification(
            window.manager.localeManager.getLocaleString(
                "locale.demoSongButton"
            ),
            contents,
            999999,
            true,
            undefined
        );
    };
});
