import { timecentsToSeconds } from './unit_converter.js'
import { generatorTypes } from '../../../soundfont/chunk/generators.js'
import { CONVEX_ATTACK } from './volume_envelope.js'

const PEAK = 1;

/**
 * @param voice {WorkletVoice}
 * @param currentTime {number}
 * @returns {number} from 0 to 1
 */
export function getModEnvValue(voice, currentTime)
{
    // calculate env times
    let attack = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.attackModEnv]);
    let decay = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.decayModEnv] + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToModEnvDecay]));
    let hold = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.holdModEnv] + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToModEnvHold]));

    // calculate absolute times
    if(voice.isInRelease)
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