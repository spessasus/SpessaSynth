import {MidiParser} from "./midi_parser/midi_parser.js";
import {MidiManager} from "./midi_manager.js";

import {SoundFont2} from "./soundfont/soundfont_parser.js";
import {ShiftableUint8Array} from "./utils/shiftable_array.js";

/**
 * Parses the midi file (kinda)
 *
 * @param {File} midiFile
 */
async function parseMidi(midiFile)
{
    let buffer = await midiFile.arrayBuffer();
    let p = new MidiParser();
    return await p.parse(Array.from(new Uint8Array(buffer)), t => titleMessage.innerText = t);
}

/**
 * @param fileName {"soundfont.sf2"|"gm.sf2"|"Touhou.sf2"|"FluidR3_GM.sf2"|"alex_gm.sf2"|"zunpet.sf2"|"pc98.sf2"|"zunfont.sf2"}
 * @param callback {function(number)}
 * @returns {Promise<ShiftableUint8Array>}
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
    let dataArray = new ShiftableUint8Array(size);
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
 * @param midiFile {File}
 */
function startMidi(midiFile)
{
    titleMessage.innerText = `Parsing ${midiFile.name}`;
    document.getElementById("file_upload").innerText = midiFile.name;
    parseMidi(midiFile).then(parsedMid => {
        titleMessage.innerText = "SpessaSynth: MIDI Soundfont2 Player";
        manager.play(parsedMid, true, true);
    });
}

/**
 * @param url {string}
 * @param callback {function(string)}
 * @returns {Promise<ShiftableUint8Array>}
 */
// async function fetchFontHeaderManipulation(url, callback) {
//     // 50MB
//     const chunkSize = 1024 * 1024 * 50;
//     const fileSize = (await fetch(url, {method: "HEAD"})).headers.get("content-length");
//     const chunksAmount = Math.ceil(fileSize / chunkSize);
//     /**
//      * @type {Promise[]}
//      */
//     let loaderWorkers = [];
//     let startIndex = 0;
//     let loadedWorkersAmount = 0;
//     for (let i = 0; i < chunksAmount; i++)
//     {
//         let thisChunkSize =
//             fileSize < startIndex + chunkSize ?
//                 fileSize - startIndex
//             :
//                 chunkSize;
//
//         let bytesRange = [startIndex, startIndex + thisChunkSize - 1];
//         let loaderWorker = new Promise(resolve =>
//         {
//             let w = new Worker("soundfont/soundfont_loader_worker.js");
//
//             w.onmessage = d => {
//                 callback(`Downloading Soundfont... (${++loadedWorkersAmount}/${chunksAmount})`);
//                 resolve(d.data);
//             }
//
//             w.postMessage({
//                 range: bytesRange,
//                 url: window.location.href + url
//             });
//         });
//         loaderWorkers.push(loaderWorker);
//         startIndex += thisChunkSize
//     }
//     /**
//      * @type {Uint8Array[]}
//      */
//     let data = await Promise.all(loaderWorkers);
//     let joinedData = new ShiftableUint8Array(fileSize);
//     let index = 0;
//     let totalDatalen = 0;
//     for(let arr of data)
//     {
//         totalDatalen += arr.length;
//     }
//     for(let arr of data)
//     {
//         joinedData.set(arr, index);
//         index += arr.length;
//     }
//     return joinedData;
// }

document.getElementById("midi_file_input").focus();

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

document.body.onclick = () =>
{
    // user has clicked, we can create the ui
    if(!window.audioContextMain) {
        window.audioContextMain = new AudioContext();
        if(window.soundFontParser) {
            titleMessage.innerText = "SpessaSynth: MIDI Soundfont2 Player";
            // prepare midi interface
            window.manager = new MidiManager(audioContextMain, soundFontParser);
        }
    }
    document.body.onclick = null;
}

titleMessage.innerText = "Downloading soundfont...";

fetchFont("soundfont.sf2", percent => progressBar.style.width = `${(percent / 100) * titleMessage.offsetWidth}px`)
    .then(data => {
        titleMessage.innerText = "Parsing soundfont...";
        setTimeout(() => {
            window.soundFontParser = new SoundFont2(data, m => titleMessage.innerText = m);

            titleMessage.innerText = "SpessaSynth: MIDI Soundfont2 Player";
            progressBar.style.width = "0";

            if(!fileInput.files[0]) {
                fileInput.onchange = () => {
                    if (!fileInput.files[0]) {
                        return;
                    }
                    startMidi(fileInput.files[0]);
                    fileInput.onchange = null;
                };
            }
            else
            {
                startMidi(fileInput.files[0]);
            }

            // prompt the user to click if needed
            if(!window.audioContextMain)
            {
                titleMessage.innerText = "Press anywhere to start the app";
                return;
            }
            // prepare midi interface
            window.manager = new MidiManager(audioContextMain, soundFontParser);
        });
    });