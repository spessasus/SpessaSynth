"use strict"

import { Manager } from './manager.js'
import { MIDI } from '../spessasynth_lib/midi_parser/midi_loader.js'

import { SoundFont2 } from '../spessasynth_lib/soundfont/soundfont_parser.js'
import { formatTitle } from '../spessasynth_lib/utils/other.js'

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

document.getElementById("bundled_sf").onclick = () => {
    titleMessage.innerText = "Downloading SoundFont...";
    fetchFont(`soundfonts/${SF_NAME}`, percent => titleMessage.innerText = `Loading SF3: ${percent}%`).then(arr => {
        try {
            window.soundFontParser = new SoundFont2(arr);
            document.getElementById("sf_upload").innerText = SF_NAME;
        }
        catch (e)
        {
            titleMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold'>${e}</pre>`;
            console.log(e);
            return;
        }
        prepareUI();
    });
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
}

/**
 * @param e {{target: HTMLInputElement}}
 * @return {Promise<void>}
 */
sfInput.onchange = async e => {
    if(!e.target.files[0])
    {
        return;
    }
    /**
     * @type {File}
     */
    const file = e.target.files[0];

    document.getElementById("sf_upload").innerText = file.name;
    titleMessage.innerText = "Parsing SoundFont...";

    const arr = await file.arrayBuffer();
    try {
        window.soundFontParser = new SoundFont2(arr);
    }
    catch (e)
    {
        titleMessage.innerHTML = `Error parsing SoundFont: <pre style='font-family: monospace; font-weight: bold'>${e}</pre>`;
        console.log(e);
        return;
    }
    prepareUI();
}

function prepareUI()
{
    titleMessage.innerText = TITLE;
    document.getElementById("bundled_sf").style.display = "none";
    document.getElementById("bundled_sf").onclick = undefined;

    window.audioContextMain = new AudioContext({sampleRate: 44100, latencyHint: "interactive"});

    // prepare midi interface
    window.manager = new Manager(audioContextMain, soundFontParser);

    sfInput.onchange = undefined;
    if(fileInput.files[0])
    {
        startMidi(fileInput.files);
    }
    else
    {
        fileInput.onclick = undefined;
        fileInput.onchange = e => {
            if(e.target.files[0])
            {
                startMidi(fileInput.files);
            }
        }
    }
}


/**
 * saves the settings (settings.js) selected data to config.json
 * (only on local edition that's why it's here and not in the demo_main.js)
 * @param settingsData {Object}
 */
function saveSettings(settingsData)
{
    localStorage.setItem("spessasynth-settings", JSON.stringify(settingsData));
    console.log("saved as", settingsData)
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
