import type { MIDIFile } from "../utils/drop_file_handler.ts";
import { Manager } from "../manager/manager.js";
import { showNotification } from "../notification/notification.js";
import { LocaleManager } from "../manager/locale_manager.js";
import type { LocaleCode } from "../../locale/locale_list.ts";
import type { SavedSettings } from "../../../server/saved_settings.ts";
import {
    API,
    type LastUsedSoundBankBody,
    PAGE_HEADER,
    type SoundBankEntry,
    soundBankURL,
    type VersionInfo
} from "../../../server/api.ts";
import {
    checkForUpdate,
    keepServerAlive,
    prepareSoundBankFolderButton,
    showEmptyFolderPrompt
} from "./local_binary_features.ts";
import { URLParamUtils } from "../utils/url_params.ts";
import { SpessaLog } from "spessasynth_core";

declare global {
    // noinspection JSUnusedGlobalSymbols
    interface Window {
        SPESSASYNTH_VERSION: string;
        manager?: Manager;
        saveSettings: (s: SavedSettings) => unknown;
        savedSettings: Promise<Partial<SavedSettings>>;
        isLocalEdition: boolean;
        rememberVoiceCap?: (cap: number) => unknown;
    }
}

/**
 * Local_main.js
 * purpose: main script for the local edition, loads the soundfont and passes it to the manager.js, reloads soundfonts when needed and saves the settings
 */

// Init params
/**
 * Saves the settings (settings.js) selected data to config.json
 * (only on the local edition that's why it's here and not in the demo_main.js)
 */
window.saveSettings = (settingsData: SavedSettings) => {
    void fetch(API.settings, {
        method: "PUT",
        body: JSON.stringify(settingsData),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
            [PAGE_HEADER]: "1"
        }
    });
};

/**
 * Reads the settings
 */
window.savedSettings = new Promise((resolve) => {
    void fetch(API.settings).then((response) =>
        response.json().then((parsedSettings) => {
            resolve(parsedSettings as SavedSettings);
        })
    );
});

window.isLocalEdition = true;
SpessaLog.setLogLevel(true, true, true);
const titleMessage = document.querySelector<HTMLHeadingElement>("#title")!;
const progressBar = document.querySelector<HTMLDivElement>("#progress_bar")!;
const fileInput = document.querySelector<HTMLInputElement>("#midi_file_input")!;
const fileUpload = document.querySelector<HTMLLabelElement>("#file_upload")!;
const exportButton =
    document.querySelector<HTMLLabelElement>("#export_button")!;

// Remove the old files
fileInput.value = "";
fileInput.focus();

let synthReady = false;

// Load version
const v = await fetch(API.version);
const versionInfo = (await v.json()) as VersionInfo;
window.SPESSASYNTH_VERSION = versionInfo.version;

let soundBankBufferCurrent: ArrayBuffer | undefined = undefined;

let context: AudioContext;
const sampleRate = URLParamUtils.getSampleRate();
try {
    context = new AudioContext({ sampleRate });
} catch (error) {
    // Reload with a safe value if it isn't set
    if (sampleRate !== URLParamUtils.DEFAULT_SAMPLE_RATE) {
        URLParamUtils.setParam(
            URLParamUtils.SAMPLE_RATE,
            URLParamUtils.DEFAULT_SAMPLE_RATE.toString()
        );
    }
    throw error;
}

let titleString = "TITLE STRING";

async function fetchFont(
    fileName: string,
    callback: (arg0: number) => unknown
): Promise<ArrayBuffer> {
    const response = await fetch(soundBankURL(fileName));
    if (!response.ok || !response.body) {
        titleMessage.textContent = "Error downloading soundfont!";
        throw new Error(response.statusText);
    }
    const size = Number.parseInt(response.headers.get("content-length") ?? "0");
    const reader = response.body.getReader();
    let done;
    let dataArray;
    try {
        dataArray = new Uint8Array(size);
    } catch (error) {
        let message = `Your browser ran out of memory. Consider using Firefox or SF3 soundfont instead<br><br> (see console for error)`;
        if (window.manager) {
            message = window.manager.localeManager.getLocaleString(
                "locale.warnings.outOfMemory"
            );
        }
        showNotification("Warning", [
            {
                type: "text",
                textContent: message
            }
        ]);
        throw error;
    }
    let offset = 0;
    do {
        const readData = await reader.read();
        if (readData.value) {
            dataArray.set(readData.value, offset);
            offset += readData.value.length;
        }
        done = readData.done;
        const percent = Math.round((offset / size) * 100);
        callback(percent);
    } while (!done);
    return dataArray.buffer;
}

async function startMidi(midiFiles: FileList) {
    if (!synthReady || !window.manager) {
        setTimeout(() => void startMidi(midiFiles), 100);
        return;
    }
    const manager = window.manager;
    await manager.ready;
    let fName;
    fName =
        midiFiles[0].name.length > 20
            ? midiFiles[0].name.slice(0, 20) + "..."
            : midiFiles[0].name;
    if (midiFiles.length > 1) {
        fName += ` and ${midiFiles.length - 1} others`;
    }
    fileUpload.textContent = fName;
    fileUpload.title = midiFiles[0].name;
    const parsed: MIDIFile[] = [];
    for (const file of midiFiles) {
        parsed.push({
            binary: await file.arrayBuffer(),
            fileName: file.name
        });
    }

    titleMessage.style.fontStyle = "italic";
    manager.play(parsed);
    exportButton.style.display = "flex";
}

const initManagerSF = async () => {
    if (!soundBankBufferCurrent) {
        return;
    }
    titleMessage.textContent = "Initializing...";
    progressBar.classList.add("active", "indeterminate");
    if (window.manager) {
        await window.manager.reloadSf(soundBankBufferCurrent);
    } else {
        window.manager = new Manager(
            context,
            soundBankBufferCurrent,
            localeManager,
            true
        );
        // Override temporarily
        titleMessage.textContent = "Initializing...";

        await window.manager.ready;
        // Disabled as of 20-11-2025 (firefox regression, lags a lot with console)
        window.manager.synth?.setLogLevel(false, false, false);
    }

    titleString = window.manager.localeManager.getLocaleString(
        "locale.titleMessage"
    );

    synthReady = true;
    titleMessage.textContent = titleString;
    progressBar.classList.remove("active", "indeterminate");
};

/**
 * Fetches and replaces the current manager's font
 */
async function replaceFont(fontName: string) {
    titleMessage.textContent = "Loading soundfont...";
    progressBar.style.setProperty("--progress", "0");
    progressBar.classList.add("active");
    const data = await fetchFont(fontName, (percent) => {
        progressBar.style.setProperty("--progress", `${percent / 100}`);
        console.info(`Loading sound bank: ${percent}%`);
    });

    titleMessage.textContent = "Parsing soundfont...";
    soundBankBufferCurrent = data;
    // Prompt the user to click if needed
    if (context.state === "suspended") {
        progressBar.classList.remove("active");
        titleMessage.textContent = "Press anywhere to start the app";
        return;
    }

    if (!soundBankBufferCurrent) {
        return;
    }
    await initManagerSF();
    synthReady = true;
    titleMessage.textContent = titleString;
}

// eslint-disable-next-line unicorn/prefer-add-event-listener
document.onclick = async () => {
    if (!soundBankBufferCurrent) {
        return;
    }
    // User has clicked, we can create the js
    await context.resume();
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    document.onclick = null;
    await initManagerSF();
};

const localeManager = new LocaleManager(
    navigator.language.split("-")[0].toLowerCase() as LocaleCode
);

if (versionInfo.binary) {
    keepServerAlive(localeManager);
    void checkForUpdate(localeManager);
}

// Load the list of soundfonts
const r = await fetch(API.soundBanks);

if (!r.ok) {
    titleMessage.textContent = "Error fetching soundfonts!";
    throw new Error(r.statusText);
}
const sfSelector = document.querySelector<HTMLSelectElement>("#sf_selector")!;

const soundBanks = (await r.json()) as SoundBankEntry[];

if (!(0 in soundBanks)) {
    if (versionInfo.binary) {
        titleMessage.textContent = localeManager.getLocaleString(
            "locale.localEdition.emptyFolder.title"
        );
        showEmptyFolderPrompt(localeManager);
    } else {
        titleMessage.textContent = "No files in the 'soundfonts' folder!";
    }
    throw new Error("No sound banks exist in the folder");
}

function fillSoundBankSelector(banks: SoundBankEntry[]) {
    const selected = sfSelector.value;
    sfSelector.replaceChildren();
    for (const sf of banks) {
        const option = document.createElement("option");
        option.value = sf.name;
        let displayName = sf.name;
        if (displayName.length > 29) {
            displayName = displayName.slice(0, 30) + "...";
        }
        option.textContent = displayName;
        sfSelector.append(option);
    }
    if (banks.some((b) => b.name === selected)) {
        sfSelector.value = selected;
    }
}

fillSoundBankSelector(soundBanks);

if (versionInfo.binary) {
    prepareSoundBankFolderButton(
        localeManager,
        versionInfo.platform,
        async () => {
            const response = await fetch(API.soundBanks, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            const banks = (await response.json()) as SoundBankEntry[];
            // Keep the old list rather than an empty selector
            if (0 in banks) {
                fillSoundBankSelector(banks);
            }
        }
    );
}

sfSelector.addEventListener("change", async () => {
    sfSelector.blur();
    const body: LastUsedSoundBankBody = { name: sfSelector.value };
    await fetch(API.lastUsedSoundBank, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
            [PAGE_HEADER]: "1"
        }
    });
    if (window.manager?.seq?.midiData) {
        window.manager.seq.pause();
    }
    await replaceFont(sfSelector.value);
    titleMessage.textContent = window.manager?.seqUI?.currentSongTitle
        ? window.manager.seqUI?.currentSongTitle || titleString
        : titleString;

    if (window?.manager?.seq?.midiData) {
        window?.manager?.seqUI?.seqPlay?.();
    }
});

// Fetch the first sf2
await replaceFont(soundBanks[0].name);

// Start midi if already uploaded
if (fileInput.files?.[0]) {
    await startMidi(fileInput.files);
}

// And add the event listener
fileInput.addEventListener("change", async () => {
    if (!fileInput.files?.[0]) {
        return;
    }
    await startMidi(fileInput.files);
});

// Add export event listener
exportButton.addEventListener("click", () => {
    if ("manager" in window && window.manager instanceof Manager) {
        window.manager.showExportMenu();
    }
});
