"use strict";

import { Manager } from "../manager/manager.js";
import { isMobile } from "../utils/is_mobile.js";
import { getCheckSvg, getExclamationSvg, getHourglassSvg } from "../utils/icons.js";
import { closeNotification, showNotification } from "../notification/notification.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { LocaleManager } from "../locale/locale_manager.js";

import { VOICE_CAP } from "spessasynth_core";

/**
 * demo_main.js
 * purpose: main script for the demo, loads the soundfont and passes it to the manager.js
 */
const SAMPLE_RATE = 44100;
const SF_NAME = "GeneralUserGS.sf3";
/**
 * @type {HTMLHeadingElement}
 */
let titleMessage = document.getElementById("title");
/**
 * @type {HTMLInputElement}
 */
let fileInput = document.getElementById("midi_file_input");
let sfInput = document.getElementById("sf_file_input");
let demoSongButton = document.getElementById("demo_song");
/**
 * @type {HTMLButtonElement}
 */
const exportButton = document.getElementById("export_button");
const loading = document.getElementsByClassName("loading")[0];
const loadingMessage = document.getElementById("loading_message");

// load version
const r = await (await fetch("package.json")).json();
window.SPESSASYNTH_VERSION = r["version"];

// IndexedDB stuff
const dbName = "spessasynth-db";
const objectStoreName = "soundFontStore";

/**
 * @param callback {function(IDBDatabase)}
 */
function initDatabase(callback)
{
    const request = indexedDB.open(dbName, 1);
    
    
    request.onsuccess = () =>
    {
        const db = request.result;
        callback(db);
    };
    
    request.onupgradeneeded = (event) =>
    {
        const db = event.target.result;
        db.createObjectStore(objectStoreName, { keyPath: "id" });
    };
}

/**
 * @returns {Promise<ArrayBuffer|undefined>}
 */
async function loadLastSoundFontFromDatabase()
{
    return await new Promise(resolve =>
    {
        // fetch from db
        initDatabase(db =>
        {
            const transaction = db.transaction([objectStoreName], "readonly");
            const objectStore = transaction.objectStore(objectStoreName);
            const request = objectStore.get("buffer");
            
            request.onerror = e =>
            {
                console.error("Database error");
                console.error(e);
                resolve(undefined);
            };
            
            request.onsuccess = async () =>
            {
                const result = request.result;
                if (!result)
                {
                    resolve(undefined);
                    return;
                }
                resolve(result.data);
            };
        });
    });
}

function changeIcon(html, disableAnimation = true)
{
    const icon = loading.getElementsByClassName("loading_icon")[0];
    icon.innerHTML = html;
    icon.style.animation = disableAnimation ? "none" : "";
}

/**
 * @param arr {ArrayBuffer}
 */
async function saveSoundFontToIndexedDB(arr)
{
    initDatabase(db =>
    {
        const transaction = db.transaction([objectStoreName], "readwrite");
        const objectStore = transaction.objectStore(objectStoreName);
        try
        {
            const request = objectStore.put({ id: "buffer", data: arr });
            request.onsuccess = () =>
            {
                console.info("SoundFont stored successfully");
            };
            
            request.onerror = e =>
            {
                console.error("Error saving soundfont", e);
            };
        }
        catch (e)
        {
            console.warn("Failed saving soundfont:", e);
        }
    });
}

// attempt to load soundfont from indexed db
async function demoInit(initLocale)
{
    // initialize the locale management system. do it here because we want it ready before all js classes do their things
    const localeManager = new LocaleManager(initLocale);
    try
    {
        // noinspection JSUnresolvedReference
        const context = window.AudioContext || window.webkitAudioContext;
        window.audioContextMain = new context({ sampleRate: SAMPLE_RATE });
    }
    catch (e)
    {
        changeIcon(getExclamationSvg(256));
        loadingMessage.textContent = localeManager.getLocaleString("locale.synthInit.noWebAudio");
        throw e;
        
    }
    loadingMessage.textContent = localeManager.getLocaleString("locale.synthInit.loadingSoundfont");
    let soundFontBuffer = await loadLastSoundFontFromDatabase();
    let loadedFromDb = true;
    if (soundFontBuffer === undefined)
    {
        console.warn("Failed to load from db, fetching online instead");
        loadedFromDb = false;
        const progressBar = document.getElementById("progress_bar");
        const sFontLoadMessage = localeManager.getLocaleString("locale.synthInit.loadingBundledSoundfont");
        loadingMessage.textContent = sFontLoadMessage;
        soundFontBuffer = await fetchFont(`soundfonts/${SF_NAME}`, percent =>
        {
            loadingMessage.textContent = `${sFontLoadMessage} ${percent}%`;
        });
        progressBar.style.width = "0";
    }
    else
    {
        console.info("Loaded the soundfont from the database succesfully");
    }
    window.soundFontParser = soundFontBuffer;
    if (!loadedFromDb)
    {
        loadingMessage.textContent = localeManager.getLocaleString("locale.synthInit.savingSoundfont");
        await saveSoundFontToIndexedDB(soundFontBuffer);
    }
    
    if (window.audioContextMain.state !== "running")
    {
        document.addEventListener("mousedown", () =>
        {
            if (window.audioContextMain.state !== "running")
            {
                window.audioContextMain.resume().then();
            }
            
        });
    }
    
    // prepare midi interface
    loadingMessage.textContent = localeManager.getLocaleString("locale.synthInit.startingSynthesizer");
    window.manager = new Manager(audioContextMain, soundFontParser, localeManager);
    window.manager.sfError = e =>
    {
        changeIcon(getExclamationSvg(256));
        if (loadedFromDb)
        {
            console.warn("Invalid soundfont in the database. Resetting.");
            // restore to default
            initDatabase(db =>
            {
                const transaction = db.transaction([objectStoreName], "readwrite");
                const objectStore = transaction.objectStore(objectStoreName);
                const request = objectStore.delete("buffer");
                request.onsuccess = () =>
                {
                    location.reload();
                };
            });
            
        }
        else
        {
            titleMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold;'>${e}</pre>`;
        }
        loadingMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold;'>${e}</pre>`;
    };
    await manager.ready;
    
    manager.synth.voiceCap = voiceCap;
    
    if (fileInput.files[0])
    {
        await startMidi(fileInput.files);
    }
    else
    {
        fileInput.onclick = undefined;
        fileInput.onchange = () =>
        {
            if (fileInput.files[0])
            {
                startMidi(fileInput.files).then();
            }
        };
    }
    
    changeIcon(getCheckSvg(256));
    loadingMessage.textContent = localeManager.getLocaleString("locale.synthInit.done");
}

async function fetchFont(url, callback)
{
    let response = await fetch(url);
    if (!response.ok)
    {
        titleMessage.innerText = "Error downloading soundfont!";
        throw response;
    }
    let size = response.headers.get("content-length");
    let reader = await (await response.body).getReader();
    let done = false;
    let dataArray = new Uint8Array(parseInt(size));
    let offset = 0;
    do
    {
        let readData = await reader.read();
        if (readData.value)
        {
            dataArray.set(readData.value, offset);
            offset += readData.value.length;
        }
        done = readData.done;
        let percent = Math.round((offset / size) * 100);
        callback(percent);
    } while (!done);
    return dataArray.buffer;
}

/**
 * @param midiFiles {FileList|File[]}
 */
async function startMidi(midiFiles)
{
    demoSongButton.style.display = "none";
    let fName;
    if (midiFiles[0].name.length > 20)
    {
        fName = midiFiles[0].name.substring(0, 21) + "...";
    }
    else
    {
        fName = midiFiles[0].name;
    }
    if (midiFiles.length > 1)
    {
        fName += ` and ${midiFiles.length - 1} others`;
    }
    document.getElementById("file_upload").innerText = fName;
    document.getElementById("file_upload").title = midiFiles[0].name;
    /**
     * @type {{binary: ArrayBuffer, altName: string}[]}
     */
    const parsed = [];
    for (const file of midiFiles)
    {
        parsed.push({
            binary: await file.arrayBuffer(),
            altName: file.name
        });
    }
    manager.synth.setLogLevel(false, false, false, false);
    if (manager.seq)
    {
        manager.seq.loadNewSongList(parsed);
        
    }
    else
    {
        manager.play(parsed);
    }
    
    exportButton.style.display = "flex";
    exportButton.onclick = window.manager.exportSong.bind(window.manager);
}


/**
 * saves the settings (settings.js) selected data to config.json
 * (only on the local edition that's why it's here and not in the demo_main.js)
 * @param settingsData {Object}
 */
function saveSettings(settingsData)
{
    localStorage.setItem("spessasynth-settings", JSON.stringify(settingsData));
    console.info("saved as", settingsData);
}

let voiceCap = VOICE_CAP;

const savedVoiceCap = localStorage.getItem("spessasynth-voice-cap");
if (savedVoiceCap)
{
    voiceCap = parseInt(savedVoiceCap);
}
window.rememberVoiceCap = cap =>
{
    localStorage.setItem("spessasynth-voice-cap", cap.toString());
    window.location.reload();
};

// INIT STARTS HERE

// expose the save function
window.saveSettings = saveSettings;

// load saved settings
const saved = JSON.parse(localStorage.getItem("spessasynth-settings"));
if (saved !== null)
{
    /**
     * reads the settings
     * @type {Promise<SavedSettings>}
     */
    window.savedSettings = new Promise(resolve =>
    {
        resolve(saved);
    });
}
let initLocale;
// get locale from saved settings or browser: "en-US" will turn into just "en"
if (saved && saved.interface && saved.interface.language)
{
    initLocale = ((await savedSettings).interface.language) || navigator.language.split("-")[0].toLowerCase();
}
else
{
    initLocale = navigator.language.split("-")[0].toLowerCase();
}


// remove the old files
fileInput.value = "";
fileInput.focus();
// set initial styles
exportButton.style.display = "none";
document.getElementById("sf_upload").style.display = "none";
document.getElementById("file_upload").style.display = "none";

async function playDemoSong(fileName)
{
    titleMessage.textContent = window.manager.localeManager.getLocaleString("locale.synthInit.genericLoading");
    const r = await fetch("https://spessasus.github.io/spessasynth-demo-songs/demo_songs/" + fileName);
    r.name = fileName;
    // noinspection JSCheckFunctionSignatures
    await startMidi([r]);
}

demoInit(initLocale).then(() =>
{
    document.getElementById("sf_upload").style.display = "flex";
    document.getElementById("file_upload").style.display = "flex";
    loading.classList.add("done");
    document.documentElement.classList.add("no_scroll");
    document.body.classList.add("no_scroll");
    setTimeout(() =>
    {
        loading.style.display = "none";
        document.body.classList.remove("no_scroll");
        document.documentElement.classList.remove("no_scroll");
        
        // check for chrome android
        if (isMobile)
        {
            // noinspection JSUnresolvedReference
            if (window.chrome)
            {
                showNotification(
                    window.manager.localeManager.getLocaleString(
                        "locale.warnings.warning"),
                    [{
                        type: "text",
                        textContent: window.manager.localeManager.getLocaleString(
                            "locale.warnings.chromeMobile")
                    }],
                    7
                );
            }
        }
    }, 1000);
    /**
     * @param e {{target: HTMLInputElement}}
     */
    sfInput.onchange = e =>
    {
        if (!e.target.files[0])
        {
            return;
        }
        /**
         * @type {File}
         */
        const file = e.target.files[0];
        
        if (window.manager.seq)
        {
            window.manager.seq.pause();
        }
        document.getElementById("sf_upload").firstElementChild.innerText = file.name;
        loading.style.display = "";
        setTimeout(async () =>
        {
            loading.classList.remove("done");
            changeIcon(getHourglassSvg(256), false);
            loadingMessage.textContent = window.manager.localeManager.getLocaleString(
                "locale.synthInit.loadingSoundfont");
            const parseStart = performance.now() / 1000;
            // parse the soundfont
            let soundFontBuffer;
            try
            {
                soundFontBuffer = await file.arrayBuffer();
                window.soundFontParser = soundFontBuffer;
            }
            catch (e)
            {
                loadingMessage.textContent = window.manager.localeManager.getLocaleString(
                    "locale.warnings.outOfMemory");
                changeIcon(getExclamationSvg(256));
                showNotification(
                    manager.localeManager.getLocaleString("locale.warnings.warning"),
                    [{
                        type: "text",
                        textContent: window.manager.localeManager.getLocaleString(
                            "locale.warnings.outOfMemory")
                    }]
                );
                throw e;
            }
            window.manager.sfError = e =>
            {
                loadingMessage.innerHTML = `Error parsing soundfont: <pre style='font-family: monospace; font-weight: bold;'>${e}</pre>`;
                changeIcon(getExclamationSvg(256));
                console.error(e);
            };
            loadingMessage.textContent = window.manager.localeManager.getLocaleString(
                "locale.synthInit.startingSynthesizer");
            await window.manager.reloadSf(soundFontBuffer);
            if (window.manager.seq)
            {
                window.manager.seq.currentTime -= 0.1;
            }
            loadingMessage.textContent = window.manager.localeManager.getLocaleString(
                "locale.synthInit.savingSoundfont");
            await saveSoundFontToIndexedDB(soundFontBuffer);
            // wait to make sure that the animation has finished
            const elapsed = (performance.now() / 1000) - parseStart;
            await new Promise(r => setTimeout(r, 1000 - elapsed));
            // DONE
            changeIcon(getCheckSvg(256));
            loadingMessage.textContent = window.manager.localeManager.getLocaleString(
                "locale.synthInit.done");
            loading.classList.add("done");
            document.documentElement.classList.add("no_scroll");
            document.body.classList.add("no_scroll");
            setTimeout(() =>
            {
                loading.style.display = "none";
                document.body.classList.remove("no_scroll");
                document.documentElement.classList.remove("no_scroll");
            }, 1000);
        }, ANIMATION_REFLOW_TIME);
    };
    demoSongButton.onclick = async () =>
    {
        /**
         * @type {NotificationContent[]}
         */
        const contents = [
            {
                type: "button",
                textContent: "Bundled SoundFont Credits",
                onClick: () =>
                {
                    window.open("https://schristiancollins.com/generaluser.php");
                }
            }
        ];
        titleMessage.textContent = window.manager.localeManager.getLocaleString(
            "locale.synthInit.genericLoading");
        const songs = await ((await fetch(
            "https://spessasus.github.io/spessasynth-demo-songs/demo_song_list.json")).text());
        /**
         * @type {{
         *     name: string,
         *     fileName: string,
         *     credits: string
         * }[]}
         */
        const songsJSON = JSON.parse(songs);
        for (const song of songsJSON)
        {
            contents.push({
                type: "button",
                textContent: song.name,
                onClick: n =>
                {
                    closeNotification(n.id);
                    showNotification(
                        window.manager.localeManager.getLocaleString("locale.credits"),
                        [
                            {
                                type: "text",
                                textContent: song.credits.replace("\n", "\r\n\r\n"),
                                attributes: { "style": "white-space: pre-line;" }
                            },
                            {
                                type: "button",
                                textContent: "Ok",
                                onClick: n =>
                                {
                                    closeNotification(n.id);
                                }
                            }
                        ],
                        999999,
                        true,
                        undefined,
                        undefined,
                        async () =>
                        {
                            await playDemoSong(song.fileName);
                        }
                    );
                }
            });
        }
        
        showNotification(
            window.manager.localeManager.getLocaleString("locale.demoSongButton"),
            contents,
            999999,
            true,
            undefined
        );
    };
});
