import { getWorkletVoices } from '../worklet_utilities/worklet_voice.js'
import { generatorTypes } from '../../../soundfont/chunk/generators.js'
import { computeModulators } from '../worklet_utilities/worklet_modulator.js'
import { VOICE_CAP } from '../../synthetizer.js'

/**
 * Append the voices
 * @param channel {number}
 * @param midiNote {number}
 * @param velocity {number}
 * @param enableDebugging {boolean}
 * @this {SpessaSynthProcessor}
 */
export function noteOn(channel, midiNote, velocity, enableDebugging = false)
{
    if (velocity === 0) {
        this.noteOff(channel, midiNote);
        return;
    }

    if (
        (this.highPerformanceMode && this.totalVoicesAmount > 200 && velocity < 40) ||
        (this.highPerformanceMode && velocity < 10) ||
        (this.workletProcessorChannels[channel].isMuted)
    ) {
        return;
    }

    if(midiNote > 127 || midiNote < 0)
    {
        console.warn(`Received a noteOn for note`, midiNote, "Ignoring.");
        return;
    }


    // get voices
    const voices = getWorkletVoices(
        channel,
        midiNote,
        velocity,
        this.workletProcessorChannels[channel].preset,
        currentTime,
        sampleRate,
        data => this.sampleDump(data.channel, data.sampleID, data.sampleData),
        this.workletProcessorChannels[channel].cachedVoices,
        enableDebugging);

    // add voices and exclusive class apply
    const channelVoices = this.workletProcessorChannels[channel].voices;
    voices.forEach(voice => {
        const exclusive = voice.generators[generatorTypes.exclusiveClass];
        if(exclusive !== 0)
        {
            channelVoices.forEach(v => {
                if(v.generators[generatorTypes.exclusiveClass] === exclusive)
                {
                    this.releaseVoice(v);
                    v.generators[generatorTypes.releaseVolEnv] = -7200; // make the release nearly instant
                    computeModulators(v, this.workletProcessorChannels[channel].midiControllers);
                }
            })
        }
        computeModulators(voice, this.workletProcessorChannels[channel].midiControllers);
        voice.currentAttenuationDb = 100;
    })
    channelVoices.push(...voices);

    this.totalVoicesAmount += voices.length;
    // cap the voices
    if(this.totalVoicesAmount > VOICE_CAP)
    {
        this.voiceKilling(this.totalVoicesAmount - VOICE_CAP);
    }
    else {
        this.sendChannelProperties();
    }
    this.callEvent("noteon", {
        midiNote: voices[0].midiNote,
        channel: channel,
        velocity: voices[0].velocity,
    });
}