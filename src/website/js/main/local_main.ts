"use strict";

import type { MIDIFile } from "../utils/drop_file_handler.ts";
import { Manager } from "../manager/manager.js";
import { showNotification } from "../notification/notification.js";
import { LocaleManager } from "../locale/locale_manager.js";
import { SpessaSynthLogging } from "spessasynth_core";
import type { LocaleCode } from "../locale/locale_files/locale_list.ts";
import type { SavedSettings } from "../../server/saved_settings.ts";

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
const SAMPLE_RATE = 44100;

SpessaSynthLogging(true, true, true);
const titleMessage = document.getElementById("title")!;
const progressBar = document.getElementById("progress_bar")!;
const fileInput = document.getElementById(
    "midi_file_input"
) as HTMLInputElement;
const fileUpload = document.getElementById("file_upload")!;
const exportButton = document.getElementById("export_button")!;

// Remove the old files
fileInput.value = "";
fileInput.focus();

let synthReady = false;

// Load version
const r = await (await fetch("/getversion")).text();
window.SPESSASYNTH_VERSION = r;

let sfParser: ArrayBuffer | undefined = undefined;
const context = new AudioContext({ sampleRate: SAMPLE_RATE });

let titleString = "";

async function fetchFont(
    fileName: string,
    callback: (arg0: number) => unknown
): Promise<ArrayBuffer> {
    const response = await fetch(`${fileName}`);
    if (!response.ok || !response.body) {
        titleMessage.innerText = "Error downloading soundfont!";
        throw new Error(response.statusText);
    }
    const size = parseInt(response.headers.get("content-length") ?? "0");
    const reader = response.body.getReader();
    let done = false;
    let dataArray;
    try {
        dataArray = new Uint8Array(size);
    } catch (e) {
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
        throw e;
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

    titleMessage.style.fontStyle = "italic";
    manager.play(parsed);
    exportButton.style.display = "flex";
    exportButton.onclick = manager.exportSong.bind(window.manager);
}

const createManager = async () => {
    if (!sfParser) {
        return;
    }
    // Prepare midi interface
    window.manager = new Manager(context, sfParser, localeManager, true);
    titleString = window.manager.localeManager.getLocaleString(
        "locale.titleMessage"
    );
    titleMessage.innerText = "Initializing...";
    await window.manager.ready;
    //Window.manager.synth?.setLogLevel(true, true, true);
    synthReady = true;
    titleMessage.innerText = window.manager.localeManager.getLocaleString(
        "locale.titleMessage"
    );
};

/**
 * Fetches and replaces the current manager's font
 */
async function replaceFont(fontName: string) {
    titleMessage.innerText = "Loading soundfont...";
    const data = await fetchFont(
        fontName,
        (percent) =>
            (progressBar.style.width = `${(percent / 100) * titleMessage.offsetWidth}px`)
    );

    titleMessage.innerText = "Parsing soundfont...";
    sfParser = data;
    progressBar.style.width = "0";
    // Prompt the user to click if needed
    if (context.state === "suspended") {
        titleMessage.innerText = "Press anywhere to start the app";
        return;
    }

    if (!sfParser) {
        return;
    }
    if (!window.manager) {
        await createManager();
    }
    titleMessage.innerText = window.manager!.localeManager.getLocaleString(
        "locale.titleMessage"
    );
    synthReady = true;
    titleMessage.innerText = titleString;
}

document.body.onclick = async () => {
    // User has clicked, we can create the js
    await context.resume();
    document.body.onclick = null;
    await createManager();
};

let soundFonts: { name: string; size: number }[] = [];

const localeManager = new LocaleManager(
    navigator.language.split("-")[0].toLowerCase() as LocaleCode
);

// Load the list of soundfonts
void fetch("soundfonts").then(async (r) => {
    if (!r.ok) {
        titleMessage.innerText = "Error fetching soundfonts!";
        throw new Error(r.statusText);
    }
    const sfSelector = document.getElementById(
        "sf_selector"
    )! as HTMLSelectElement;

    soundFonts = JSON.parse(await r.text()) as { name: string; size: number }[];
    for (const sf of soundFonts) {
        const option = document.createElement("option");
        option.value = sf.name;
        let displayName = sf.name;
        if (displayName.length > 29) {
            displayName = displayName.substring(0, 30) + "...";
        }
        option.innerText = displayName;
        sfSelector.appendChild(option);
    }

    sfSelector.onchange = async () => {
        sfSelector.blur();
        await fetch(
            `/setlastsf2?sfname=${encodeURIComponent(sfSelector.value)}`
        );
        if (window.manager?.seq) {
            window.manager.seq.pause();
        }
        await replaceFont(sfSelector.value);

        if (window.manager?.seq) {
            titleMessage.innerText =
                window.manager.seqUI?.currentSongTitle ?? titleString;
        }
    };

    // Fetch the first sf2
    await replaceFont(soundFonts[0].name);

    // Start midi if already uploaded
    if (fileInput.files?.[0]) {
        await startMidi(fileInput.files);
    }

    // And add the event listener
    fileInput.onchange = async () => {
        if (!fileInput.files?.[0]) {
            return;
        }
        await startMidi(fileInput.files);
    };
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
