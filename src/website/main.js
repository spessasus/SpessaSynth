"use strict"

import {Manager} from "./manager.js";
import {MIDI} from "../spessasynth_lib/midi_parser/midi_loader.js";

import {SoundFont2} from "../spessasynth_lib/soundfont/soundfont_parser.js";
import {ShiftableByteArray} from "../spessasynth_lib/utils/shiftable_array.js";
import { formatTitle } from '../spessasynth_lib/utils/other.js'

const TITLE = "SpessaSynth: SoundFont2 Javascript Synthetizer";

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

let synthReady = false;

/**
 * @type {{name: string, sf: SoundFont2}[]}
 */
window.loadedSoundfonts = [];


/**
 * @param midiFile {File}
 */
async function parseMidi(midiFile)
{
    const buffer = await midiFile.arrayBuffer();
    const arr = new ShiftableByteArray(buffer);
    try {
        return new MIDI(arr, midiFile.name);
    }
    catch (e) {
        titleMessage.innerHTML = `Error parsing MIDI: <pre style='font-family: monospace; font-weight: bold'>${e}</pre>`;
        throw e;
    }
}

/**
 * @param fileName {string}
 * @param callback {function(number)}
 * @returns {Promise<ShiftableByteArray>}
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
    let dataArray = new ShiftableByteArray(parseInt(size));
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
    return dataArray;
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
    else if(!manager.ready)
    {
        setTimeout(() => startMidi(midiFiles), 100);
        return;
    }
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
 * Fetches and replaces the current manager's font
 * @param fontName {string}
 */
async function replaceFont(fontName)
{
    function replaceSf()
    {
        titleMessage.innerText = TITLE;

        // prompt the user to click if needed
        if(!window.audioContextMain)
        {
            titleMessage.innerText = "Press anywhere to start the app";
            return;
        }

        if(!window.manager) {
            // prepare the manager
            window.manager = new Manager(audioContextMain, soundFontParser);
        }
        else
        {
            window.manager.synth.soundFont = window.soundFontParser;
            window.manager.synth.reloadSoundFont();
            window.manager.synthUI.reloadSelectors();

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
        replaceSf();
        return;
    }
    titleMessage.innerText = "Downloading soundfont...";
    const data = await fetchFont(fontName, percent => progressBar.style.width = `${(percent / 100) * titleMessage.offsetWidth}px`);

    titleMessage.innerText = "Parsing soundfont...";
    setTimeout(() => {
        window.soundFontParser = new SoundFont2(data);
        progressBar.style.width = "0";

        if(window.soundFontParser.presets.length < 1)
        {
            titleMessage.innerText = "No presets in the soundfont! Check your file?"
            return;
        }
        window.loadedSoundfonts.push({name: fontName, sf: window.soundFontParser})
        replaceSf();
    });
}

document.body.onclick = () =>
{
    // user has clicked, we can create the ui
    if(!window.audioContextMain) {
        navigator.mediaSession.playbackState = "playing";
        window.audioContextMain = new AudioContext({sampleRate: 44100,
        latencyHint: "playback"});
        if(window.soundFontParser) {
            titleMessage.innerText = TITLE;
            // prepare midi interface
            window.manager = new Manager(audioContextMain, soundFontParser);
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
        option.innerText = sf.name;
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
            titleMessage.innerText = window.manager.seq.midiData.midiName || TITLE;
        }

    }

    // fetch the first sf2
    await replaceFont(soundFonts[0].name);

    // start midi if already uploaded
    if(fileInput.files[0]) {
        await startMidi(fileInput.files);
    }

    // and add the event listener
    fileInput.onchange = () => {
        if (!fileInput.files[0]) {
            return;
        }
        startMidi(fileInput.files);
    };
})