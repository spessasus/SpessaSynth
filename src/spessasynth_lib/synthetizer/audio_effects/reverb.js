import { reverbBufferBinary } from "./reverb_as_binary.js";

/**
 * Creates a reverb processor
 * @param context {BaseAudioContext}
 * @param reverbBuffer {AudioBuffer}
 * @returns {{conv: ConvolverNode, promise: Promise<AudioBuffer>}}
 */
export function getReverbProcessor(context, reverbBuffer = undefined)
{
    let solve;
    /**
     * @type {Promise<AudioBuffer>}
     */
    let promise = new Promise(r => solve = r);
    const convolver = context.createConvolver();
    if (reverbBuffer)
    {
        convolver.buffer = reverbBuffer;
        solve();
    }
    else
    {
        // decode
        promise = context.decodeAudioData(reverbBufferBinary.slice(0));
        promise.then(b =>
        {
            convolver.buffer = b;
        });
    }
    return {
        conv: convolver,
        promise: promise
    };
}