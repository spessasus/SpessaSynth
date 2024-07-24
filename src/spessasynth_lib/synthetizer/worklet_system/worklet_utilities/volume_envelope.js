import { decibelAttenuationToGain, timecentsToSeconds } from './unit_converter.js'
import { generatorTypes } from '../../../soundfont/read/generators.js'

/**
 * volume_envelope.js
 * purpose: applies a volume envelope for a given voice
 */

/**
 * @typedef {Object} WorkletVolumeEnvelope
 * @property {number} currentAttenuationDb - current voice attenuation in dB (current sample)
 * @property {0|1|2|3|4} state - state of the volume envelope. 0 is delay, 1 is attack, 2 is hold, 3 is decay, 4 is sustain
 * @property {number} releaseStartDb - the dB attenuation of the voice when it was released
 * @property {number} currentReleaseGain - the current linear gain of the release phase
 *
 * @property {number} attackDuration - the duration of the attack phase, in seconds
 * @property {number} decayDuration - the duration of the decay phase, in seconds
 *
 * @property {number} attenuation - the absolute attenuation in dB
 * @property {number} releaseDuration - the duration of the release phase in seconds
 * @property {number} sustainDb - the sustain amount in dB
 *
 * @property {number} delayEnd - the time when delay ends, in absolute seconds
 * @property {number} attackEnd - the time when the attack phase ends, in absolute seconds
 * @property {number} holdEnd - the time when the hold phase ends, in absolute seconds
 * @property {number} decayEnd - the time when the decay phase ends, in absolute seconds
 */

/**
 * @type {WorkletVolumeEnvelope}
 */
export const DEFAULT_WORKLET_VOLUME_ENVELOPE = {
    attenuation: 100,
    currentAttenuationDb: 100,
    state: 0,
    releaseStartDb: 100,
    attackDuration: 0,
    decayDuration: 0,
    releaseDuration: 0,
    sustainDb: 0,
    delayEnd: 0,
    attackEnd: 0,
    holdEnd: 0,
    decayEnd: 0,
    currentReleaseGain: 1,
}

export const VOLUME_ENVELOPE_SMOOTHING_FACTOR = 0.001;

const DB_SILENCE = 100;
const GAIN_SILENCE = 0.005;

/**
 * VOL ENV STATES:
 * 0 - delay
 * 1 - attack
 * 2 - hold/peak
 * 3 - decay
 * 4 - sustain
 * release is indicated by isInRelease property
 */

/**
 * Recalculates the times of the volume envelope
 * @param voice {WorkletVoice} the voice we're working on
 */
export function recalculateVolumeEnvelope(voice)
{
    const env = voice.volumeEnvelope;
    // calculate durations
    env.attackDuration = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.attackVolEnv]);
    env.decayDuration = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.decayVolEnv]
        + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToVolEnvDecay]));
    env.releaseDuration = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.releaseVolEnv]);

    // calculate absolute times (they can change so we have to recalculate every time
    env.attenuation = voice.modulatedGenerators[generatorTypes.initialAttenuation] / 10; // divide by ten to get decibelts
    env.sustainDb = voice.volumeEnvelope.attenuation + voice.modulatedGenerators[generatorTypes.sustainVolEnv] / 10;

    // calculate absolute end time
    env.delayEnd = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayVolEnv]) + voice.startTime;
    env.attackEnd = env.attackDuration + env.delayEnd;

    // make sure to take keyNumToVolEnvHold into account!!!
    env.holdEnd = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.holdVolEnv]
        + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToVolEnvHold]))
        + env.attackEnd;

    env.decayEnd = env.decayDuration + env.holdEnd;
    // check if voice is in release
    if(voice.isInRelease)
    {
        // calculate the db attenuation at the time of release (not a constant because it can change (ex, volume set to 0, the sound should cut off)
        switch (env.state) {
            case 0:
                env.releaseStartDb = 0;
                break;

            case 1:
                // attack phase
                // attack is linear (in gain) so we need to do get db from that
                let elapsed = 1 - ((env.attackEnd - voice.releaseStartTime) / env.attackDuration);
                // calculate the gain that the attack would have
                let attackGain = elapsed * decibelAttenuationToGain(env.attenuation);

                // turn that into db
                env.releaseStartDb = 20 * Math.log10(attackGain) * -1;
                break;

            case 2:
                env.releaseStartDb = env.attenuation;
                break;

            case 3:
                env.releaseStartDb = (1 - (env.decayEnd - voice.releaseStartTime) / env.decayDuration) * (env.sustainDb - env.attenuation) + env.attenuation;
                break;

            case 4:
                env.releaseStartDb = env.sustainDb;
                break;

            default:
                env.releaseStartDb = env.currentAttenuationDb;
        }
    }
}

/**
 * Applies volume envelope gain to the given output buffer
 * @param voice {WorkletVoice} the voice we're working on
 * @param audioBuffer {Float32Array} the audio buffer to modify
 * @param currentTime {number} the current audio time
 * @param centibelOffset {number} the centibel offset of volume, for modLFOtoVolume
 * @param sampleTime {number} single sample time in seconds, usually 1 / 44100 of a second
 * @param smoothingFactor {number} the adjusted smoothing factor for the envelope
 */

export function applyVolumeEnvelope(voice, audioBuffer, currentTime, centibelOffset, sampleTime, smoothingFactor)
{
    let decibelOffset = centibelOffset / 10;
    const env = voice.volumeEnvelope;

    // RELEASE PHASE
    if(voice.isInRelease)
    {
        // release needs a more aggressive smoothing factor as the instant notes don't end instantly when they should
        const releaseSmoothingFactor = smoothingFactor * 10;
        const releaseStartDb = env.releaseStartDb + decibelOffset;
        let elapsedRelease = currentTime - voice.releaseStartTime;
        let dbDifference = DB_SILENCE - releaseStartDb;
        let gain = env.currentReleaseGain;
        for (let i = 0; i < audioBuffer.length; i++)
        {
            let db = (elapsedRelease / env.releaseDuration) * dbDifference + releaseStartDb;
            gain = decibelAttenuationToGain(db + decibelOffset);
            env.currentReleaseGain += (gain - env.currentReleaseGain) * releaseSmoothingFactor;
            audioBuffer[i] *= env.currentReleaseGain;
            elapsedRelease += sampleTime;
        }

        if(env.currentReleaseGain <= GAIN_SILENCE)
        {
            voice.finished = true;
        }
        return;
    }

    let currentFrameTime = currentTime;
    let filledBuffer = 0;
    switch(env.state)
    {
        case 0:
            // delay phase, no sound is produced
            while(currentFrameTime < env.delayEnd)
            {
                env.currentAttenuationDb = DB_SILENCE;
                audioBuffer[filledBuffer] = 0;

                currentFrameTime += sampleTime;
                if(++filledBuffer >= audioBuffer.length)
                {
                    return;
                }
            }
            env.state++;
        // fallthrough

        case 1:
            // attack phase: ramp from 0 to attenuation
            while(currentFrameTime < env.attackEnd)
            {
                // Special case: linear gain ramp instead of linear db ramp
                let linearAttenuation = 1 - (env.attackEnd - currentFrameTime) / env.attackDuration; // 0 to 1
                const gain = linearAttenuation * decibelAttenuationToGain(env.attenuation + decibelOffset)
                audioBuffer[filledBuffer] *= gain;

                // set current attenuation to peak as its invalid during this phase
                env.currentAttenuationDb = env.attenuation;

                currentFrameTime += sampleTime;
                if(++filledBuffer >= audioBuffer.length)
                {
                    return;
                }
            }
            env.state++;
        // fallthrough

        case 2:
            // hold/peak phase: stay at attenuation
            while(currentFrameTime < env.holdEnd)
            {
                const newAttenuation = env.attenuation
                    + decibelOffset;

                // interpolate attenuation to prevent clicking
                env.currentAttenuationDb += (newAttenuation - env.currentAttenuationDb) * smoothingFactor;
                audioBuffer[filledBuffer] *= decibelAttenuationToGain(env.currentAttenuationDb);

                currentFrameTime += sampleTime;
                if(++filledBuffer >= audioBuffer.length)
                {
                    return;
                }
            }
            env.state++;
        // fallthrough

        case 3:
            // decay phase: linear ramp from attenuation to sustain
            while(currentFrameTime < env.decayEnd)
            {
                const newAttenuation = (1 - (env.decayEnd - currentFrameTime) / env.decayDuration) * (env.sustainDb - env.attenuation) + env.attenuation
                    + decibelOffset;

                // interpolate attenuation to prevent clicking
                env.currentAttenuationDb += (newAttenuation - env.currentAttenuationDb) * smoothingFactor;
                audioBuffer[filledBuffer] *= decibelAttenuationToGain(env.currentAttenuationDb);

                currentFrameTime += sampleTime;
                if(++filledBuffer >= audioBuffer.length)
                {
                    return;
                }
            }
            env.state++;
        // fallthrough

        case 4:
            // sustain phase: stay at sustain
            while(true)
            {
                // interpolate attenuation to prevent clicking
                const newAttenuation = env.sustainDb
                    + decibelOffset;
                env.currentAttenuationDb += (newAttenuation - env.currentAttenuationDb) * smoothingFactor;
                audioBuffer[filledBuffer] *= decibelAttenuationToGain(env.currentAttenuationDb);
                if(++filledBuffer >= audioBuffer.length)
                {
                    return;
                }
            }

    }
}