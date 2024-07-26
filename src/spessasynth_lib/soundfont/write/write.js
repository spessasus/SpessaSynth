import { combineArrays, IndexedByteArray } from '../../utils/indexed_array.js'
import { RiffChunk, writeRIFFChunk } from '../read/riff_chunk.js'
import { writeStringAsBytes } from '../../utils/byte_functions/string.js'
import { consoleColors } from '../../utils/other.js'
import { getIGEN } from './igen.js'
import { getSDTA } from './sdta.js'
import { getSHDR } from './shdr.js'
import { getIMOD } from './imod.js'
import { getIBAG } from './ibag.js'
import { getINST } from './inst.js'
import { getPGEN } from './pgen.js'
import { getPMOD } from './pmod.js'
import { getPBAG } from './pbag.js'
import { getPHDR } from './phdr.js'
import { writeWord } from '../../utils/byte_functions/little_endian.js'
import {
    SpessaSynthGroupCollapsed,
    SpessaSynthGroupEnd,
    SpessaSynthInfo,
} from '../../utils/loggin.js'

/**
 * @typedef {Object} SoundFont2WriteOptions
 * @property {boolean} compress - if the soundfont should be compressed with the ogg vorbis codec
 * @property {number} compressionQuality - the vorbis compression quality, from -0.1 to 1
 */

/**
 * @type {SoundFont2WriteOptions}
 */
const DEFAULT_WRITE_OPTIONS = {
    compress: false,
    compressionQuality: 0.5
}

/**
 * Write the soundfont as an .sf2 file. This method is DESTRUCTIVE
 * @this {SoundFont2}
 * @param {SoundFont2WriteOptions} options
 * @returns {Uint8Array}
 */
export function write(options = DEFAULT_WRITE_OPTIONS)
{
    SpessaSynthGroupCollapsed("%cSaving soundfont...",
        consoleColors.info);
    SpessaSynthInfo(`%cCompression: %c${options?.compress || "false"}%c quality: %c${options?.compressionQuality || "none"}`,
        consoleColors.info,
        consoleColors.recognized,
        consoleColors.info,
        consoleColors.recognized)
    SpessaSynthInfo("%cWriting INFO...",
        consoleColors.info);
    /**
     * Write INFO
     * @type {IndexedByteArray[]}
     */
    const infoArrays = [];
    this.soundFontInfo["ISFT"] = "SpessaSynth"; // ( ͡° ͜ʖ ͡°)
    if(options?.compress)
    {
        this.soundFontInfo["ifil"] = "3.0"; // set version to 3
    }
    for (const [type, data] of Object.entries(this.soundFontInfo))
    {
        if(type === "ifil" || type === "iver")
        {
            const major= parseInt(data.split(".")[0]);
            const minor= parseInt(data.split(".")[1]);
            const ckdata = new IndexedByteArray(4);
            writeWord(ckdata, major);
            writeWord(ckdata, minor);
            infoArrays.push(writeRIFFChunk(new RiffChunk(
                type,
                4,
                ckdata
            )));
        }
        else
        {
            const arr = new IndexedByteArray(data.length);
            writeStringAsBytes(arr, data);
            infoArrays.push(writeRIFFChunk(new RiffChunk(
                type,
                data.length,
                arr
            )));
        }
    }
    const combined = combineArrays([
        new IndexedByteArray([73, 78, 70, 79]), // INFO
        ...infoArrays
    ]);
    const infoChunk = writeRIFFChunk(new RiffChunk("LIST", combined.length, combined));

    SpessaSynthInfo("%cWriting SDTA...",
        consoleColors.info);
    // write sdata
    const smplStartOffsets = [];
    const smplEndOffsets = [];
    const sdtaChunk = getSDTA.bind(this)(smplStartOffsets, smplEndOffsets, options?.compress, options?.compressionQuality || 0.5);

    SpessaSynthInfo("%cWriting PDTA...",
        consoleColors.info);
    // write pdata
    // go in reverse so the indexes are correct
    // instruments
    SpessaSynthInfo("%cWriting SHDR...",
        consoleColors.info);
    const shdrChunk = getSHDR.bind(this)(smplStartOffsets, smplEndOffsets);
    SpessaSynthInfo("%cWriting IGEN...",
        consoleColors.info);
    const igenChunk = getIGEN.bind(this)();
    SpessaSynthInfo("%cWriting IMOD...",
        consoleColors.info);
    const imodChunk = getIMOD.bind(this)();
    SpessaSynthInfo("%cWriting IBAG...",
        consoleColors.info);
    const ibagChunk = getIBAG.bind(this)();
    SpessaSynthInfo("%cWriting INST...",
        consoleColors.info);
    const instChunk = getINST.bind(this)();
    // presets
    const pgenChunk = getPGEN.bind(this)();
    SpessaSynthInfo("%cWriting PMOD...",
        consoleColors.info);
    const pmodChunk = getPMOD.bind(this)();
    SpessaSynthInfo("%cWriting PBAG...",
        consoleColors.info);
    const pbagChunk = getPBAG.bind(this)();
    SpessaSynthInfo("%cWriting PHDR...",
        consoleColors.info);
    const phdrChunk = getPHDR.bind(this)();
    // combine in the sfspec order
    const pdtadata = combineArrays([
        new IndexedByteArray([112, 100, 116, 97]), // "ptda"
        phdrChunk,
        pbagChunk,
        pmodChunk,
        pgenChunk,
        instChunk,
        ibagChunk,
        imodChunk,
        igenChunk,
        shdrChunk
    ]);
    const pdtaChunk = writeRIFFChunk(new RiffChunk(
        "LIST",
        pdtadata.length,
        pdtadata
    ));
    SpessaSynthInfo("%cWriting the output file...",
        consoleColors.info);
    // finally, combine everything
    const riffdata = combineArrays([
        new IndexedByteArray([115, 102, 98, 107]), // "sfbk"
        infoChunk,
        sdtaChunk,
        pdtaChunk
    ]);

    const main = writeRIFFChunk(new RiffChunk(
        "RIFF",
        riffdata.length,
        riffdata
    ));
    SpessaSynthInfo(`%cSaved succesfully! Final file size: %c${main.length}`,
        consoleColors.info,
        consoleColors.recognized)
    SpessaSynthGroupEnd();
    return main;
}