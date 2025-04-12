import { decibelAttenuationToGain, timecentsToSeconds } from "./unit_converter.js";

import { generatorTypes } from "../../../soundfont/basic_soundfont/generator.js";

/**
 * volume_envelope.js
 * purpose: applies a volume envelope for a given voice
 */

export const VOLUME_ENVELOPE_SMOOTHING_FACTOR = 0.01;

const DB_SILENCE = 100;
const PERCEIVED_DB_SILENCE = 90;
// around 96 dB of attenuation
const PERCEIVED_GAIN_SILENCE = 0.000015; // can't go lower than that (see #50)

/**
 * VOL ENV STATES:
 * 0 - delay
 * 1 - attack
 * 2 - hold/peak
 * 3 - decay
 * 4 - sustain
 * release indicates by isInRelease property
 */

export class VolumeEnvelope
{
    /**
     * The envelope's current time in samples
     * @type {number}
     */
    currentSampleTime = 0;
    /**
     * The sample rate in Hz
     * @type {number}
     */
    sampleRate;
    /**
     * The current attenuation of the envelope in dB
     * @type {number}
     */
    currentAttenuationDb = DB_SILENCE;
    /**
     * The current stage of the volume envelope
     * @type {0|1|2|3|4}
     */
    state = 0;
    /**
     * The dB attenuation of the envelope when it entered the release stage
     * @type {number}
     */
    releaseStartDb = DB_SILENCE;
    /**
     * The time in samples relative to the start of the envelope
     * @type {number}
     */
    releaseStartTimeSamples = 0;
    /**
     * The current gain applied to the voice in the release stage
     * @type {number}
     */
    currentReleaseGain = 1;
    /**
     * The attack duration in samples
     * @type {number}
     */
    attackDuration = 0;
    /**
     * The decay duration in samples
     * @type {number}
     */
    decayDuration = 0;
    /**
     * The release duration in samples
     * @type {number}
     */
    releaseDuration = 0;
    /**
     * The voice's absolute attenuation as linear gain
     * @type {number}
     */
    attenuation = 0;
    /**
     * The attenuation target, which the "attenuation" property is linearly interpolated towards (gain)
     * @type {number}
     */
    attenuationTargetGain = 0;
    /**
     * The attenuation target, which the "attenuation" property is linearly interpolated towards (dB)
     * @type {number}
     */
    attenuationTarget = 0;
    /**
     * The voice's sustain amount in dB, relative to attenuation
     * @type {number}
     */
    sustainDbRelative = 0;
    /**
     * The time in samples to the end of delay stage, relative to the start of the envelope
     * @type {number}
     */
    delayEnd = 0;
    /**
     * The time in samples to the end of attack stage, relative to the start of the envelope
     * @type {number}
     */
    attackEnd = 0;
    /**
     * The time in samples to the end of hold stage, relative to the start of the envelope
     * @type {number}
     */
    holdEnd = 0;
    /**
     * The time in samples to the end of decay stage, relative to the start of the envelope
     * @type {number}
     */
    decayEnd = 0;
    
    /**
     * @param sampleRate {number} Hz
     * @param initialDecay {number} cb
     */
    constructor(sampleRate, initialDecay)
    {
        this.sampleRate = sampleRate;
        /**
         * if sustain stge is silent,
         * then we can turn off the voice when it is silent.
         * We can't do that with modulated as it can silence the volume and then raise it again, and the voice must keep playing
         * @type {boolean}
         */
        this.canEndOnSilentSustain = initialDecay / 10 >= PERCEIVED_DB_SILENCE;
    }
    
    /**
     * Starts the release phase in the envelope
     * @param voice {Voice} the voice this envelope belongs to
     */
    static startRelease(voice)
    {
        voice.volumeEnvelope.releaseStartTimeSamples = voice.volumeEnvelope.currentSampleTime;
        voice.volumeEnvelope.currentReleaseGain = decibelAttenuationToGain(voice.volumeEnvelope.currentAttenuationDb);
        VolumeEnvelope.recalculate(voice);
    }
    
    /**
     * Recalculates the envelope
     * @param voice {Voice} the voice this envelope belongs to
     */
    static recalculate(voice)
    {
        const env = voice.volumeEnvelope;
        const timecentsToSamples = tc =>
        {
            return Math.max(0, Math.floor(timecentsToSeconds(tc) * env.sampleRate));
        };
        // calculate absolute times (they can change so we have to recalculate every time
        env.attenuationTarget = Math.max(
            0,
            Math.min(voice.modulatedGenerators[generatorTypes.initialAttenuation], 1440)
        ) / 10; // divide by ten to get decibels
        env.attenuationTargetGain = decibelAttenuationToGain(env.attenuationTarget);
        env.sustainDbRelative = Math.min(DB_SILENCE, voice.modulatedGenerators[generatorTypes.sustainVolEnv] / 10);
        const sustainDb = Math.min(DB_SILENCE, env.sustainDbRelative);
        
        // calculate durations
        env.attackDuration = timecentsToSamples(voice.modulatedGenerators[generatorTypes.attackVolEnv]);
        
        // decay: sfspec page 35: the time is for change from attenuation to -100dB,
        // therefore, we need to calculate the real time
        // (changing from attenuation to sustain instead of -100dB)
        const fullChange = voice.modulatedGenerators[generatorTypes.decayVolEnv];
        const keyNumAddition = (60 - voice.targetKey) * voice.modulatedGenerators[generatorTypes.keyNumToVolEnvDecay];
        const fraction = sustainDb / DB_SILENCE;
        env.decayDuration = timecentsToSamples(fullChange + keyNumAddition) * fraction;
        
        env.releaseDuration = timecentsToSamples(voice.modulatedGenerators[generatorTypes.releaseVolEnv]);
        
        // calculate absolute end times for the values
        env.delayEnd = timecentsToSamples(voice.modulatedGenerators[generatorTypes.delayVolEnv]);
        env.attackEnd = env.attackDuration + env.delayEnd;
        
        // make sure to take keyNumToVolEnvHold into account!
        const holdExcursion = (60 - voice.targetKey) * voice.modulatedGenerators[generatorTypes.keyNumToVolEnvHold];
        env.holdEnd = timecentsToSamples(voice.modulatedGenerators[generatorTypes.holdVolEnv]
                + holdExcursion)
            + env.attackEnd;
        
        env.decayEnd = env.decayDuration + env.holdEnd;
        
        // if this is the first recalculation and the voice has no attack or delay time, set current db to peak
        if (env.state === 0 && env.attackEnd === 0)
        {
            // env.currentAttenuationDb = env.attenuationTarget;
            env.state = 2;
        }
        
        // check if voice is in release
        if (voice.isInRelease)
        {
            // no interpolation this time: force update to actual attenuation and calculate release start from there
            //env.attenuation = Math.min(DB_SILENCE, env.attenuationTarget);
            const sustainDb = Math.max(0, Math.min(DB_SILENCE, env.sustainDbRelative));
            const fraction = sustainDb / DB_SILENCE;
            env.decayDuration = timecentsToSamples(fullChange + keyNumAddition) * fraction;
            
            switch (env.state)
            {
                case 0:
                    env.releaseStartDb = DB_SILENCE;
                    break;
                
                case 1:
                    // attack phase: get linear gain of the attack phase when release started
                    // and turn it into db as we're ramping the db up linearly
                    // (to make volume go down exponentially)
                    // attack is linear (in gain) so we need to do get db from that
                    let elapsed = 1 - ((env.attackEnd - env.releaseStartTimeSamples) / env.attackDuration);
                    // calculate the gain that the attack would have, so
                    // turn that into db
                    env.releaseStartDb = 20 * Math.log10(elapsed) * -1;
                    break;
                
                case 2:
                    env.releaseStartDb = 0;
                    break;
                
                case 3:
                    env.releaseStartDb = (1 - (env.decayEnd - env.releaseStartTimeSamples) / env.decayDuration) * sustainDb;
                    break;
                
                case 4:
                    env.releaseStartDb = sustainDb;
                    break;
            }
            env.releaseStartDb = Math.max(0, Math.min(env.releaseStartDb, DB_SILENCE));
            if (env.releaseStartDb >= PERCEIVED_DB_SILENCE)
            {
                voice.finished = true;
            }
            env.currentReleaseGain = decibelAttenuationToGain(env.releaseStartDb);
            
            // release: sfspec page 35: the time is for change from attenuation to -100dB,
            // therefore, we need to calculate the real time
            // (changing from release start to -100dB instead of from peak to -100dB)
            const releaseFraction = (DB_SILENCE - env.releaseStartDb) / DB_SILENCE;
            env.releaseDuration *= releaseFraction;
            
        }
    }
    
    /**
     * Applies volume envelope gain to the given output buffer
     * @param voice {Voice} the voice we're working on
     * @param audioBuffer {Float32Array} the audio buffer to modify
     * @param centibelOffset {number} the centibel offset of volume, for modLFOtoVolume
     * @param smoothingFactor {number} the adjusted smoothing factor for the envelope
     * @description essentially we use approach of 100dB is silence, 0dB is peak, and always add attenuation to that (which is interpolated)
     */
    static apply(voice, audioBuffer, centibelOffset, smoothingFactor)
    {
        const env = voice.volumeEnvelope;
        let decibelOffset = centibelOffset / 10;
        
        const attenuationSmoothing = smoothingFactor;
        
        // RELEASE PHASE
        if (voice.isInRelease)
        {
            let elapsedRelease = env.currentSampleTime - env.releaseStartTimeSamples;
            if (elapsedRelease >= env.releaseDuration)
            {
                for (let i = 0; i < audioBuffer.length; i++)
                {
                    audioBuffer[i] = 0;
                }
                voice.finished = true;
                return;
            }
            let dbDifference = DB_SILENCE - env.releaseStartDb;
            for (let i = 0; i < audioBuffer.length; i++)
            {
                // attenuation interpolation
                env.attenuation += (env.attenuationTargetGain - env.attenuation) * attenuationSmoothing;
                let db = (elapsedRelease / env.releaseDuration) * dbDifference + env.releaseStartDb;
                env.currentReleaseGain = env.attenuation * decibelAttenuationToGain(db + decibelOffset);
                audioBuffer[i] *= env.currentReleaseGain;
                env.currentSampleTime++;
                elapsedRelease++;
            }
            
            if (env.currentReleaseGain <= PERCEIVED_GAIN_SILENCE)
            {
                voice.finished = true;
            }
            return;
        }
        
        let filledBuffer = 0;
        switch (env.state)
        {
            case 0:
                // delay phase, no sound is produced
                while (env.currentSampleTime < env.delayEnd)
                {
                    env.currentAttenuationDb = DB_SILENCE;
                    audioBuffer[filledBuffer] = 0;
                    
                    env.currentSampleTime++;
                    if (++filledBuffer >= audioBuffer.length)
                    {
                        return;
                    }
                }
                env.state++;
            // fallthrough
            
            case 1:
                // attack phase: ramp from 0 to attenuation
                while (env.currentSampleTime < env.attackEnd)
                {
                    // attenuation interpolation
                    env.attenuation += (env.attenuationTargetGain - env.attenuation) * attenuationSmoothing;
                    
                    // Special case: linear gain ramp instead of linear db ramp
                    let linearAttenuation = 1 - (env.attackEnd - env.currentSampleTime) / env.attackDuration; // 0 to 1
                    audioBuffer[filledBuffer] *= linearAttenuation * env.attenuation * decibelAttenuationToGain(
                        decibelOffset);
                    // set current attenuation to peak as its invalid during this phase
                    env.currentAttenuationDb = 0;
                    
                    env.currentSampleTime++;
                    if (++filledBuffer >= audioBuffer.length)
                    {
                        return;
                    }
                }
                env.state++;
            // fallthrough
            
            case 2:
                // hold/peak phase: stay at attenuation
                while (env.currentSampleTime < env.holdEnd)
                {
                    // attenuation interpolation
                    env.attenuation += (env.attenuationTargetGain - env.attenuation) * attenuationSmoothing;
                    
                    audioBuffer[filledBuffer] *= env.attenuation * decibelAttenuationToGain(decibelOffset);
                    env.currentAttenuationDb = 0;
                    
                    env.currentSampleTime++;
                    if (++filledBuffer >= audioBuffer.length)
                    {
                        return;
                    }
                }
                env.state++;
            // fallthrough
            
            case 3:
                // decay phase: linear ramp from attenuation to sustain
                while (env.currentSampleTime < env.decayEnd)
                {
                    // attenuation interpolation
                    env.attenuation += (env.attenuationTargetGain - env.attenuation) * attenuationSmoothing;
                    
                    env.currentAttenuationDb = (1 - (env.decayEnd - env.currentSampleTime) / env.decayDuration) * env.sustainDbRelative;
                    audioBuffer[filledBuffer] *= env.attenuation * decibelAttenuationToGain(env.currentAttenuationDb + decibelOffset);
                    
                    env.currentSampleTime++;
                    if (++filledBuffer >= audioBuffer.length)
                    {
                        return;
                    }
                }
                env.state++;
            // fallthrough
            
            case 4:
                if (env.canEndOnSilentSustain && env.sustainDbRelative >= PERCEIVED_DB_SILENCE)
                {
                    voice.finished = true;
                }
                // sustain phase: stay at sustain
                while (true)
                {
                    // attenuation interpolation
                    env.attenuation += (env.attenuationTargetGain - env.attenuation) * attenuationSmoothing;
                    
                    audioBuffer[filledBuffer] *= env.attenuation * decibelAttenuationToGain(env.sustainDbRelative + decibelOffset);
                    env.currentAttenuationDb = env.sustainDbRelative;
                    env.currentSampleTime++;
                    if (++filledBuffer >= audioBuffer.length)
                    {
                        return;
                    }
                }
        }
    }
}