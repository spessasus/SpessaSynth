import { BasicMIDI, BasicSoundBank, SynthesizerSnapshot } from "spessasynth_core";
import { returnMessageType } from "./worker_message.js";

/**
 * @param isSf2 {boolean}
 * @param trim {boolean}
 * @param compress {boolean}
 * @param quality {number}
 * @this {WorkerSynthEngine}
 * @returns {Promise<{fileName: string, url: string}>}
 */
export async function exportSoundBank(isSf2, trim, compress, quality)
{
    const playing = !this.seqEngine.paused;
    this.stopAudioLoop();
    const sf = new BasicSoundBank({
        presets: this.soundBank.presets,
        info: this.soundBank.soundFontInfo
    });
    if (trim)
    {
        const snapshot = SynthesizerSnapshot.createSynthesizerSnapshot(this.synthEngine);
        const mid = BasicMIDI.copyFrom(this.seqEngine.midiData);
        mid.applySnapshotToMIDI(snapshot);
        sf.trimSoundBank(mid);
    }
    let url, fileName;
    if (isSf2)
    {
        const compressionFunction = (await import("../../../../../externals/encode_vorbis.js")).encodeVorbis;
        /**
         * @param data {Float32Array}
         * @param rate {number}
         * @returns {Promise<Uint8Array>}
         */
        const compressReal = async (data, rate) => compressionFunction([data], rate, quality);
        const bin = await sf.write({
            compress: compress,
            compressionFunction: compressReal,
            progressFunction: (_, i, total) => this.postSyn(returnMessageType.renderingProgress, i / total)
        });
        let extension = sf.soundFontInfo["ifil"].split(".")[0] === "3" ? "sf3" : "sf2";
        fileName = `${sf.soundFontInfo["INAM"] || "unnamed"}.${extension}`;
        
        const blob = new Blob([bin.buffer], { type: "audio/soundfont" });
        url = URL.createObjectURL(blob);
    }
    else
    {
        const bin = await sf.writeDLS({
            progressFunction: (_, i, total) => this.postSyn(returnMessageType.renderingProgress, i / total)
        });
        fileName = `${sf.soundFontInfo["INAM"] || "unnamed"}.dls`;
        const blob = new Blob([bin.buffer], { type: "audio/dls" });
        url = URL.createObjectURL(blob);
        
    }
    
    if (playing)
    {
        this.resumeSeq();
    }
    this.startAudioLoop();
    
    return {
        fileName,
        url
    };
}