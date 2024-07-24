import { closeNotification, showNotification } from '../js/notification/notification.js'
import { Synthetizer } from '../../spessasynth_lib/synthetizer/synthetizer.js'
import { formatTime } from '../../spessasynth_lib/utils/other.js'
import { audioBufferToWav } from '../../spessasynth_lib/utils/buffer_to_wav.js'

const RENDER_AUDIO_TIME_INTERVAL = 1000;

/**
 * @this {Manager}
 * @param normalizeAudio {boolean}
 * @param additionalTime {number}
 * @returns {Promise<void>}
 * @private
 */
export async function _doExporWav(normalizeAudio = true, additionalTime = 2)
{
    this.isExporting = true;
    if(!this.seq)
    {
        throw new Error("No sequencer active");
    }
    // get locales
    const exportingMessage = manager.localeManager.getLocaleString("locale.exportAudio.formats.formats.wav.exportMessage.message");
    const estimatedMessage = manager.localeManager.getLocaleString("locale.exportAudio.formats.formats.wav.exportMessage.estimated");
    const notification = showNotification(
        exportingMessage,
        [
            { type: 'text', textContent: estimatedMessage + " (...)" },
            { type: 'progress' }
        ],
        9999999,
        false
    );
    const parsedMid = await this.seq.getMIDI();
    const duration = parsedMid.duration + additionalTime;
    // prepare audio context
    const offline = new OfflineAudioContext({
        numberOfChannels: 2,
        sampleRate: this.context.sampleRate,
        length: this.context.sampleRate * duration
    });
    const workletURL = new URL("../../spessasynth_lib/synthetizer/worklet_system/worklet_processor.js", import.meta.url).href;
    await offline.audioWorklet.addModule(workletURL);

    /**
     * take snapshot of the real synth
     * @type {SynthesizerSnapshot}
     */
    const snapshot = await this.synth.getSynthesizerSnapshot();

    const soundfont = parsedMid.embeddedSoundFont || this.soundFont;
    /**
     * Prepare synthesizer
     * @type {Synthetizer}
     */
    let synth;
    try
    {
        synth = new Synthetizer(offline.destination, soundfont, false, {
            parsedMIDI: parsedMid,
            snapshot: snapshot
        }, {
            reverbEnabled: true,
            chorusEnabled: true,
            chorusConfig: undefined,
            reverbImpulseResponse: this.impulseResponse
        });
    }
    catch (e)
    {
        showNotification(
            this.localeManager.getLocaleString("locale.warnings.warning"),
            [{
                type: "text",
                textContent: this.localeManager.getLocaleString("locale.warnings.outOfMemory")
            }]
        )
        throw e;
    }

    const detailMessage = notification.div.getElementsByTagName("p")[0];
    const progressDiv = notification.div.getElementsByClassName("notification_progress")[0];

    const RATI_SECONDS = RENDER_AUDIO_TIME_INTERVAL / 1000;
    let rendered = synth.currentTime;
    let estimatedTime = duration;
    const smoothingFactor = 0.1; // for smoothing estimated time

    const interval = setInterval(() => {
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
        detailMessage.innerText = `${estimatedMessage} ${formatTime(estimatedTime).time}`
    }, RENDER_AUDIO_TIME_INTERVAL);

    const buf = await offline.startRendering();
    progressDiv.style.width = "100%";
    // clear intervals and save file
    clearInterval(interval);
    closeNotification(notification.id);
    this.saveBlob(audioBufferToWav(buf, normalizeAudio), `${window.manager.seq.midiData.midiName || 'unnamed_song'}.wav`)
    this.isExporting = false;
}

/**
 * @this {Manager}
 * @returns {Promise<void>}
 * @private
 */
export async function _exportWav()
{
    if(this.isExporting)
    {
        return;
    }
    const path = "locale.exportAudio.formats.formats.wav.options.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "toggle",
                translatePathTitle: path + "normalizeVolume",
                attributes: {
                    "normalize-volume-toggle": "1",
                    "checked": "true"
                }
            },
            {
                type: "input",
                translatePathTitle: path + "additionalTime",
                attributes: {
                    "value": "2",
                    "type": "number"
                }
            },
            {
                type: "button",
                textContent: this.localeManager.getLocaleString(path + "confirm"),
                onClick: n => {
                    closeNotification(n.id);
                    const normalizeVolume = n.div.querySelector("input[normalize-volume-toggle='1']").checked;
                    const additionalTime = n.div.querySelector("input[type='number']").value;
                    this._doExportWav(normalizeVolume, parseInt(additionalTime));
                }
            }
        ],
        9999999,
        true,
        this.localeManager
    );
}