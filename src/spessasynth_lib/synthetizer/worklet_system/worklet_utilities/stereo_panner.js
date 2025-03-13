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
 * @param reverbLeft {Float32Array} left reverb input
 * @param reverbRight {Float32Array} right reverb input
 * @param chorusLeft {Float32Array} left chorus buffer
 * @param chorusRight {Float32Array} right chorus buffer
 * @this {WorkletProcessorChannel}
 */
export function panVoice(voice,
                         inputBuffer,
                         outputLeft, outputRight,
                         reverbLeft, reverbRight,
                         chorusLeft, chorusRight)
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
        const target = Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan]));
        // smooth out pan to prevent clicking
        voice.currentPan += (target - voice.currentPan) * this.synth.panSmoothingFactor;
        pan = voice.currentPan;
    }
    
    const gain = this.synth.currentGain;
    const index = ~~(pan + 500);
    // get voice's gain levels for each channel
    const gainLeft = panTableLeft[index] * gain * this.synth.panLeft;
    const gainRight = panTableRight[index] * gain * this.synth.panRight;
    
    // disable reverb and chorus in one output mode
    if (!this.synth.oneOutputMode)
    {
        // reverb is mono so we need to multiply by gain
        const reverbLevel = this.synth.reverbGain * voice.modulatedGenerators[generatorTypes.reverbEffectsSend] / WORKLET_SYSTEM_REVERB_DIVIDER * gain;
        // chorus is stereo so we do not need to
        const chorusLevel = this.synth.chorusGain * voice.modulatedGenerators[generatorTypes.chorusEffectsSend] / WORKLET_SYSTEM_CHORUS_DIVIDER;
        
        if (reverbLevel > 0)
        {
            for (let i = 0; i < inputBuffer.length; i++)
            {
                reverbLeft[i] += reverbLevel * inputBuffer[i];
            }
            // copy as its mono
            reverbRight.set(reverbLeft);
        }
        
        if (chorusLevel > 0)
        {
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