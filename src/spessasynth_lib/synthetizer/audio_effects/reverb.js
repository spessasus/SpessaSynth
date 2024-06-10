/**
 * Creates a reverb processor
 * @param context {BaseAudioContext}
 * @returns {ConvolverNode}
 */
export function getReverbProcessor(context)
{
    const convolver = new ConvolverNode(context);
    // resolve relative url
    const impulseURL = new URL("impulse_response.wav", import.meta.url);
    fetch(impulseURL).then(async response => {
        const data = await response.arrayBuffer();
        convolver.buffer = await context.decodeAudioData(data);
    });
    return convolver;
}