export const WORKLET_SYSTEM_REVERB_DIVIDER = 500;
export const WORKLET_SYSTEM_CHORUS_DIVIDER = 500;
/**
 * stereo_panner.js
 * purpose: pans a given voice out to the stereo output and to the effects' outputs
 */

/**
 * Pans the voice to the given output buffers
 * @param gainLeft {number} the left channel gain
 * @param gainRight {number} the right channel gain
 * @param inputBuffer {Float32Array} the input buffer in mono
 * @param output {Float32Array[]} stereo output buffer
 * @param reverb {Float32Array[]} stereo reverb input
 * @param reverbLevel {number} 0 to 1000, the level of reverb to send
 * @param chorus {Float32Array[]} stereo chorus buttfer
 * @param chorusLevel {number} 0 to 1000, the level of chorus to send
 */
export function panVoice(gainLeft,
                         gainRight,
                         inputBuffer,
                         output,
                         reverb,
                         reverbLevel,
                         chorus,
                         chorusLevel)
{
    if(isNaN(inputBuffer[0]))
    {
        return;
    }

    if(reverbLevel > 0)
    {
        const reverbLeft = reverb[0];
        const reverbRight = reverb[1];
        // cap reverb
        reverbLevel = Math.min(reverbLevel, 1000);
        const reverbGain = reverbLevel / WORKLET_SYSTEM_REVERB_DIVIDER;
        const reverbLeftGain = gainLeft * reverbGain;
        const reverbRightGain = gainRight * reverbGain;
        for (let i = 0; i < inputBuffer.length; i++) {
            reverbLeft[i] += reverbLeftGain * inputBuffer[i];
            reverbRight[i] += reverbRightGain * inputBuffer[i];
        }
    }

    if(chorusLevel > 0)
    {
        const chorusLeft = chorus[0];
        const chorusRight = chorus[1];
        // cap chorus
        chorusLevel = Math.min(chorusLevel, 1000);
        const chorusGain = chorusLevel / WORKLET_SYSTEM_CHORUS_DIVIDER;
        const chorusLeftGain = gainLeft * chorusGain;
        const chorusRightGain = gainRight * chorusGain;
        for (let i = 0; i < inputBuffer.length; i++) {
            chorusLeft[i] += chorusLeftGain * inputBuffer[i];
            chorusRight[i] += chorusRightGain * inputBuffer[i];
        }
    }

    const leftChannel = output[0];
    const rightChannel = output[1];
    if(gainLeft > 0)
    {
        for (let i = 0; i < inputBuffer.length; i++) {
            leftChannel[i] += gainLeft * inputBuffer[i];
        }
    }
    if(gainRight > 0) {
        for (let i = 0; i < inputBuffer.length; i++) {
            rightChannel[i] += gainRight * inputBuffer[i];
        }
    }
}