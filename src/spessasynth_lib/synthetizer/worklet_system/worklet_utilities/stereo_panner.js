import { HALF_PI } from './unit_converter.js'

/**
 * Pans the voice to the given output buffers
 * @param pan {number} 0-1 , 0.5 is middle
 * @param inputBuffer {Float32Array} the input buffer in mono
 * @param outputLeft {Float32Array} stereo left output buffer
 * @param outputRight {Float32Array} stereo right output buffer
 * @param reverbLeft {Float32Array} stereo left reverb input
 * @param reverbRight {Float32Array} stereo right reverb input
 * @param reverbLevel {number} 0 to 1000, the level of reverb to send
 */
export function panVoice(pan, inputBuffer, outputLeft, outputRight, reverbLeft, reverbRight, reverbLevel)
{
    if(isNaN(inputBuffer[0]))
    {
        return;
    }
    const panLeft = Math.cos(HALF_PI * pan);
    const panRight = Math.sin(HALF_PI * pan);
    for (let i = 0; i < inputBuffer.length; i++) {
        outputLeft[i] += panLeft * inputBuffer[i];
        outputRight[i] += panRight * inputBuffer[i];
    }
    if(reverbLevel > 0)
    {
        const reverbGain = reverbLevel / 1000;
        const reverbLeftGain = panLeft * reverbGain;
        const reverbRightGain = panRight * reverbGain;
        for (let i = 0; i < inputBuffer.length; i++) {
            reverbLeft[i] += reverbLeftGain * inputBuffer[i];
            reverbRight[i] += reverbRightGain * inputBuffer[i];
        }
    }
}