import { MIN_AUDIBLE_GAIN } from '../channel_processor.js';
import { decibelAttenuationToGain, timecentsToSeconds } from './unit_converter.js'
import { generatorTypes } from '../../../soundfont/chunk/generators.js'

const DB_SILENCE = 100;

/**
 * @param voice {WorkletVoice}
 * @param audioBuffer {Float32Array}
 * @param currentTime {number}
 * @param centibelOffset {number}
 * @param sampleTime {number} single sample time, usually 1 / 44100 of a second
 */
export function applyVolumeEnvelope(voice, audioBuffer, currentTime, centibelOffset, sampleTime)
{
    // calculate values
    let decibelOffset = centibelOffset * 10;

    // calculate env times
    let attack = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.attackVolEnv]);
    let decay = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.decayVolEnv]);

    // calculate absolute times
    let attenuation = voice.modulatedGenerators[generatorTypes.initialAttenuation] / 25 + decibelOffset;
    let release = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.releaseVolEnv]);
    let sustain = attenuation + voice.modulatedGenerators[generatorTypes.sustainVolEnv] / 10;
    let delayEnd  = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayVolEnv]) + voice.startTime;
    let attackEnd = attack + delayEnd;
    let holdEnd = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.holdVolEnv] + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToVolEnvHold])) + attackEnd;
    let decayEnd = decay + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToVolEnvDecay]) + holdEnd;

    if(voice.isInRelease)
    {
        let elapsedRelease = currentTime - voice.releaseStartTime;
        let dbDifference = DB_SILENCE - voice.releaseStartDb;
        let db;
        for (let i = 0; i < audioBuffer.length; i++) {
            db = (elapsedRelease / release) * dbDifference + voice.releaseStartDb + decibelOffset;
            audioBuffer[i] = decibelAttenuationToGain(db) * audioBuffer[i];
            elapsedRelease += sampleTime;
        }

        if(db >= DB_SILENCE)
        {
            voice.finished = true;
        }
        return;
    }
    let currentFrameTime = currentTime;
    let dbAttenuation;
    for (let i = 0; i < audioBuffer.length; i++) {
        if(currentFrameTime < delayEnd)
        {
            // we're in the delay phase
            dbAttenuation = DB_SILENCE;
        }
        else if(currentFrameTime < attackEnd)
        {
            // we're in the attack pahse
            dbAttenuation = ((attackEnd - currentFrameTime) / attack) * (DB_SILENCE - attenuation) + attenuation;
        }
        else if(currentFrameTime < holdEnd)
        {
            dbAttenuation = attenuation;
        }
        else if(currentFrameTime < decayEnd)
        {
            // we're in the decay phase
            dbAttenuation = (1 - (decayEnd - currentFrameTime) / decay) * (sustain - attenuation) + attenuation;
        }
        else
        {
            dbAttenuation = sustain;
        }

        // apply gain and advance the time
        audioBuffer[i] = audioBuffer[i] * decibelAttenuationToGain(dbAttenuation);
        currentFrameTime += sampleTime;
    }
    voice.currentAttenuationDb = dbAttenuation;
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