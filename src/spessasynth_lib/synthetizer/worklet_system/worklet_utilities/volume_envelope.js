import { decibelAttenuationToGain, timecentsToSeconds } from './unit_converter.js'
import { generatorTypes } from '../../../soundfont/chunk/generators.js'

const DB_SILENCE = 100;
const GAIN_SILENCE = 0.005;
/**
 * Applies volume envelope gain to the given output buffer
 * @param voice {WorkletVoice} the voice we're working on
 * @param audioBuffer {Float32Array} the audio buffer to modify
 * @param currentTime {number} the current audio time
 * @param centibelOffset {number} the centibel offset of volume, for modLFOtoVolume
 * @param sampleTime {number} single sample time in seconds, usually 1 / 44100 of a second
 */
export function applyVolumeEnvelope(voice, audioBuffer, currentTime, centibelOffset, sampleTime)
{
    // calculate values
    let decibelOffset = centibelOffset / 10;

    // calculate env times
    let attack = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.attackVolEnv]);
    let decay = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.decayVolEnv] + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToVolEnvDecay]));

    // calculate absolute times
    let attenuation = voice.modulatedGenerators[generatorTypes.initialAttenuation] / 25;
    let release = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.releaseVolEnv]);
    let sustain = attenuation + voice.modulatedGenerators[generatorTypes.sustainVolEnv] / 10;
    let delayEnd  = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayVolEnv]) + voice.startTime;
    let attackEnd = attack + delayEnd;
    let holdEnd = timecentsToSeconds(voice.modulatedGenerators[generatorTypes.holdVolEnv] + ((60 - voice.midiNote) * voice.modulatedGenerators[generatorTypes.keyNumToVolEnvHold])) + attackEnd;
    let decayEnd = decay + holdEnd;

    if(voice.isInRelease)
    {
        // calculate the db attenuation at the time of release
        let releaseStartDb;
        if(voice.releaseStartTime < delayEnd)
        {
            // we're in the delay phase (skip to peak)
            releaseStartDb = attenuation;
        }
        else if(voice.releaseStartTime < attackEnd)
        {
            // attack is linear (in gain) so we need to do get db from that
            let elapsed = 1 - ((attackEnd - voice.releaseStartTime) / attack);
            // calculate the gain that the attack would have
            let attackGain = elapsed * decibelAttenuationToGain(attenuation + decibelOffset);

            // turn that into db
            releaseStartDb = 20 * Math.log10(attackGain) * -1;
        }
        else if(voice.releaseStartTime < holdEnd)
        {
            releaseStartDb = attenuation;
        }
        else if(voice.releaseStartTime < decayEnd)
        {
            // we're in the decay phase
            releaseStartDb = (1 - (decayEnd - voice.releaseStartTime) / decay) * (sustain - attenuation) + attenuation;
        }
        else
        {
            releaseStartDb = sustain;
        }

        // if the voice is not released, but state set to true (due to min note length, simply use the release db)
        if(voice.releaseStartTime > currentTime)
        {
            const gain = decibelAttenuationToGain(releaseStartDb + decibelOffset);
            for (let i = 0; i < audioBuffer.length; i++) {
                audioBuffer[i] = gain * audioBuffer[i];
            }
            return;
        }

        let elapsedRelease = currentTime - voice.releaseStartTime;
        let dbDifference = DB_SILENCE - releaseStartDb;
        let gain;
        for (let i = 0; i < audioBuffer.length; i++) {
            let db = (elapsedRelease / release) * dbDifference + releaseStartDb;
            gain = decibelAttenuationToGain(db + decibelOffset);
            audioBuffer[i] = gain * audioBuffer[i];
            elapsedRelease += sampleTime;
        }

        if(gain <= GAIN_SILENCE)
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
            currentFrameTime += sampleTime;
            audioBuffer[i] = 0;
            continue;
        }
        else if(currentFrameTime < attackEnd)
        {
            // we're in the attack phase
            // Special case: linear instead of exponential
            const elapsed = (attackEnd - currentFrameTime) / attack;
            audioBuffer[i] = audioBuffer[i] * (1 - elapsed) * decibelAttenuationToGain(attenuation + decibelOffset);
            currentFrameTime += sampleTime;
            dbAttenuation = 10 * Math.log10((elapsed * (attenuation - DB_SILENCE) + DB_SILENCE) * -1);
            continue;
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
        const gain = decibelAttenuationToGain(dbAttenuation + decibelOffset);
        audioBuffer[i] = audioBuffer[i] * gain;
        currentFrameTime += sampleTime;

        //we can put this here, since delay and attack continue, so they aren't affected
        if(gain <= GAIN_SILENCE && attenuation > DB_SILENCE) // make sure that the voice is actually meant to be audible, so we don't cancel it on for example volume set to 0
        {
            voice.finished = true;
            return;
        }
    }
    voice.currentAttenuationDb = dbAttenuation;
}