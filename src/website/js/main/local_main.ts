import type { MIDIFile } from "../utils/drop_file_handler.ts";
import { Manager } from "../manager/manager.js";
import { showNotification } from "../notification/notification.js";
import { LocaleManager } from "../locale/locale_manager.js";
import { SpessaSynthLogging } from "spessasynth_core";
import type { LocaleCode } from "../locale/locale_files/locale_list.ts";
import type { SavedSettings } from "../../server/saved_settings.ts";
import { readSampleRateParam } from "../utils/sample_rate_param.ts";

declare global {
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

SpessaSynthLogging(true, true, true);
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
const v = await fetch("/getversion");
window.SPESSASYNTH_VERSION = await v.text();

let soundBankBufferCurrent: ArrayBuffer | undefined = undefined;
const context = new AudioContext({ sampleRate: readSampleRateParam() });

let titleString = "TITLE STRING";

async function fetchFont(
    fileName: string,
    callback: (arg0: number) => unknown
): Promise<ArrayBuffer> {
    const response = await fetch(`${fileName}`);
    if (!response.ok || !response.body) {
        titleMessage.textContent = "Error downloading soundfont!";
        throw new Error(response.statusText);
    }
    const size = Number.parseInt(response.headers.get("content-length") ?? "0");
    const reader = response.body.getReader();
    let done = false;
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
            ? midiFiles[0].name.slice(0, 21) + "..."
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
    exportButton.addEventListener(
        "click",
        manager.showExportMenu.bind(window.manager)
    );
}

const initManagerSF = async () => {
    if (!soundBankBufferCurrent) {
        return;
    }
    titleMessage.textContent = "Initializing...";
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
};

/**
 * Fetches and replaces the current manager's font
 */
async function replaceFont(fontName: string) {
    titleMessage.textContent = "Loading soundfont...";
    const data = await fetchFont(fontName, (percent) => {
        progressBar.style.width = `${(percent / 100) * titleMessage.offsetWidth}px`;
        console.info(`Loading sound bank: ${percent}%`);
    });

    titleMessage.textContent = "Parsing soundfont...";
    soundBankBufferCurrent = data;
    progressBar.style.width = "0";
    // Prompt the user to click if needed
    if (context.state === "suspended") {
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

const init = async () => {
    if (!soundBankBufferCurrent) {
        return;
    }
    // User has clicked, we can create the js
    await context.resume();
    document.removeEventListener("click", init);
    await initManagerSF();
};

document.body.addEventListener("click", init);

let soundBanks: { name: string; size: number }[] = [];

const localeManager = new LocaleManager(
    navigator.language.split("-")[0].toLowerCase() as LocaleCode
);

// Load the list of soundfonts
const r = await fetch("soundfonts");

if (!r.ok) {
    titleMessage.textContent = "Error fetching soundfonts!";
    throw new Error(r.statusText);
}
const sfSelector = document.querySelector<HTMLSelectElement>("#sf_selector")!;

soundBanks = JSON.parse(await r.text()) as { name: string; size: number }[];

if (!(0 in soundBanks)) {
    titleMessage.textContent = "No files in the 'soundfonts' folder!";
    throw new Error("No sound banks exist in the folder");
}

for (const sf of soundBanks) {
    const option = document.createElement("option");
    option.value = sf.name;
    let displayName = sf.name;
    if (displayName.length > 29) {
        displayName = displayName.slice(0, 30) + "...";
    }
    option.textContent = displayName;
    sfSelector.append(option);
}

sfSelector.addEventListener("change", async () => {
    sfSelector.blur();
    await fetch(`/setlastsf2?sfname=${encodeURIComponent(sfSelector.value)}`);
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

/**
 * Saves the settings (settings.js) selected data to config.json
 * (only on the local edition that's why it's here and not in the demo_main.js)
 */
window.saveSettings = (settingsData: SavedSettings) => {
    void fetch("/savesettings", {
        method: "POST",
        body: JSON.stringify(settingsData),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    });
};

/**
 * Reads the settings
 */
window.savedSettings = new Promise((resolve) => {
    void fetch("/getsettings").then((response) =>
        response.json().then((parsedSettings) => {
            resolve(parsedSettings as SavedSettings);
        })
    );
});

window.isLocalEdition = true;
