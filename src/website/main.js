"use strict"

import {Manager} from "./manager.js";
import {MIDI} from "../spessasynth_lib/midi_parser/midi_loader.js";

import { formatTitle } from '../spessasynth_lib/utils/other.js'
import { showNotification } from './js/notification.js'

/**
 * main.js
 * purpose: main script for the local edition, loads the soundfont and passes it to the manager.js, reloads soundfonts when needed and saves the settings
 */
const SAMPLE_RATE = 44100;

/**
 * @type {HTMLHeadingElement}
 */
let titleMessage = document.getElementById("title");
/**
 * @type {HTMLDivElement}
 */
let progressBar = document.getElementById("progress_bar");
/**
 * @type {HTMLInputElement}
 */
let fileInput = document.getElementById("midi_file_input");
// remove the old files
fileInput.value = "";
fileInput.focus();

let exportButton = document.getElementById("export_button");
exportButton.style.display = "none";

let synthReady = false;

/**
 * @type {{name: string, sf: ArrayBuffer}[]}
 */
window.loadedSoundfonts = [];


/**
 * @param midiFile {File}
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
 * @param fileName {string}
 * @param callback {function(number)}
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchFont(fileName, callback)
{
    let response = await fetch(`http://${location.host}/${fileName}`);
    if(!response.ok)
    {
        titleMessage.innerText = "Error downloading soundfont!";
        throw response;
    }
    let size = response.headers.get("content-length");
    let reader = await (await response.body).getReader();
    let done = false;
    let dataArray;
    try {
        dataArray = new Uint8Array(parseInt(size));
    }
    catch (e)
    {
        let message = `Your browser ran out of memory. Consider using Firefox or SF3 soundfont instead<br><br> (see console for error)`;
        if(window.manager)
        {
            message = manager.localeManager.getLocaleString("locale.warnings.outOfMemory");
        }
        showNotification("Warning", message);
        throw e;
    }
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
 * @param midiFiles {FileList}
 */
async function startMidi(midiFiles)
{
    if(!synthReady)
    {
        setTimeout(() => startMidi(midiFiles), 100);
        return;
    }
    await manager.ready;
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
    document.getElementById("file_upload").title = midiFiles[0].name;
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
    }//


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
    exportButton.style.display = "flex";
    exportButton.onclick = window.manager.renderAudio.bind(window.manager);
}

/**
 * Fetches and replaces the current manager's font
 * @param fontName {string}
 */
async function replaceFont(fontName)
{
    async function replaceSf()
    {

        // prompt the user to click if needed
        if(!window.audioContextMain)
        {
            titleMessage.innerText = "Press anywhere to start the app";
            return;
        }

        if(!window.manager) {
            // prepare the manager
            window.manager = new Manager(audioContextMain, soundFontParser);
            window.TITLE = window.manager.localeManager.getLocaleString("locale.titleMessage");
            titleMessage.innerText = "Initializing...";
            await manager.ready;
        }
        else
        {
            if(window.manager.seq)
            {
                window.manager.seq.pause();
            }
            await window.manager.reloadSf(window.soundFontParser);
            if(window.manager.seq)
            {
                // resets controllers
                window.manager.seq.currentTime -= 0.1;
            }
        }
        synthReady = true;
    }

    if(window.loadedSoundfonts.find(sf => sf.name === fontName))
    {
        window.soundFontParser = window.loadedSoundfonts.find(sf => sf.name === fontName).sf;
        await replaceSf();
        return;
    }
    titleMessage.innerText = "Downloading soundfont...";
    const data = await fetchFont(fontName, percent => progressBar.style.width = `${(percent / 100) * titleMessage.offsetWidth}px`);

    titleMessage.innerText = "Parsing soundfont...";
    setTimeout(() => {
        window.soundFontParser = data;
        progressBar.style.width = "0";
        window.loadedSoundfonts.push({name: fontName, sf: window.soundFontParser})
        replaceSf();
    });
    titleMessage.innerText = window.TITLE;
}

document.body.onclick = async () =>
{
    // user has clicked, we can create the js
    if(!window.audioContextMain)
    {
        if(navigator.mediaSession)
        {
            navigator.mediaSession.playbackState = "playing";
        }
        const context = window.AudioContext || window.webkitAudioContext;
        window.audioContextMain = new context({sampleRate: SAMPLE_RATE});
        if(window.soundFontParser) {
            // prepare midi interface
            window.manager = new Manager(audioContextMain, soundFontParser);
            window.TITLE = window.manager.localeManager.getLocaleString("locale.titleMessage")
            titleMessage.innerText = "Initializing..."
            await manager.ready;
            synthReady = true;
        }
    }
    document.body.onclick = null;
}

/**
 * @type {{name: string, size: number}[]}
 */
let soundFonts = [];

// load the list of soundfonts
fetch("soundfonts").then(async r => {
    if(!r.ok)
    {
        titleMessage.innerText = "Error fetching soundfonts!";
        throw r.statusText;
    }
    const sfSelector = document.getElementById("sf_selector");

    soundFonts = JSON.parse(await r.text());
    for(let sf of soundFonts)
    {
        const option = document.createElement("option");
        option.value = sf.name;
        let displayName = sf.name
        if(displayName.length > 29)
        {
            displayName = displayName.substring(0, 30) + "...";
        }
        option.innerText = displayName;
        sfSelector.appendChild(option);
    }

    sfSelector.onchange = () => {
        fetch(`/setlastsf2?sfname=${encodeURIComponent(sfSelector.value)}`);
        if(window.manager.seq)
        {
            window.manager.seq.pause();
        }
        replaceFont(sfSelector.value);

        if(window.manager.seq)
        {
            titleMessage.innerText = window.manager.seq.midiData.midiName || window.TITLE;
        }

    }

    // fetch the first sf2
    await replaceFont(soundFonts[0].name);

    // start midi if already uploaded
    if(fileInput.files[0]) {
        await startMidi(fileInput.files);
    }

    // and add the event listener
    fileInput.onchange = async () => {
        if (!fileInput.files[0]) {
            return;
        }
        await startMidi(fileInput.files);
    };
});

/**
 * saves the settings (settings.js) selected data to config.json
 * (only on local edition that's why it's here and not in the demo_main.js)
 * @param settingsData {Object}
 */
function saveSettings(settingsData)
{
    fetch("/savesettings", {
        method: "POST",
        body: JSON.stringify(settingsData),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then();
    console.log("saved as", settingsData)
}

// expose the function
window.saveSettings = saveSettings;

/**
 * reads the settings
 * @type {Promise<SavedSettings>}
 */
window.savedSettings = new Promise(resolve => {
    fetch("/getsettings").then(response =>  response.json().then(
        parsedSettings => {
            resolve(parsedSettings);
        }));
});

window.isLocalEdition = true;