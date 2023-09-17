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
    const gain = releaseExpoLookupTable[Math.trunc((elapsed / releaseTime) * 1000)];
    //const gain = (1 - elapsed / (releaseTime * 0.2))
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
        const gain = releaseExpoLookupTable[Math.trunc(((currentTime - holdEnd) / decay) * 1000)] * (peak - sustain) + sustain
        if (gain < MIN_AUDIBLE_GAIN) {
            return -0.001;
        }
        return gain;
    }
    // sustain
    else {
        if (sustain < MIN_AUDIBLE_GAIN) {
            return -0.001;
        }
        return sustain;
    }
}