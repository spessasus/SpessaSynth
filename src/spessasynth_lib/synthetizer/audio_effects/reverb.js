import { reverbBufferBinary } from "./reverb_as_binary.js";

/**
 * Creates a reverb processor
 * @param context {BaseAudioContext}
 * @param reverbBuffer {AudioBuffer}
 * @returns {ConvolverNode}
 */
export function getReverbProcessor(context, reverbBuffer = undefined)
{
    const convolver = context.createConvolver();
    if (reverbBuffer)
    {
        convolver.buffer = reverbBuffer;
    }
    else
    {
        // decode
        context.decodeAudioData(reverbBufferBinary).then(b =>
        {
            convolver.buffer = b;
        });
    }
    return convolver;
}