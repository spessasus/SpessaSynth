import { generatorTypes } from "../../../soundfont/basic_soundfont/generator.js";

/**
 * stereo_panner.js
 * purpose: pans a given voice out to the stereo output and to the effects' outputs
 */

export const PAN_SMOOTHING_FACTOR = 0.1;

export const WORKLET_SYSTEM_REVERB_DIVIDER = 4600;
export const WORKLET_SYSTEM_CHORUS_DIVIDER = 2000;
const HALF_PI = Math.PI / 2;

const MIN_PAN = -500;
const MAX_PAN = 500;
const PAN_RESOLUTION = MAX_PAN - MIN_PAN;

// initialize pan lookup tables
const panTableLeft = new Float32Array(PAN_RESOLUTION + 1);
const panTableRight = new Float32Array(PAN_RESOLUTION + 1);
for (let pan = MIN_PAN; pan <= MAX_PAN; pan++)
{
    // clamp to 0-1
    const realPan = (pan - MIN_PAN) / PAN_RESOLUTION;
    const tableIndex = pan - MIN_PAN;
    panTableLeft[tableIndex] = Math.cos(HALF_PI * realPan);
    panTableRight[tableIndex] = Math.sin(HALF_PI * realPan);
}

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
    /**
     * clamp -500 to 500
     * @type {number}
     */
    let pan;
    if (voice.overridePan)
    {
        pan = voice.overridePan;
    }
    else
    {
        pan = Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan]));
        // smooth out pan to prevent clicking
        voice.currentPan += (pan - voice.currentPan) * this.panSmoothingFactor;
    }
    
    const gain = this.currentGain;
    const index = ~~(pan + 500);
    // get voice's gain levels for each channel
    const gainLeft = panTableLeft[index] * gain * this.panLeft;
    const gainRight = panTableRight[index] * gain * this.panRight;
    
    // disable reverb and chorus in one output mode
    if (!this.oneOutputMode)
    {
        // reverb is mono so we need to multiply by gain
        const reverbLevel = this.reverbGain * voice.modulatedGenerators[generatorTypes.reverbEffectsSend] / WORKLET_SYSTEM_REVERB_DIVIDER * gain;
        // chorus is stereo so we do not need to
        const chorusLevel = this.chorusGain * voice.modulatedGenerators[generatorTypes.chorusEffectsSend] / WORKLET_SYSTEM_CHORUS_DIVIDER;
        
        if (reverbLevel > 0)
        {
            const reverbLeft = reverb[0];
            const reverbRight = reverb[1];
            for (let i = 0; i < inputBuffer.length; i++)
            {
                reverbLeft[i] += reverbLevel * inputBuffer[i];
                reverbRight[i] += reverbLevel * inputBuffer[i];
            }
        }
        
        if (chorusLevel > 0)
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
    }
    
    // mix down the audio data
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