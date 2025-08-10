import { consoleColors } from "../../utils/console_colors.js";
import { closeNotification, showNotification } from "../../notification/notification.js";
import { ANIMATION_REFLOW_TIME } from "../../utils/animation_utils.js";

/**
 * @this {Manager}
 * @returns {Promise<void>}
 * @private
 */
export async function _exportRMIDI()
{
    /**
     * @param type {string}
     * @param def {string}
     * @param decoder {TextDecoder}
     * @return {string}
     */
    const verifyDecode = (type, def, decoder) =>
    {
        return this.seq.midiData.RMIDInfo?.[type] === undefined ? def : decoder.decode(this.seq.midiData.RMIDInfo?.[type].buffer)
            .replace(/\0$/, "");
    };
    const encoding = verifyDecode("IENC", "ascii", new TextDecoder());
    const decoder = new TextDecoder(encoding);
    
    const startAlbum = verifyDecode("IPRD", "", decoder);
    const startArtist = verifyDecode("IART", "", decoder);
    const startGenre = verifyDecode("IGNR", "", decoder);
    const startComment = verifyDecode(
        "ICMT",
        "Created using SpessaSynth: https://spessasus.github.io/SpessaSynth",
        decoder
    );
    
    const path = "locale.exportAudio.formats.formats.rmidi.options.";
    const metadataPath = "locale.exportAudio.formats.metadata.";
    const n = showNotification(
        this.localeManager.getLocaleString(path + "title"),
        [
            {
                type: "text",
                textContent: this.localeManager.getLocaleString(path + "description"),
                attributes: {
                    "style": "max-width: 30ch; font-style: italic"
                }
            },
            {
                type: "toggle",
                translatePathTitle: path + "compress",
                attributes: {
                    "compress-toggle": "1"
                }
            },
            {
                type: "range",
                translatePathTitle: path + "quality",
                attributes: {
                    "min": "0",
                    "max": "10",
                    "value": "5"
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
                type: "input",
                translatePathTitle: metadataPath + "comment",
                attributes: {
                    "value": startComment,
                    "name": "comment",
                    "type": "text"
                }
            },
            {
                type: "file",
                translatePathTitle: metadataPath + "albumCover",
                attributes: {
                    "value": this.seq.midiData.RMIDInfo?.IPIC !== undefined ? this.seq.midiData.RMIDInfo.IPIC : "",
                    "name": "cover",
                    "accept": "image/*"
                }
            },
            {
                type: "input",
                translatePathTitle: path + "bankOffset",
                attributes: {
                    "value": this.extraBankOffset ?? this.seq.midiData.bankOffset,
                    "name": "bank_offset",
                    "type": "number"
                }
            },
            {
                type: "toggle",
                translatePathTitle: path + "adjust",
                attributes: {
                    "name": "adjust"
                }
            },
            {
                type: "button",
                textContent: this.localeManager.getLocaleString(path + "confirm"),
                onClick: async n =>
                {
                    const compressed = n.div.querySelector("input[compress-toggle='1']").checked;
                    const quality = parseInt(n.div.querySelector("input[type='range']").value) / 10;
                    const album = n.div.querySelector("input[name='album']").value;
                    const artist = n.div.querySelector("input[name='artist']").value;
                    const songTitle = n.div.querySelector("input[name='song_title']").value;
                    const comment = n.div.querySelector("input[name='comment']").value;
                    const genre = n.div.querySelector("input[name='genre']").value;
                    const bankOffset = parseInt(n.div.querySelector("input[name='bank_offset']").value);
                    const adjust = n.div.querySelector("input[name='adjust']").checked;
                    
                    /**
                     * @type {File}
                     */
                    const picture = n.div.querySelector("input[type='file']")?.files[0];
                    closeNotification(n.id);
                    
                    console.groupCollapsed(
                        "%cExporting RMIDI...",
                        consoleColors.info
                    );
                    const localePath = "locale.exportAudio.formats.formats.rmidi.progress.";
                    const notification = showNotification(
                        this.localeManager.getLocaleString(localePath + "title"),
                        [{
                            type: "text",
                            textContent: this.localeManager.getLocaleString(localePath + "loading"),
                            attributes: {
                                "class": "export_rmidi_message"
                            }
                        }, {
                            type: "progress"
                        }],
                        9999999,
                        false
                    );
                    // allow the notification to show
                    await new Promise(r => setTimeout(r, 500));
                    const message = notification.div.getElementsByClassName("export_rmidi_message")[0];
                    const progressDiv = notification.div.getElementsByClassName("notification_progress")[0];
                    message.textContent = this.localeManager.getLocaleString(localePath + "modifyingMIDI");
                    await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
                    
                    let pictureBuffer = undefined;
                    if (picture?.["type"]?.split("/")[0] === "image")
                    {
                        pictureBuffer = await picture.arrayBuffer();
                    }
                    
                    const modifyingSoundFont = this.localeManager.getLocaleString(localePath + "modifyingSoundfont");
                    
                    // export
                    const mid = await this.synth.exportRMI(
                        compressed,
                        quality,
                        {
                            songTitle,
                            artist,
                            album,
                            bankOffset,
                            picture: pictureBuffer,
                            encoding: this.seqUI.encoding,
                            comment,
                            genre
                        },
                        adjust,
                        (progress) =>
                        {
                            message.textContent = modifyingSoundFont;
                            progressDiv.style.width = `${progress * 100}%`;
                        }
                    );
                    
                    this.saveUrl(mid.url, mid.fileName);
                    message.textContent = this.localeManager.getLocaleString(localePath + "done");
                    closeNotification(notification.id);
                    console.groupEnd();
                }
            }
        ],
        9999999,
        true,
        this.localeManager
    );
    
    const recommended = await this.synth.getRecommendedRMIDIExportSettings();
    
    // compress if the bank is larger than 20MB
    n.div.querySelector("input[compress-toggle='1']").checked = recommended.compress;
    // adjust for the normal bank only
    n.div.querySelector("input[name='adjust']").checked = recommended.adjust;
    
    const input = n.div.querySelector("input[type='file']");
    input.oninput = () =>
    {
        if (input.files[0])
        {
            input.parentElement.firstChild.textContent = input.files[0].name;
        }
    };
}