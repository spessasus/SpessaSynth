import { generatorTypes } from "../../../soundfont/basic_soundfont/generator.js";

export const WORKLET_SYSTEM_REVERB_DIVIDER = 4600;
export const WORKLET_SYSTEM_CHORUS_DIVIDER = 2000;
const HALF_PI = Math.PI / 2;

/**
 * stereo_panner.js
 * purpose: pans a given voice out to the stereo output and to the effects' outputs
 */

/**
 * Pans the voice to the given output buffers
 * @param voice {WorkletVoice} the voice to pan
 * @param inputBuffer {Float32Array} the input buffer in mono
 * @param outputLeft {Float32Array} left output buffer
 * @param outputRight {Float32Array} right output buffer
 * @param reverb {Float32Array[]} stereo reverb input
 * @param chorus {Float32Array[]} stereo chorus buffer
 * @this {SpessaSynthProcessor}
 */
export function panVoice(voice,
                         inputBuffer,
                         outputLeft, outputRight,
                         reverb,
                         chorus)
{
    if (isNaN(inputBuffer[0]))
    {
        return;
    }
    const pan = ((Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan])) + 500) / 1000); // 0 to 1
    voice.currentPan += (pan - voice.currentPan) * this.panSmoothingFactor; // smooth out pan to prevent clicking
    
    const gain = this.currentGain;
    // pan the voice and write out
    const gainLeft = Math.cos(HALF_PI * voice.currentPan) * gain * this.panLeft;
    const gainRight = Math.sin(HALF_PI * voice.currentPan) * gain * this.panRight;
    // disable reverb and chorus in one output mode
    
    const reverbLevel = voice.modulatedGenerators[generatorTypes.reverbEffectsSend] / WORKLET_SYSTEM_REVERB_DIVIDER * gain;
    const chorusLevel = voice.modulatedGenerators[generatorTypes.chorusEffectsSend] / WORKLET_SYSTEM_CHORUS_DIVIDER;
    
    if (reverbLevel > 0 && !this.oneOutputMode)
    {
        const reverbLeft = reverb[0];
        const reverbRight = reverb[1];
        for (let i = 0; i < inputBuffer.length; i++)
        {
            reverbLeft[i] += reverbLevel * inputBuffer[i];
            reverbRight[i] += reverbLevel * inputBuffer[i];
        }
    }
    
    if (chorusLevel > 0 && !this.oneOutputMode)
    {
        const chorusLeft = chorus[0];
        const chorusRight = chorus[1];
        const chorusLeftGain = gainLeft * chorusLevel;
        const chorusRightGain = gainRight * chorusLevel;
        for (let i = 0; i < inputBuffer.length; i++)
        {
            chorusLeft[i] += chorusLeftGain * inputBuffer[i];
            chorusRight[i] += chorusRightGain * inputBuffer[i];
        }
    }
    
    // mix out the audio data
    if (gainLeft > 0)
    {
        for (let i = 0; i < inputBuffer.length; i++)
        {
            outputLeft[i] += gainLeft * inputBuffer[i];
        }
    }
    if (gainRight > 0)
    {
        for (let i = 0; i < inputBuffer.length; i++)
        {
            outputRight[i] += gainRight * inputBuffer[i];
        }
    }
}