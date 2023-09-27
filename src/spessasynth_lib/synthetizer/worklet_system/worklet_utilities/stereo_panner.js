import { HALF_PI } from './unit_converter.js'

/**
 * @param pan {number} 0-1
 * @param inputBuffer {Float32Array}
 * @param outputLeft {Float32Array}
 * @param outputRight {Float32Array}
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