import { rbCompressed } from "./rb_compressed.min.js";
import { inflateSync } from "../../externals/fflate/fflate.min.js";

// convert the base64 string to array buffer
const binaryString = atob(rbCompressed);
const binary = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++)
{
    binary[i] = binaryString.charCodeAt(i);
}


/**
 * the reverb is zlib compressed, decompress here
 * @type {ArrayBuffer}
 */
const reverbBufferBinary = inflateSync(binary).buffer;
export { reverbBufferBinary };