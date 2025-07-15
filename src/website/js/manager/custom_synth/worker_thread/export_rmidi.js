import { BasicMIDI, BasicSoundBank, loadSoundFont, SynthesizerSnapshot } from "spessasynth_core";
import { returnMessageType } from "./worker_message.js";

/**
 * @typedef {Object} RMIDIMetadata
 * @prop {number} bankOffset
 * @prop {string} songTitle
 * @prop {string} album
 * @prop {string} artist
 * @prop {string} comment
 * @prop {string} genre
 * @prop {string} encoding
 * @prop {ArrayBuffer} picture
 */

/**
 * @param compress {boolean}
 * @param quality {number}
 * @param metadata {Partial<RMIDIMetadata>}
 * @param adjust {boolean}
 * @this {WorkerSynthEngine}
 * @returns {promise<{fileName: string, url: string}>}
 */
export async function exportRMIDI(compress, quality, metadata, adjust)
{
    const playing = !this.seqEngine.paused;
    this.stopAudioLoop();
    const mid = BasicMIDI.copyFromDeep(this.seqEngine.midiData);
    // pick a bank:
    // if midi has an embedded bank, use that
    // if we have an extra bank, use that
    // otherwise pick the normal bank
    const fontBuffer = mid.embeddedSoundFont || this.extraSoundBank || this.soundBank;
    try
    {
        mid.applySnapshotToMIDI(SynthesizerSnapshot.createSynthesizerSnapshot(this.synthEngine));
    }
    catch (e)
    {
        console.warn("Failed to modify MIDI:", e);
    }
    
    /**
     * @type {BasicSoundBank}
     */
    const font = fontBuffer instanceof ArrayBuffer ? loadSoundFont(fontBuffer) : fontBuffer;
    
    if (adjust)
    {
        font.trimSoundBank(mid);
    }
    
    // write soundfont
    const compressionFunction = (await import("../../../../../externals/encode_vorbis.js")).encodeVorbis;
    /**
     * @param data {Float32Array}
     * @param rate {number}
     * @returns {Promise<Uint8Array>}
     */
    const compressReal = async (data, rate) => compressionFunction([data], rate, quality);
    const soundFontBinary = await font.write({
        compress: compress,
        compressionFunction: compressReal,
        progressFunction: (_, i, total) => this.postSyn(returnMessageType.renderingProgress, i / total)
    });
    
    let pictureBuffer = metadata?.picture;
    if (!pictureBuffer && mid.RMIDInfo?.["IPIC"] !== undefined)
    {
        pictureBuffer = mid.RMIDInfo?.["IPIC"].buffer;
    }
    
    const todayISO8601 = (new Date()).toISOString().split("T")[0];
    
    // export modified midi and write out
    const file = mid.writeRMIDI(
        soundFontBinary,
        font,
        metadata?.bankOffset || 0,
        metadata?.encoding || "UTF-8",
        {
            name: metadata?.songTitle,
            comment: metadata?.comment,
            engineer: font?.soundFontInfo["IENG"],
            picture: pictureBuffer,
            album: metadata?.album,
            artist: metadata?.artist,
            genre: metadata?.genre,
            midiEncoding: metadata?.encoding,
            creationDate: todayISO8601
        },
        adjust
    );
    const blob = new Blob([file], { type: "audio/mid" });
    const url = URL.createObjectURL(blob);
    if (playing)
    {
        this.resumeSeq();
    }
    this.startAudioLoop();
    return {
        url,
        fileName: `${metadata?.songTitle || "unnamed_song"}.rmi`
    };
}