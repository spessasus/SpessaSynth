import { timecentsToSeconds } from './unit_converter.js'
import { generatorTypes } from '../../../soundfont/read/generators.js'
import { getModulatorCurveValue } from './modulator_curves.js'
import { modulatorCurveTypes } from '../../../soundfont/read/modulators.js'

/**
 * modulation_envelope.js
 * purpose: calculates the modulation envelope for the given voice
 */
const PEAK = 1;

// 1000 should be precise enough
const CONVEX_ATTACK = new Float32Array(1000);
for (let i = 0; i < CONVEX_ATTACK.length; i++) {
    // this makes the db linear ( i think
    CONVEX_ATTACK[i] = getModulatorCurveValue(0, modulatorCurveTypes.convex, i / 1000, 0);
}

/**
 * Calculates the current modulation envelope value for the given time and voice
 * @param voice {WorkletVoice} the voice we're working on
 * @param currentTime {number} in seconds
 * @returns {number} modenv value, from 0 to 1
 */
export function getModEnvValue(voice, currentTime)
{
    // calculate env times
    let attack = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.attackModEnv]);
    let decay = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.decayModEnv] + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToModEnvDecay]));
    let hold = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.holdModEnv] + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToModEnvHold]));

    // calculate absolute times
    if(voice.isInRelease && voice.releaseStartTime < currentTime)
    {
        let release = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.releaseModEnv]);
        if(voice.modulatedGenerators[generatorTypes.releaseModEnv] < -7199)
        {
            // prevent lowpass bugs if release is instant
            return voice.releaseStartModEnv;
        }
        return (1 - (currentTime - voice.releaseStartTime) / release) * voice.releaseStartModEnv;
    }

    let sustain = 1 - (voice.modulatedGenerators[generatorTypes.sustainModEnv] / 1000);
    let delayEnd  = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayModEnv]) + voice.startTime;
    let attackEnd = attack + delayEnd;
    let holdEnd = hold + attackEnd;
    let decayEnd = decay + holdEnd;

    let modEnvVal
    if(currentTime < delayEnd)
    {
        modEnvVal = 0; // delay
    }
    else if(currentTime < attackEnd)
    {
        modEnvVal = CONVEX_ATTACK[~~((1 - (attackEnd - currentTime) / attack) * 1000)]; // convex attack
    }
    else if(currentTime < holdEnd)
    {
        modEnvVal = PEAK; // peak
    }
    else if(currentTime < decayEnd)
    {
        modEnvVal = (1 - (decayEnd - currentTime) / decay) * (sustain - PEAK) + PEAK; // decay
    }
    else
    {
        modEnvVal = sustain; // sustain
    }
    voice.currentModEnvValue = modEnvVal;
    return modEnvVal;
}