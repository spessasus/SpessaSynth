import { closeNotification, showNotification } from '../notification/notification.js'

/**
 * @this {Manager}
 * @returns {Promise<void>}
 */
export async function exportSong()
{
    const path = "locale.exportAudio.formats.";
    showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "button",
                translatePathTitle: path + "formats.wav.button",
                onClick: n => {
                    closeNotification(n.id);
                    this._exportAudioData();
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.midi.button",
                onClick: n => {
                    closeNotification(n.id);
                    this.exportMidi();
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.soundfont.button",
                onClick: n => {
                    closeNotification(n.id);
                    try
                    {
                        this._exportSoundfont();
                    }
                    catch (e)
                    {
                        showNotification(
                            "Warning",
                            [{
                                type: "text",
                                textContent: this.localeManager.getLocaleString("locale.warnings.outOfMemory")
                            }]
                        );
                    }
                }
            },
            {
                type: "button",
                translatePathTitle: path + "formats.rmidi.button",
                onClick: n => {
                    closeNotification(n.id);
                    try
                    {
                        this._exportRMIDI();
                    }
                    catch (e)
                    {
                        showNotification(
                            "Warning",
                            [{
                                type: "text",
                                textContent: this.localeManager.getLocaleString("locale.warnings.outOfMemory")
                            }]
                        );
                    }
                }
            }
        ],
        999999,
        true,
        this.localeManager,
        {
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center"
        }
    )
}