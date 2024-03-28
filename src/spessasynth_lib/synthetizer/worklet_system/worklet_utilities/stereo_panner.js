import { HALF_PI } from './unit_converter.js'

/**
 * Pans the voice to the given output buffers
 * @param pan {number} 0-1 , 0.5 is middle
 * @param inputBuffer {Float32Array} the input buffer in mono
 * @param output {Float32Array[]} stereo output buffer
 * @param reverb {Float32Array[]} stereo reverb input
 * @param reverbLevel {number} 0 to 1000, the level of reverb to send
 */
export function panVoice(pan, inputBuffer, output, reverb, reverbLevel)
{
    if(isNaN(inputBuffer[0]))
    {
        return;
    }
    const leftChannel = output[0];
    const rightChannel = output[1];
    const panLeft = Math.cos(HALF_PI * pan);
    const panRight = Math.sin(HALF_PI * pan);
    for (let i = 0; i < inputBuffer.length; i++) {
        leftChannel[i] += panLeft * inputBuffer[i];
        rightChannel[i] += panRight * inputBuffer[i];
    }
    if(reverbLevel > 0)
    {
        const reverbLeft = reverb[0];
        const reverbRight = reverb[1];
        const reverbGain = reverbLevel / 1000;
        const reverbLeftGain = panLeft * reverbGain;
        const reverbRightGain = panRight * reverbGain;
        for (let i = 0; i < inputBuffer.length; i++) {
            reverbLeft[i] += reverbLeftGain * inputBuffer[i];
            reverbRight[i] += reverbRightGain * inputBuffer[i];
        }
    }
}