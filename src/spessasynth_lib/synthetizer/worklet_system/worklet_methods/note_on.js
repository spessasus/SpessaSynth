import { getWorkletVoices } from '../worklet_utilities/worklet_voice.js'
import { generatorTypes } from '../../../soundfont/chunk/generators.js'
import { computeModulators } from '../worklet_utilities/worklet_modulator.js'
import { SpessaSynthWarn } from '../../../utils/loggin.js'

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
        SpessaSynthWarn(`Received a noteOn for note`, midiNote, "Ignoring.");
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
        // set initial pan to avoid split second changing from middle to the correct value
        voice.currentPan = ( (Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan] )) + 500) / 1000) // 0 to 1
    });

    this.totalVoicesAmount += voices.length;
    // cap the voices
    if(this.totalVoicesAmount > this.voiceCap)
    {
        this.voiceKilling(voices.length);
    }
    channelVoices.push(...voices);
    this.sendChannelProperties();
    this.callEvent("noteon", {
        midiNote: midiNote,
        channel: channel,
        velocity: velocity,
    });
}