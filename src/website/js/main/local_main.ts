"use strict";

import { Manager } from "../manager/manager.js";
import { showNotification } from "../notification/notification.js";
import { LocaleManager } from "../locale/locale_manager.js";
import { SpessaSynthLogging } from "spessasynth_core";

/**
 * Local_main.js
 * purpose: main script for the local edition, loads the soundfont and passes it to the manager.js, reloads soundfonts when needed and saves the settings
 */
const SAMPLE_RATE = 44100;

SpessaSynthLogging(true, true, true);

/**
 * @type {HTMLHeadingElement}
 */
const titleMessage = document.getElementById("title");
/**
 * @type {HTMLDivElement}
 */
const progressBar = document.getElementById("progress_bar");
/**
 * @type {HTMLInputElement}
 */
const fileInput = document.getElementById("midi_file_input");
// Remove the old files
fileInput.value = "";
fileInput.focus();

const exportButton = document.getElementById("export_button");
exportButton.style.display = "none";

let synthReady = false;

const r = await (await fetch("/getversion")).text();
window.SPESSASYNTH_VERSION = r;

/**
 * @param fileName {string}
 * @param callback {function(number)}
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchFont(fileName, callback) {
    const response = await fetch(`${fileName}`);
    if (!response.ok) {
        titleMessage.innerText = "Error downloading soundfont!";
        throw response;
    }
    const size = response.headers.get("content-length");
    const reader = await (await response.body).getReader();
    let done = false;
    let dataArray;
    try {
        dataArray = new Uint8Array(parseInt(size));
    } catch (e) {
        let message = `Your browser ran out of memory. Consider using Firefox or SF3 soundfont instead<br><br> (see console for error)`;
        if (window.manager) {
            message = manager.localeManager.getLocaleString(
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

/**
 * @param midiFiles {FileList}
 */
async function startMidi(midiFiles) {
    if (!synthReady) {
        setTimeout(() => startMidi(midiFiles), 100);
        return;
    }
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
    document.getElementById("file_upload").innerText = fName;
    document.getElementById("file_upload").title = midiFiles[0].name;
    /**
     * @type {{binary: ArrayBuffer, altName: string}[]}
     */
    const parsed = [];
    for (const file of midiFiles) {
        parsed.push({
            binary: await file.arrayBuffer(),
            altName: file.name
        });
    }

    titleMessage.style.fontStyle = "italic";

    if (manager.seq) {
        manager.seq.loadNewSongList(parsed);
    } else {
        manager.play(parsed);
    }
    exportButton.style.display = "flex";
    exportButton.onclick = window.manager.exportSong.bind(window.manager);
}

/**
 * Fetches and replaces the current manager's font
 * @param fontName {string}
 */
async function replaceFont(fontName) {
    async function replaceSf() {
        // Prompt the user to click if needed
        if (!window.audioContextMain) {
            titleMessage.innerText = "Press anywhere to start the app";
            return;
        }

        if (!window.manager) {
            // Prepare the manager
            window.manager = new Manager(
                audioContextMain,
                soundFontParser,
                localeManager,
                true
            );
            window.TITLE = window.manager.localeManager.getLocaleString(
                "locale.titleMessage"
            );
            titleMessage.innerText = "Initializing...";
            await manager.ready;
            manager.synth.setLogLevel(true, true, true, true);
        } else {
            if (window.manager.seq) {
                window.manager.seq.pause();
            }
            await window.manager.reloadSf(window.soundFontParser);
        }
        titleMessage.innerText = window.manager.localeManager.getLocaleString(
            "locale.titleMessage"
        );
        synthReady = true;
    }

    titleMessage.innerText = "Loading soundfont...";
    const data = await fetchFont(
        fontName,
        (percent) =>
            (progressBar.style.width = `${(percent / 100) * titleMessage.offsetWidth}px`)
    );

    titleMessage.innerText = "Parsing soundfont...";
    setTimeout(() => {
        window.soundFontParser = data;
        progressBar.style.width = "0";
        replaceSf();
    });
    titleMessage.innerText = window.TITLE;
}

document.body.onclick = async () => {
    // User has clicked, we can create the js
    if (!window.audioContextMain) {
        if (navigator.mediaSession) {
            navigator.mediaSession.playbackState = "playing";
        }
        const context = window.AudioContext || window.webkitAudioContext;
        window.audioContextMain = new context({ sampleRate: SAMPLE_RATE });
        if (window.soundFontParser) {
            // Prepare midi interface
            window.manager = new Manager(
                audioContextMain,
                soundFontParser,
                localeManager,
                true
            );
            window.TITLE = window.manager.localeManager.getLocaleString(
                "locale.titleMessage"
            );
            titleMessage.innerText = "Initializing...";
            await manager.ready;
            manager.synth.setLogLevel(true, true, true, true);
            synthReady = true;
            titleMessage.innerText =
                window.manager.localeManager.getLocaleString(
                    "locale.titleMessage"
                );
        }
    }
    document.body.onclick = null;
};

/**
 * @type {{name: string, size: number}[]}
 */
let soundFonts = [];

const localeManager = new LocaleManager(
    navigator.language.split("-")[0].toLowerCase()
);

// Load the list of soundfonts
fetch("soundfonts").then(async (r) => {
    if (!r.ok) {
        titleMessage.innerText = "Error fetching soundfonts!";
        throw r.statusText;
    }
    /**
     * @type {HTMLSelectElement}
     */
    const sfSelector = document.getElementById("sf_selector");

    soundFonts = JSON.parse(await r.text());
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

    sfSelector.onchange = () => {
        sfSelector.blur();
        fetch(`/setlastsf2?sfname=${encodeURIComponent(sfSelector.value)}`);
        if (window.manager.seq) {
            window.manager.seq.pause();
        }
        replaceFont(sfSelector.value);

        if (window.manager.seq) {
            titleMessage.innerText =
                window.manager.seq.midiData.midiName || window.TITLE;
        }
    };

    // Fetch the first sf2
    await replaceFont(soundFonts[0].name);

    // Start midi if already uploaded
    if (fileInput.files[0]) {
        await startMidi(fileInput.files);
    }

    // And add the event listener
    fileInput.onchange = async () => {
        if (!fileInput.files[0]) {
            return;
        }
        await startMidi(fileInput.files);
    };
});

/**
 * Saves the settings (settings.js) selected data to config.json
 * (only on the local edition that's why it's here and not in the demo_main.js)
 * @param settingsData {Object}
 */
function saveSettings(settingsData) {
    fetch("/savesettings", {
        method: "POST",
        body: JSON.stringify(settingsData),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then();
}

// Expose the function
window.saveSettings = saveSettings;

/**
 * Reads the settings
 * @type {Promise<SavedSettings>}
 */
window.savedSettings = new Promise((resolve) => {
    fetch("/getsettings").then((response) =>
        response.json().then((parsedSettings) => {
            resolve(parsedSettings);
        })
    );
});

window.isLocalEdition = true;
