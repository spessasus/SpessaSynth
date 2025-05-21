import { consoleColors } from "../utils/console_colors.js";
import { closeNotification, showNotification } from "../notification/notification.js";
import { loadSoundFont } from "spessasynth_core";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";

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
        return this.seq.midiData.RMIDInfo?.[type] === undefined ? def : decoder.decode(this.seq.midiData.RMIDInfo?.[type])
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
    
    // get the MIDI and pick the bank now to improve recommended settings
    const mid = await this.seq.getMIDI();
    // pick a bank:
    // if midi has an embedded bank, use that
    // if we have an extra bank, use that
    // otherwise pick the normal bank
    const fontBuffer = mid.embeddedSoundFont || this.extraBankBuffer || this.soundFont;
    
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
                        }],
                        9999999,
                        false
                    );
                    // allow the notification to show
                    await new Promise(r => setTimeout(r, 500));
                    const message = notification.div.getElementsByClassName("export_rmidi_message")[0];
                    
                    const font = loadSoundFont(fontBuffer);
                    
                    message.textContent = this.localeManager.getLocaleString(localePath + "modifyingMIDI");
                    await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
                    
                    try
                    {
                        mid.applySnapshotToMIDI(await this.synth.getSynthesizerSnapshot());
                    }
                    catch (e)
                    {
                        console.warn("Failed to modify MIDI:", e);
                    }
                    
                    message.textContent = this.localeManager.getLocaleString(localePath + "modifyingSoundfont");
                    await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
                    
                    font.trimSoundBank(mid);
                    const newFont = font.write({
                        compress: compressed,
                        compressionQuality: quality,
                        compressionFunction: await this.getVorbisEncodeFunction()
                    });
                    
                    message.textContent = this.localeManager.getLocaleString(localePath + "saving");
                    await new Promise(r => setTimeout(r, ANIMATION_REFLOW_TIME));
                    
                    let fileBuffer = undefined;
                    if (picture?.type.split("/")[0] === "image")
                    {
                        fileBuffer = await picture.arrayBuffer();
                    }
                    else if (mid.RMIDInfo?.["IPIC"] !== undefined)
                    {
                        fileBuffer = mid.RMIDInfo["IPIC"].buffer;
                    }
                    
                    const rmidBinary = mid.writeRMIDI(
                        newFont,
                        font,
                        bankOffset,
                        this.seqUI.encoding,
                        {
                            name: songTitle,
                            comment: comment,
                            engineer: font.soundFontInfo["IENG"], // use soundfont engineer
                            picture: fileBuffer,
                            album: album.length > 0 ? album : undefined,
                            artist: artist.length > 0 ? artist : undefined,
                            genre: genre.length > 0 ? genre : undefined,
                            midiEncoding: this.seqUI.encoding // use the selected encoding
                        },
                        adjust
                    );
                    const blob = new Blob([rmidBinary.buffer], { type: "audio/rmid" });
                    this.saveBlob(blob, `${songTitle || "unnamed_song"}.rmi`);
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
    
    // compress if the bank is larger than 20MB
    n.div.querySelector("input[compress-toggle='1']").checked = fontBuffer.byteLength > 1024 * 1024 * 20;
    // adjust for the normal bank only
    n.div.querySelector("input[name='adjust']").checked = fontBuffer === this.soundFont;
    
    const input = n.div.querySelector("input[type='file']");
    input.oninput = () =>
    {
        if (input.files[0])
        {
            input.parentElement.firstChild.textContent = input.files[0].name;
        }
    };
}