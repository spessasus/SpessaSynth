import { IndexedByteArray } from "../utils/indexed_array.js";
import { readBytesAsString } from "../utils/byte_functions/string.js";
import { DLSSoundFont } from "./dls/dls_soundfont.js";
import { SoundFont2 } from "./read_sf2/soundfont.js";

/**
 * Loads a soundfont file
 * @param buffer {ArrayBuffer}
 * @returns {BasicSoundBank}
 */
export function loadSoundFont(buffer)
{
    const check = buffer.slice(8, 12);
    const a = new IndexedByteArray(check);
    const id = readBytesAsString(a, 4, undefined, false).toLowerCase();
    if (id === "dls ")
    {
        return new DLSSoundFont(buffer);
    }
    return new SoundFont2(buffer, false);
}