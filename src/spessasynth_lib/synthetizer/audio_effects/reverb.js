/**
 * Creates a reverb processor
 * @param context {BaseAudioContext}
 * @param reverbBuffer {AudioBuffer}
 * @returns {ConvolverNode}
 */
export function getReverbProcessor(context, reverbBuffer = undefined)
{
    const convolver = new ConvolverNode(context);
    if(reverbBuffer)
    {
        convolver.buffer = reverbBuffer;
    }
    else
    {
        // resolve relative url
        const impulseURL = new URL("impulse_response_2.flac", import.meta.url);
        fetch(impulseURL).then(async response => {
            const data = await response.arrayBuffer();
            convolver.buffer = await context.decodeAudioData(data);
        });
    }
    return convolver;
}