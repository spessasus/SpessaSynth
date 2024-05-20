import { decibelAttenuationToGain, timecentsToSeconds } from './unit_converter.js'
import { generatorTypes } from '../../../soundfont/chunk/generators.js'

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
    let attenuation = voice.modulatedGenerators[generatorTypes.initialAttenuation] / 10; // divide by ten to get decibelts
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
        switch(voice.volumeEnvelopeState)
        {
            case 0:
                // delay phase, no sound is produced
                if(currentFrameTime >= delayEnd)
                {
                    voice.volumeEnvelopeState++;
                }
                else
                {
                    dbAttenuation = DB_SILENCE;
                    audioBuffer[i] = 0;

                    // no need to go through the hassle of converting. Skip
                    currentFrameTime += sampleTime;
                    continue;
                }
            // fallthrough

            case 1:
                // attack phase: ramp from 0 to attenuation
                if(currentFrameTime >= attackEnd)
                {
                    voice.volumeEnvelopeState++;
                }
                else {
                    // Special case: linear gain ramp instead of linear db ramp
                    const elapsed = (attackEnd - currentFrameTime) / attack;
                    dbAttenuation = 10 * Math.log10((elapsed * (attenuation - DB_SILENCE) + DB_SILENCE) * -1);
                    audioBuffer[i] = audioBuffer[i] * (1 - elapsed) * decibelAttenuationToGain(attenuation + decibelOffset);
                    currentFrameTime += sampleTime;
                    continue

                }
            // fallthrough

            case 2:
                // hold/peak phase: stay at attenuation
                if(currentFrameTime >= holdEnd)
                {
                    voice.volumeEnvelopeState++;
                }
                else
                {
                    dbAttenuation = attenuation;
                    break;
                }
            // fallthrough

            case 3:
                // decay phase: linear ramp from attenuation to sustain
                if(currentFrameTime >= decayEnd)
                {
                    voice.volumeEnvelopeState++;
                }
                else
                {
                    dbAttenuation = (1 - (decayEnd - currentFrameTime) / decay) * (sustain - attenuation) + attenuation;
                    break
                }
            // fallthrough

            case 4:
                // sustain phase: stay at sustain
                dbAttenuation = sustain;

        }
        // apply gain and advance the time
        const gain = decibelAttenuationToGain(dbAttenuation + decibelOffset);
        audioBuffer[i] = audioBuffer[i] * gain;
        currentFrameTime += sampleTime;
    }
    voice.currentAttenuationDb = dbAttenuation;
}