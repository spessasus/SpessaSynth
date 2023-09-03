import { MIN_AUDIBLE_GAIN } from '../channel_processor.js';
import { timecentsToSeconds } from './unit_converter.js'
import { getModulated } from './worklet_modulator.js'
import { generatorTypes } from '../../../soundfont/chunk/generators.js'

export const volumeEnvelopePhases = {
    delay: 0,
    attack: 1,
    hold: 2,
    decay: 3,
    release: 4
}

/**
 * @param voice {WorkletVoice}
 * @param phase {number}
 */
export function getVolEnvSeconds(voice, phase)
{
    let timecents;
    switch (phase)
    {
        case volumeEnvelopePhases.delay:
            timecents = getModulated(voice, generatorTypes.delayVolEnv);
            if(timecents < -11990)
            {
                return 0;
            }
            return timecentsToSeconds(timecents);

        case volumeEnvelopePhases.attack:
            timecents = getModulated(voice, generatorTypes.attackVolEnv);
            if(timecents < -11990)
            {
                return 0;
            }
            return timecentsToSeconds(timecents);

        case volumeEnvelopePhases.hold:
            return timecentsToSeconds(getModulated(voice, generatorTypes.holdVolEnv) + ((60 - voice.midiNote) * getModulated(voice, generatorTypes.keyNumToVolEnvHold)));

        case volumeEnvelopePhases.decay:
            return timecentsToSeconds(getModulated(voice, generatorTypes.decayVolEnv) + ((60 - voice.midiNote) * getModulated(voice, generatorTypes.keyNumToVolEnvDecay)));

        case volumeEnvelopePhases.release:
            return timecentsToSeconds(getModulated(voice, generatorTypes.releaseVolEnv));
        default:
            return 0;
    }
}

/**
 * @param startTime {number}
 * @param endTime {number}
 * @param startVal {number}
 * @param endVal {number}
 * @param currentTime {number}
 * @returns {number}
 */
function getExpo(startTime, endTime, startVal, endVal, currentTime)
{
    return startVal * Math.pow(endVal / startVal, (currentTime - startTime) / (endTime - startTime))
}

const releaseExpoLookupTable = new Float32Array(1001);
for (let i = 0; i < 1001; i++) {
    releaseExpoLookupTable[i] = Math.pow(0.000001, (i / 1000));
}

/**
 * @param releaseTime {number} the length of release phase
 * @param elapsed {number} the amount of seconds passed since the release start
 * @returns {Number}
 */
export function getVolEnvReleaseMultiplier(releaseTime, elapsed)
{
    const gain = releaseExpoLookupTable[~~((elapsed / releaseTime) * 1000)];
    return gain > MIN_AUDIBLE_GAIN ? gain : -1;
}

/**
 * @param delay {number} seconds
 * @param attack {number} seconds
 * @param peak {number} gain
 * @param hold {number} seconds
 * @param sustain {number} gain
 * @param decay {number} seconds
 * @param startTime {number} seconds
 * @param currentTime  {number} seconds
 * @returns {number} the gain or -1 if inaudible
 */
export function getVolumeEnvelopeValue(delay, attack, peak, hold, sustain, decay, startTime, currentTime) {
    const attackStart = startTime + delay;
    const attackEnd = attackStart + attack;
    const holdEnd = attackEnd + hold;
    const decayEnd = holdEnd + decay;

    // delay time
    if (currentTime < attackStart) {
        return 0;
    }
    // attack time
    else if (currentTime < attackEnd) {
        // linear
        return ((currentTime - attackStart) / attack) * peak;
    }
    // hold time
    else if (currentTime < holdEnd) {
        return peak;
    }
    // decay time
    else if (currentTime < decayEnd && (peak !== sustain)) {
        // exponential
        const gain = getExpo(holdEnd, decayEnd, peak, sustain, currentTime);
        if (gain < MIN_AUDIBLE_GAIN) {
            return -1;
        }
        return gain;
    }
    // sustain
    else {
        if (sustain < MIN_AUDIBLE_GAIN) {
            return -1;
        }
        return sustain;
    }
}