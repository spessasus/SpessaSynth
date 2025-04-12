import { timecentsToSeconds } from "./unit_converter.js";
import { getModulatorCurveValue } from "./modulator_curves.js";
import { generatorTypes } from "../../../soundfont/basic_soundfont/generator.js";
import { modulatorCurveTypes } from "../../../soundfont/basic_soundfont/modulator.js";

/**
 * modulation_envelope.js
 * purpose: calculates the modulation envelope for the given voice
 */
const MODENV_PEAK = 1;

// 1000 should be precise enough
const CONVEX_ATTACK = new Float32Array(1000);
for (let i = 0; i < CONVEX_ATTACK.length; i++)
{
    // this makes the db linear (I think)
    CONVEX_ATTACK[i] = getModulatorCurveValue(0, modulatorCurveTypes.convex, i / 1000, 0);
}

export class ModulationEnvelope
{
    /**
     * The attack duration, in seconds
     * @type {number}
     */
    attackDuration = 0;
    /**
     * The decay duration, in seconds
     * @type {number}
     */
    decayDuration = 0;
    
    /**
     * The hold duration, in seconds
     * @type {number}
     */
    holdDuration = 0;
    
    /**
     * Release duration, in seconds
     * @type {number}
     */
    releaseDuration = 0;
    
    /**
     * The sustain level 0-1
     * @type {number}
     */
    sustainLevel = 0;
    
    /**
     * Delay phase end time in seconds, absolute (audio context time)
     * @type {number}
     */
    delayEnd = 0;
    /**
     * Attack phase end time in seconds, absolute (audio context time)
     * @type {number}
     */
    attackEnd = 0;
    /**
     * Hold phase end time in seconds, absolute (audio context time)
     * @type {number}
     */
    holdEnd = 0;
    /**
     * Decay phase end time in seconds, absolute (audio context time)
     * @type {number}
     */
    decayEnd = 0;
    
    /**
     * The level of the envelope when the release phase starts
     * @type {number}
     */
    releaseStartLevel = 0;
    
    /**
     * The current modulation envelope value
     * @type {number}
     */
    currentValue = 0;
    
    /**
     * Starts the release phase in the envelope
     * @param voice {Voice} the voice this envelope belongs to
     */
    static startRelease(voice)
    {
        ModulationEnvelope.recalculate(voice);
    }
    
    /**
     * @param voice {Voice} the voice to recalculate
     */
    static recalculate(voice)
    {
        const env = voice.modulationEnvelope;
        
        // in release? Might need to recalculate the value as it can be modulated
        if (voice.isInRelease)
        {
            env.releaseStartLevel = ModulationEnvelope.getValue(voice, voice.releaseStartTime, true);
        }
        
        env.sustainLevel = 1 - (voice.modulatedGenerators[generatorTypes.sustainModEnv] / 1000);
        
        env.attackDuration = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.attackModEnv]);
        
        const decayKeyExcursionCents = ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToModEnvDecay]);
        const decayTime = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.decayModEnv] + decayKeyExcursionCents);
        // according to the specification, the decay time is the time it takes to reach 0% from 100%.
        // calculate the time to reach actual sustain level,
        // for example, sustain 0.6 will be 0.4 of the decay time
        env.decayDuration = decayTime * (1 - env.sustainLevel);
        
        const holdKeyExcursionCents = ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToModEnvHold]);
        env.holdDuration = timecentsToSeconds(holdKeyExcursionCents + voice.modulatedGenerators[generatorTypes.holdModEnv]);
        
        const releaseTime = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.releaseModEnv]);
        // release time is from the full level to 0%
        // to get the actual time, multiply by the release start level
        env.releaseDuration = releaseTime * env.releaseStartLevel;
        
        env.delayEnd = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayModEnv]);
        env.attackEnd = env.delayEnd + env.attackDuration;
        env.holdEnd = env.attackEnd + env.holdDuration;
        env.decayEnd = env.holdEnd + env.decayDuration;
    }
    
    /**
     * Calculates the current modulation envelope value for the given time and voice
     * @param voice {Voice} the voice we are working on
     * @param currentTime {number} in seconds
     * @param ignoreRelease {boolean} if true, it will compute the value as if the voice was not released
     * @returns {number} modenv value, from 0 to 1
     */
    static getValue(voice, currentTime, ignoreRelease = false)
    {
        const env = voice.modulationEnvelope;
        if (voice.isInRelease && !ignoreRelease)
        {
            // if the voice is still in the delay phase,
            // start level will be 0 that will result in divide by zero
            if (env.releaseStartLevel === 0)
            {
                return 0;
            }
            return Math.max(
                0,
                (1 - (currentTime - voice.releaseStartTime) / env.releaseDuration) * env.releaseStartLevel
            );
        }
        
        if (currentTime < env.delayEnd)
        {
            env.currentValue = 0; // delay
        }
        else if (currentTime < env.attackEnd)
        {
            // modulation envelope uses convex curve for attack
            env.currentValue = CONVEX_ATTACK[~~((1 - (env.attackEnd - currentTime) / env.attackDuration) * 1000)];
        }
        else if (currentTime < env.holdEnd)
        {
            // hold: stay at 1
            env.currentValue = MODENV_PEAK;
        }
        else if (currentTime < env.decayEnd)
        {
            // decay: linear ramp from 1 to sustain level
            env.currentValue = (1 - (env.decayEnd - currentTime) / env.decayDuration) * (env.sustainLevel - MODENV_PEAK) + MODENV_PEAK;
        }
        else
        {
            // sustain: stay at sustain level
            env.currentValue = env.sustainLevel;
        }
        return env.currentValue;
    }
}