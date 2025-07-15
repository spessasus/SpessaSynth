import { closeNotification, showNotification } from "../../notification/notification.js";
import { audioBufferToWav, FancyChorus, getReverbProcessor } from "spessasynth_lib";
import { formatTime } from "../../utils/other.js";
import { consoleColors } from "../../utils/console_colors.js";

import { ANIMATION_REFLOW_TIME } from "../../utils/animation_utils.js";
import { audioToWav } from "spessasynth_core";
import JSZip from "jszip";

const RENDER_AUDIO_TIME_INTERVAL = 250;

/**
 * @typedef {Object} WaveMetadata
 * @property {string|undefined} title - the song's title
 * @property {string|undefined} artist - the song's artist
 * @property {string|undefined} album - the song's album
 * @property {string|undefined} genre - the song's genre
 */


/**
 * @this {Manager}
 * @param normalizeAudio {boolean}
 * @param sampleRate {number}
 * @param additionalTime {number}
 * @param separateChannels {boolean}
 * @param meta {WaveMetadata}
 * @param loopCount {number}
 * @returns {Promise<void>}
 * @private
 */
export async function _doExportAudioData(normalizeAudio = true, sampleRate = 44100, additionalTime = 2, separateChannels = false, meta = {}, loopCount = 0)
{
    this.isExporting = true;
    if (!this.seq)
    {
        throw new Error("No sequencer active");
    }
    // get locales
    const exportingMessage = manager.localeManager.getLocaleString(`locale.exportAudio.formats.formats.wav.exportMessage.message`);
    const estimatedMessage = manager.localeManager.getLocaleString(`locale.exportAudio.formats.formats.wav.exportMessage.estimated`);
    const addingEffects = this.localeManager.getLocaleString(
        "locale.exportAudio.formats.formats.wav.exportMessage.addingEffects");
    const loadingMessage = manager.localeManager.getLocaleString(`locale.synthInit.genericLoading`);
    const notification = showNotification(
        exportingMessage,
        [
            { type: "text", textContent: loadingMessage },
            { type: "progress" }
        ],
        9999999,
        false
    );
    
    const parsedMid = await this.seq.getMIDI();
    // calculate times
    const playbackRate = this.seq.playbackRate;
    const loopStartAbsolute = parsedMid.MIDIticksToSeconds(parsedMid.loop.start) / playbackRate;
    const loopEndAbsolute = parsedMid.MIDIticksToSeconds(parsedMid.loop.end) / playbackRate;
    let loopDuration = loopEndAbsolute - loopStartAbsolute;
    const duration = parsedMid.duration / playbackRate + additionalTime + loopDuration * loopCount;
    let sampleDuration = sampleRate * duration;
    
    // progress tracking
    const detailMessage = notification.div.getElementsByTagName("p")[0];
    const progressDiv = notification.div.getElementsByClassName("notification_progress")[0];
    const RATI_SECONDS = RENDER_AUDIO_TIME_INTERVAL / 1000;
    let estimatedTime = duration * playbackRate;
    const smoothingFactor = 0.1; // for smoothing estimated time
    
    
    let lastProgress = 0;
    const showProgress = (prog, str, time = true) =>
    {
        progressDiv.style.width = `${prog * 100}%`;
        if (time)
        {
            // calculate estimated time
            let hasRendered = (prog - lastProgress) * duration;
            lastProgress = prog;
            const speed = hasRendered / RATI_SECONDS;
            const estimated = (1 - prog) / speed * duration;
            if (estimated === Infinity)
            {
                return;
            }
            // smooth out estimated using exponential moving average
            estimatedTime = smoothingFactor * estimated + (1 - smoothingFactor) * estimatedTime;
            detailMessage.innerText = `${str} ${formatTime(estimatedTime).time}`;
        }
        else
        {
            detailMessage.innerText = `${str} ${Math.floor(prog * 100_0) / 10}%`;
        }
    };
    
    let progress = 0;
    const interval = setInterval(() =>
    {
        showProgress(progress, estimatedMessage);
    }, RENDER_AUDIO_TIME_INTERVAL);
    
    // first pass: render dry audio in the worker
    const renderedNoEffectsData = await this.synth.renderAudio(
        sampleRate,
        additionalTime,
        separateChannels,
        loopCount,
        (p) => progress = p
    );
    progressDiv.style.width = "50%";
    // clear intervals
    clearInterval(interval);
    
    
    if (separateChannels)
    {
        
        const snapshot = await this.synth.getSynthesizerSnapshot();
        // discard effects
        const renderedChannels = renderedNoEffectsData.slice(2);
        const separatePath = `locale.exportAudio.formats.formats.wav.options.separateChannels.saving.`;
        /**
         * @type {NotificationContent[]}
         */
        const content = [];
        const usedChannels = new Set();
        for (const p of parsedMid.usedChannelsOnTrack)
        {
            p.forEach(c => usedChannels.add(c));
        }
        for (let i = 0; i < 16; i++)
        {
            // check if all channels are muted
            let muted = true;
            for (let j = i; j < snapshot.channelSnapshots.length; j += 16)
            {
                if (!snapshot.channelSnapshots[j].isMuted)
                {
                    muted = false;
                    break;
                }
            }
            if (!usedChannels.has(i) || muted)
            {
                continue;
            }
            const channel = i;
            content.push({
                type: "button",
                textContent: this.localeManager.getLocaleString(separatePath + "save", [i + 1]),
                onClick: async (n, target) =>
                {
                    const text = target.textContent;
                    target.textContent = this.localeManager.getLocaleString(
                        "locale.exportAudio.formats.formats.wav.exportMessage.convertWav");
                    await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
                    
                    // stereo
                    const audioOut = audioToWav(
                        renderedChannels[channel],
                        sampleRate,
                        false,
                        undefined,
                        undefined
                    );
                    const fileName = `${channel + 1} - ${snapshot.channelSnapshots[i].patchName}.wav`;
                    this.saveBlob(new Blob([audioOut], { type: "audio/wav" }), fileName);
                    target.classList.add("green_button");
                    target.textContent = text;
                }
            });
        }
        content.push({
            type: "button",
            textContent: this.localeManager.getLocaleString(separatePath + "saveAll"),
            onClick: async (n, target) =>
            {
                const text = target.textContent;
                target.textContent = this.localeManager.getLocaleString(
                    "locale.exportAudio.formats.formats.wav.exportMessage.convertWav");
                await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
                
                const zipped = new JSZip();
                renderedChannels.forEach((channel, i) =>
                {
                    // check if all channels are muted
                    let muted = true;
                    for (let j = i; j < snapshot.channelSnapshots.length; j += 16)
                    {
                        if (!snapshot.channelSnapshots[j].isMuted)
                        {
                            muted = false;
                            break;
                        }
                    }
                    if (!usedChannels.has(i) || muted)
                    {
                        return;
                    }
                    // stereo
                    const audioOut = audioToWav(
                        channel,
                        sampleRate,
                        false,
                        undefined,
                        undefined
                    );
                    const fileName = `${i + 1} - ${snapshot.channelSnapshots[i].patchName}.wav`;
                    zipped.file(fileName, audioOut);
                    console.info(
                        `%cAdding file %c${fileName}%c to zip...`,
                        consoleColors.info,
                        consoleColors.recognized,
                        consoleColors.info
                    );
                });
                const zipFile = await zipped.generateAsync({ type: "blob" });
                this.saveBlob(zipFile, `${parsedMid.midiName}.zip`);
                target.classList.add("green_button");
                target.textContent = text;
                
            }
        });
        const n = showNotification(
            this.localeManager.getLocaleString(separatePath + "title"),
            content,
            99999999,
            true,
            undefined,
            {
                display: "flex",
                flexWrap: "wrap",
                flexDirection: "row"
            }
        );
        n.div.style.width = "30rem";
    }
    else
    {
        /**
         * second pass: the effects
         * @type {OfflineAudioContext}
         */
        let offline;
        try
        {
            offline = new OfflineAudioContext({
                numberOfChannels: separateChannels ? 32 : 2,
                sampleRate: sampleRate,
                length: sampleDuration
            });
        }
        catch (e)
        {
            showNotification(
                "ERROR",
                [
                    { type: "text", textContent: e }
                ]
            );
            return;
        }
        // prepare the effects
        const r = getReverbProcessor(offline, this.synth.effectsConfig.reverbImpulseResponse);
        await r.promise;
        const reverb = r.conv;
        const chorus = new FancyChorus(offline.destination, this.synth.effectsConfig.chorusConfig);
        reverb.connect(offline.destination);
        
        // connect the playback sources
        const reverbAudio = new AudioBuffer({
            length: sampleDuration,
            sampleRate,
            numberOfChannels: 2
        });
        const rev = renderedNoEffectsData[0];
        reverbAudio.copyToChannel(rev[0], 0);
        reverbAudio.copyToChannel(rev[1], 1);
        const revSource = offline.createBufferSource();
        revSource.buffer = reverbAudio;
        revSource.connect(reverb);
        revSource.start();
        
        
        const chorusAudio = new AudioBuffer({
            length: sampleDuration,
            sampleRate,
            numberOfChannels: 2
        });
        const chr = renderedNoEffectsData[1];
        chorusAudio.copyToChannel(chr[0], 0);
        chorusAudio.copyToChannel(chr[1], 1);
        const chrSource = offline.createBufferSource();
        chrSource.buffer = chorusAudio;
        chrSource.connect(chorus.input);
        chrSource.start();
        
        const dryAudio = new AudioBuffer({
            length: sampleDuration,
            sampleRate,
            numberOfChannels: 2
        });
        const dry = renderedNoEffectsData[2];
        dryAudio.copyToChannel(dry[0], 0);
        dryAudio.copyToChannel(dry[1], 1);
        const drySource = offline.createBufferSource();
        drySource.buffer = dryAudio;
        drySource.connect(offline.destination);
        drySource.start();
        
        const progressTracker = setInterval(() =>
        {
            showProgress(offline.currentTime / duration, addingEffects, false);
        }, RENDER_AUDIO_TIME_INTERVAL / 4);
        
        console.info(
            "%cSecond pass: rendering effects...",
            consoleColors.info
        );
        const buf = await offline.startRendering();
        
        clearInterval(progressTracker);
        progressDiv.style.width = "100%";
        
        detailMessage.innerText = this.localeManager.getLocaleString(
            "locale.exportAudio.formats.formats.wav.exportMessage.convertWav");
        // let the browser show
        await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
        
        const startOffset = parsedMid.MIDIticksToSeconds(parsedMid.firstNoteOn);
        const loopStart = loopStartAbsolute - startOffset;
        const loopEnd = loopEndAbsolute - startOffset;
        let loop = { start: loopStart, end: loopEnd };
        console.info(
            `%cWriting loop points: start %c${loopStart}%c, end:%c${loopEnd}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized
        );
        const wav = audioBufferToWav(buf, normalizeAudio, 0, meta, loop);
        this.saveBlob(wav, `${this.seqUI.currentSongTitle || "unnamed_song"}.wav`);
    }
    closeNotification(notification.id);
    this.isExporting = false;
}

/**
 * @this {Manager}
 * @returns {Promise<void>}
 * @private
 */
export async function _exportAudioData()
{
    if (this.isExporting)
    {
        return;
    }
    const wavPath = `locale.exportAudio.formats.formats.wav.options.`;
    const metadataPath = "locale.exportAudio.formats.metadata.";
    const verifyDecode = (type, def, decoder) =>
    {
        return this.seq.midiData.RMIDInfo?.[type] === undefined ? def : decoder.decode(this.seq.midiData.RMIDInfo?.[type])
            .replace(/\0$/, "");
    };
    const encoding = verifyDecode("IENC", "ascii", new TextDecoder());
    const decoder = new TextDecoder(encoding);
    
    const startAlbum = verifyDecode("IPRD", "", decoder);
    const startArtist = verifyDecode("IART", "", decoder);
    const startGenre = verifyDecode("IGNR", "", decoder);
    /**
     * @type {NotificationContent[]}
     */
    const WAV_OPTIONS = [
        {
            type: "text",
            textContent: this.localeManager.getLocaleString(wavPath + "description"),
            attributes: {
                "style": "max-width: 30ch; font-style: italic"
            }
        },
        {
            type: "toggle",
            translatePathTitle: wavPath + "normalizeVolume",
            attributes: {
                "normalize-volume-toggle": "1",
                "checked": "true"
            }
        },
        {
            type: "input",
            translatePathTitle: wavPath + "additionalTime",
            attributes: {
                "value": "2",
                "type": "number",
                "additional-time": "1"
            }
        },
        {
            type: "input",
            translatePathTitle: wavPath + "sampleRate",
            attributes: {
                "value": "44100",
                "type": "number",
                "sample-rate": "1"
            }
        },
        {
            type: "input",
            translatePathTitle: wavPath + "loopCount",
            attributes: {
                "value": "0",
                "type": "number",
                "loop-count": "1"
            }
        },
        {
            type: "toggle",
            translatePathTitle: wavPath + "separateChannels",
            attributes: {
                "separate-channels-toggle": "1"
            }
        },
        {
            type: "input",
            translatePathTitle: metadataPath + "songTitle",
            attributes: {
                "name": "song_title",
                "type": "text",
                "value": this.seqUI.currentSongTitle
            }
        },
        {
            type: "input",
            translatePathTitle: metadataPath + "album",
            attributes: {
                "value": startAlbum,
                "name": "album",
                "type": "text"
            }
        },
        {
            type: "input",
            translatePathTitle: metadataPath + "artist",
            attributes: {
                "value": startArtist,
                "name": "artist",
                "type": "text"
            }
        },
        {
            type: "input",
            translatePathTitle: metadataPath + "genre",
            attributes: {
                "value": startGenre,
                "name": "genre",
                "type": "text"
            }
        },
        {
            type: "button",
            textContent: this.localeManager.getLocaleString(wavPath + "confirm"),
            onClick: n =>
            {
                closeNotification(n.id);
                const normalizeVolume = n.div.querySelector("input[normalize-volume-toggle]").checked;
                const additionalTime = n.div.querySelector("input[additional-time]").value;
                const sampleRate = n.div.querySelector("input[sample-rate]").value;
                const loopCount = n.div.querySelector("input[loop-count]").value;
                const separateChannels = n.div.querySelector("input[separate-channels-toggle]").checked;
                const artist = n.div.querySelector("input[name='artist']").value;
                const album = n.div.querySelector("input[name='album']").value;
                const title = n.div.querySelector("input[name='song_title']").value;
                const genre = n.div.querySelector("input[name='genre']").value;
                /**
                 * @type {WaveMetadata}
                 */
                const metadata = {
                    artist: artist.length > 0 ? artist : undefined,
                    album: album.length > 0 ? album : undefined,
                    title: title.length > 0 ? title : undefined,
                    genre: genre.length > 0 ? genre : undefined
                };
                
                this._doExportAudioData(
                    normalizeVolume,
                    parseInt(sampleRate),
                    parseInt(additionalTime),
                    separateChannels,
                    metadata,
                    parseInt(loopCount)
                );
            }
        }
    ];
    
    /**
     * @type {NotificationContent[]}
     */
    showNotification(
        this.localeManager.getLocaleString(wavPath + "title"),
        WAV_OPTIONS,
        9999999,
        true,
        this.localeManager
    );
}