import { rb } from "./reverb_buffer.min.js";

const binaryString = atob(rb);
const binary = new Uint8Array(binaryString.length);
for (let i = 0; i < binaryString.length; i++)
{
    binary[i] = binaryString.charCodeAt(i);
}


/**
 * @type {ArrayBuffer}
 */
const reverbBufferBinary = binary.buffer;
export { reverbBufferBinary };