import { HALF_PI } from './unit_converter.js'

/**
 * Pans the voice to the given output buffers
 * @param pan {number} 0-1 , 0.5 is middle
 * @param inputBuffer {Float32Array} the input buffer in mono
 * @param outputLeft {Float32Array} stereo left output buffer
 * @param outputRight {Float32Array} stereo right output buffer
 */
export function panVoice(pan, inputBuffer, outputLeft, outputRight)
{
    const panLeft = Math.cos(HALF_PI * pan);
    const panRight = Math.sin(HALF_PI * pan);
    for (let i = 0; i < inputBuffer.length; i++) {
        outputLeft[i] += panLeft * inputBuffer[i];
        outputRight[i] += panRight * inputBuffer[i];
    }
}