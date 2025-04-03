import { closeNotification, showNotification } from "../notification/notification.js";
import { Synthetizer } from "../../../spessasynth_lib/synthetizer/synthetizer.js";
import { consoleColors, formatTime } from "../../../spessasynth_lib/utils/other.js";
import { audioBufferToWav } from "../../../spessasynth_lib/utils/buffer_to_wav.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { SpessaSynthInfo } from "../../../spessasynth_lib/utils/loggin.js";

const RENDER_AUDIO_TIME_INTERVAL = 1000;

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
    const loopStartAbsolute = parsedMid.MIDIticksToSeconds(parsedMid.loop.start);
    const loopEndAbsolute = parsedMid.MIDIticksToSeconds(parsedMid.loop.end);
    let loopDuration = loopEndAbsolute - loopStartAbsolute;
    const duration = parsedMid.duration + additionalTime + loopDuration * loopCount;
    
    let sampleDuration = sampleRate * duration;
    
    /**
     * prepare audio context
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
        await offline.audioWorklet.addModule(new URL(this.workletPath, import.meta.url));
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
    
    /**
     * take the snapshot of the real synth
     * @type {SynthesizerSnapshot}
     */
    const snapshot = await this.synth.getSynthesizerSnapshot();
    
    const soundfont = this.soundFont;
    /**
     * Prepare synthesizer
     * @type {Synthetizer}
     */
    let synth;
    const effects = {
        reverbEnabled: true,
        chorusEnabled: true,
        chorusConfig: undefined
    };
    snapshot.effectsConfig = effects;
    try
    {
        synth = new Synthetizer(
            offline.destination,
            soundfont,
            false,
            {
                parsedMIDI: parsedMid,
                snapshot: snapshot,
                oneOutput: separateChannels,
                loopCount: loopCount
            },
            effects
        );
    }
    catch (e)
    {
        showNotification(
            this.localeManager.getLocaleString("locale.warnings.warning"),
            [{
                type: "text",
                textContent: this.localeManager.getLocaleString("locale.warnings.outOfMemory")
            }]
        );
        throw e;
    }
    await synth.isReady;
    
    const detailMessage = notification.div.getElementsByTagName("p")[0];
    const progressDiv = notification.div.getElementsByClassName("notification_progress")[0];
    
    const RATI_SECONDS = RENDER_AUDIO_TIME_INTERVAL / 1000;
    let rendered = synth.currentTime;
    let estimatedTime = duration;
    const smoothingFactor = 0.1; // for smoothing estimated time
    
    const interval = setInterval(() =>
    {
        // calculate estimated time
        let hasRendered = synth.currentTime - rendered;
        rendered = synth.currentTime;
        const progress = synth.currentTime / duration;
        progressDiv.style.width = `${progress * 100}%`;
        const speed = hasRendered / RATI_SECONDS;
        const estimated = (1 - progress) / speed * duration;
        if (estimated === Infinity)
        {
            return;
        }
        // smooth out estimated using exponential moving average
        estimatedTime = smoothingFactor * estimated + (1 - smoothingFactor) * estimatedTime;
        detailMessage.innerText = `${estimatedMessage} ${formatTime(estimatedTime).time}`;
    }, RENDER_AUDIO_TIME_INTERVAL);
    
    const buf = await offline.startRendering();
    progressDiv.style.width = "100%";
    // clear intervals and save the file
    clearInterval(interval);
    detailMessage.innerText = this.localeManager.getLocaleString(
        "locale.exportAudio.formats.formats.wav.exportMessage.convertWav");
    // let the browser show
    await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
    if (!separateChannels)
    {
        const startOffset = parsedMid.MIDIticksToSeconds(parsedMid.firstNoteOn);
        const loopStart = loopStartAbsolute - startOffset;
        const loopEnd = loopEndAbsolute - startOffset;
        let loop = { start: loopStart, end: loopEnd };
        SpessaSynthInfo(
            `%cWriting loop points: start %c${loopStart}%c, end:%c${loopEnd}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized
        );
        const wav = audioBufferToWav(buf, normalizeAudio, 0, meta, loop);
        this.saveBlob(wav, `${this.seqUI.currentSongTitle || "unnamed_song"}.wav`);
    }
    else
    {
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
            content.push({
                type: "button",
                textContent: this.localeManager.getLocaleString(separatePath + "save", [i + 1]),
                onClick: async (n, target) =>
                {
                    
                    const text = target.textContent;
                    target.textContent = this.localeManager.getLocaleString(
                        "locale.exportAudio.formats.formats.wav.exportMessage.convertWav");
                    await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
                    
                    const audioOut = audioBufferToWav(buf, false, i * 2);
                    const fileName = `${i + 1} - ${snapshot.channelSnapshots[i].patchName}.wav`;
                    this.saveBlob(audioOut, fileName);
                    target.classList.add("green_button");
                    target.textContent = text;
                }
            });
        }
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