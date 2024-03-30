import { HALF_PI } from './unit_converter.js'

/**
 * Pans the voice to the given output buffers
 * @param pan {number} 0-1 , 0.5 is middle
 * @param inputBuffer {Float32Array} the input buffer in mono
 * @param output {Float32Array[]} stereo output buffer
 * @param reverb {Float32Array[]} stereo reverb input
 * @param reverbLevel {number} 0 to 1000, the level of reverb to send
 * @param chorus {Float32Array[]} stereo chorus buttfer
 * @param chorusLevel {number} 0 to 1000, the level of chorus to send
 */
export function panVoice(pan, inputBuffer, output, reverb, reverbLevel, chorus, chorusLevel)
{
    if(isNaN(inputBuffer[0]))
    {
        return;
    }
    let panLeft = Math.cos(HALF_PI * pan);
    let panRight = Math.sin(HALF_PI * pan);

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

    if(chorusLevel > 0)
    {
        const chorusLeft = chorus[0];
        const chorusRight = chorus[1];
        const chorusGain = chorusLevel / 1000;
        const chorusLeftGain = panLeft * chorusGain;
        const chorusRightGain = panRight * chorusGain;
        for (let i = 0; i < inputBuffer.length; i++) {
            chorusLeft[i] += chorusLeftGain * inputBuffer[i];
            chorusRight[i] += chorusRightGain * inputBuffer[i];
        }
    }

    const leftChannel = output[0];
    const rightChannel = output[1];
    // panLeft *= dryGain;
    // panRight *= dryGain;
    for (let i = 0; i < inputBuffer.length; i++) {
        leftChannel[i] += panLeft * inputBuffer[i];
        rightChannel[i] += panRight * inputBuffer[i];
    }
}