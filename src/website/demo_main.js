"use strict"

import { Manager } from './manager.js'
import { MIDI } from '../spessasynth_lib/midi_parser/midi_loader.js'

import { formatTime, formatTitle } from '../spessasynth_lib/utils/other.js'
import { SpessaSynthInfo, SpessaSynthWarn } from '../spessasynth_lib/utils/loggin.js'
import { audioBufferToWav } from '../spessasynth_lib/utils/buffer_to_wav.js'

/**
 * demo_main.js
 * purpose: main script for the demo, loads the soundfont and passes it to the manager.js
 */

const SF_NAME = "SGM.sf3";
const TITLE = "SpessaSynth: SoundFont2 Javascript Synthetizer Online Demo";

/**
 * @type {HTMLHeadingElement}
 */
let titleMessage = document.getElementById("title");

/**
 * @type {HTMLInputElement}
 */
let fileInput = document.getElementById("midi_file_input");
fileInput.onclick = e => {
    e.preventDefault();
    titleMessage.innerText = "You need to upload a SoundFont first";
}


let sfInput = document.getElementById("sf_file_input");
// remove the old files
fileInput.value = "";
fileInput.focus();

/**
 * @type {HTMLButtonElement}
 */
const exportButton = document.getElementById("export_button");
exportButton.style.display = "none";

// IndexedDB stuff
const dbName = "spessasynth-db";
const objectStoreName = "soundFontStore";
/**
 * @param callback {function(IDBDatabase)}
 */
function initDatabase(callback) {
    const request = indexedDB.open(dbName, 1);


    request.onsuccess = () => {
        const db = request.result;
        callback(db);
    };

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore(objectStoreName, { keyPath: "id" });
    };
}

/**
 * @returns {Promise<ArrayBuffer|undefined>}
 */
async function loadLastSoundFontFromDatabase()
{
    return await new Promise(resolve => {
        // fetch from db
        initDatabase(db => {
            const transaction = db.transaction([objectStoreName], "readonly");
            const objectStore = transaction.objectStore(objectStoreName);
            const request = objectStore.get("buffer");

            request.onerror = e => {
                console.error("Database error");
                throw e;
            }

            request.onsuccess = async () => {
                const result = request.result;
                if(!result)
                {
                    resolve(undefined);
                    return;
                }
                resolve(result.data);
            }
        })
    })
}

// attempt to load soundfont from indexed db
async function demoInit()
{
    let soundFontBuffer = await loadLastSoundFontFromDatabase();
    let loadedFromDb = true;
    if (soundFontBuffer === undefined)
    {
        SpessaSynthWarn("Failed to load from db, fetching online instead");
        loadedFromDb = false;
        const progressBar = document.getElementById("progress_bar");
        titleMessage.innerText = "Loading bundled SoundFont, please wait.";
        soundFontBuffer = await fetchFont(`soundfonts/${SF_NAME}`, percent =>
        {
            titleMessage.innerText = `Loading bundled SoundFont (${percent}%), please wait.`;
            progressBar.style.width = `${(percent / 100) * titleMessage.offsetWidth}px`
        });
        progressBar.style.width = "0";
    }
    else
    {
        SpessaSynthInfo("Loaded the soundfont from the database succesfully");
    }

    // parse the soundfont
    try {
        window.soundFontParser = soundFontBuffer;
        if(!loadedFromDb) {
            saveSoundFontToIndexedDB(soundFontBuffer).then();
        }
    }
    catch (e)
    {
        titleMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold'>${e}</pre>`;
        console.log(e);
        return;
    }
    prepareUI();
}

async function fetchFont(url, callback)
{
    let response = await fetch(url);
    if(!response.ok)
    {
        titleMessage.innerText = "Error downloading soundfont!";
        throw response;
    }
    let size = response.headers.get("content-length");
    let reader = await (await response.body).getReader();
    let done = false;
    let dataArray = new Uint8Array(parseInt(size));
    let offset = 0;
    do{
        let readData = await reader.read();
        if(readData.value) {
            dataArray.set(readData.value, offset);
            offset += readData.value.length;
        }
        done = readData.done;
        let percent = Math.round((offset / size) * 100);
        callback(percent);
    }while(!done);
    return dataArray.buffer;
}


/**
 * @param midiFile {File}
 * @returns {Promise<MIDI>}
 */
async function parseMidi(midiFile)
{
    const buffer = await midiFile.arrayBuffer();
    try {
        return new MIDI(buffer, midiFile.name);
    }
    catch (e) {
        titleMessage.innerHTML = `Error parsing MIDI: <pre style='font-family: monospace; font-weight: bold'>${e}</pre>`;
        throw e;
    }
}

/**
 * @param midiFiles {FileList}
 */
async function startMidi(midiFiles)
{
    let fName;
    if(midiFiles[0].name.length > 20)
    {
        fName = midiFiles[0].name.substring(0, 21) + "...";
    }
    else
    {
        fName = midiFiles[0].name;
    }
    if(midiFiles.length > 1)
    {
        fName += ` and ${midiFiles.length - 1} others`;
    }
    document.getElementById("file_upload").innerText = fName;
    /**
     * @type {MIDI[]}
     */
    const parsed = [];

    /**
     * @type {string[]}
     */
    const titles = [];
    for (let i = 0; i < midiFiles.length; i++) {
        titleMessage.innerText = `Parsing ${midiFiles[i].name}`;
        parsed.push(await parseMidi(midiFiles[i]));

        let title;
        if(parsed[i].midiName.trim().length > 0)
        {
            title = parsed[i].midiName.trim();
        }
        else
        {
            title = formatTitle(midiFiles[i].name);
        }
        titles.push(title);
    }
    titleMessage.style.fontStyle = "italic";
    document.title = titles[0];
    titleMessage.innerText = titles[0]

    if(manager.seq)
    {
        manager.seq.loadNewSongList(parsed);

    }
    else {
        manager.play(parsed);
    }
    manager.seqUI.setSongTitles(titles);

    exportButton.style.display = "initial";
    exportButton.onclick = async () => {
        const title = titleMessage.textContent;
        const message = manager.localeManager.getLocaleString("locale.exportAudio.message");
        const estimatedMessage = manager.localeManager.getLocaleString("locale.exportAudio.estimated");

        const duration = window.manager.seq.midiData.duration;
        const buffer = await window.manager.renderAudio((progress, speed) => {
            const estimated = (1 - progress) / speed * duration;
            titleMessage.innerText = `${message} ${Math.round(progress * 100)}%\n ${estimatedMessage} ${formatTime(estimated).time}s`
        });

        titleMessage.textContent = title;

        const blob = audioBufferToWav(buffer);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${window.manager.seq.midiData.midiName || 'song'}.wav`;
        a.click();
    }
}

/**
 * @param e {{target: HTMLInputElement}}
 * @return {Promise<void>}
 */
sfInput.onchange = async e => {
    if (!e.target.files[0]) {
        return;
    }
    /**
     * @type {File}
     */
    const file = e.target.files[0];

    document.getElementById("sf_upload").firstElementChild.innerText = file.name;
    const title = titleMessage.innerText;
    titleMessage.innerText = "Parsing SoundFont...";
    // parse the soundfont
    let soundFontBuffer;
    try {
        soundFontBuffer = await file.arrayBuffer();
    }
    catch (e) {
        window.alert(manager.localeManager.getLocaleString("locale.outOfMemory"));
        throw e;
    }
    try {
        window.soundFontParser = soundFontBuffer;
        saveSoundFontToIndexedDB(soundFontBuffer).then();
    } catch (e) {
        titleMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold'>${e}</pre>`;
        console.log(e);
        return;
    }
    titleMessage.innerText = title;
    manager.reloadSf(window.soundFontParser);
}

function prepareUI()
{
    titleMessage.innerText = TITLE;

    try {
        const context = window.AudioContext || window.webkitAudioContext;
        window.audioContextMain = new context({ sampleRate: 44100 });
    }
    catch (e) {
        titleMessage.innerHTML = "Your browser doesn't support WebAudio.";
        throw e;

    }

    if(window.audioContextMain.state !== "running")
    {
        document.addEventListener("mousedown", () => {
            if(window.audioContextMain.state !== "running") {
                window.audioContextMain.resume().then();
            }

        })
    }

    // prepare midi interface
    window.manager = new Manager(audioContextMain, soundFontParser);

    if(fileInput.files[0])
    {
        startMidi(fileInput.files).then();
    }
    else
    {
        fileInput.onclick = undefined;
        fileInput.onchange = () => {
            if(fileInput.files[0])
            {
                startMidi(fileInput.files).then();
            }
        }
    }
}

/**
 * @param arr {ArrayBuffer}
 */
async function saveSoundFontToIndexedDB(arr)
{
    initDatabase(db => {
        const transaction = db.transaction([objectStoreName], "readwrite");
        const objectStore = transaction.objectStore(objectStoreName);
        try {
            const request = objectStore.put({ id: "buffer", data: arr });
            request.onsuccess = () => {
                SpessaSynthInfo("SoundFont stored successfully");
            };

            request.onerror = e => {
                console.error("Error saving soundfont", e)
            }
        }
        catch (e)
        {
            SpessaSynthWarn("Failed saving soundfont:", e);
        }
    });
}


/**
 * saves the settings (settings.js) selected data to config.json
 * (only on local edition that's why it's here and not in the demo_main.js)
 * @param settingsData {Object}
 */
function saveSettings(settingsData)
{
    localStorage.setItem("spessasynth-settings", JSON.stringify(settingsData));
    SpessaSynthInfo("saved as", settingsData)
}

// expose the function
window.saveSettings = saveSettings;

const saved = localStorage.getItem("spessasynth-settings");
if(saved !== null) {
    /**
     * reads the settings
     * @type {Promise<SavedSettings>}
     */
    window.savedSettings = new Promise(resolve => {
        resolve(JSON.parse(saved))
    });
}

demoInit().then();
