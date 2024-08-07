import { getWorkletVoices } from '../worklet_utilities/worklet_voice.js'
import { generatorTypes } from '../../../soundfont/read/generators.js'
import { computeModulators } from '../worklet_utilities/worklet_modulator.js'
import { recalculateVolumeEnvelope } from '../worklet_utilities/volume_envelope.js'

/**
 * Append the voices
 * @param channel {number}
 * @param midiNote {number}
 * @param velocity {number}
 * @param enableDebugging {boolean}
 * @param sendEvent {boolean}
 * @param startTime {number}
 * @this {SpessaSynthProcessor}
 */
export function noteOn(channel, midiNote, velocity, enableDebugging = false, sendEvent = true, startTime = currentTime)
{
    if (velocity === 0)
    {
        this.noteOff(channel, midiNote);
        return;
    }

    const channelObject = this.workletProcessorChannels[channel]
    if (
        (this.highPerformanceMode && this.totalVoicesAmount > 200 && velocity < 40) ||
        (this.highPerformanceMode && velocity < 10) ||
        (channelObject.isMuted)
    )
    {
        return;
    }

    let sentMidiNote = midiNote + channelObject.channelTransposeKeyShift;

    if(midiNote > 127 || midiNote < 0)
    {
        return;
    }
    const program = channelObject.preset.program;
    if(this.tunings[program]?.[midiNote]?.midiNote >= 0)
    {
        sentMidiNote = this.tunings[program]?.[midiNote].midiNote;
    }

    // get voices
    const voices = getWorkletVoices(
        channel,
        sentMidiNote,
        velocity,
        channelObject.preset,
        startTime,
        sampleRate,
        data => this.sampleDump(
            data.channel,
            data.sampleID,
            data.sampleData
        ),
        channelObject.cachedVoices,
        channelObject.presetUsesOverride ? this.soundfont.samples.length : 0, // this is done to prevent samples overlapping
        enableDebugging
    );

    // add voices and exclusive class apply
    const channelVoices = channelObject.voices;
    voices.forEach(voice => {
        const exclusive = voice.generators[generatorTypes.exclusiveClass];
        if(exclusive !== 0)
        {
            channelVoices.forEach(v => {
                if(v.generators[generatorTypes.exclusiveClass] === exclusive)
                {
                    this.releaseVoice(v);
                    v.modulatedGenerators[generatorTypes.releaseVolEnv] = -7000; // make the release nearly instant
                    v.modulatedGenerators[generatorTypes.releaseModEnv] = -7000;
                    recalculateVolumeEnvelope(v);
                }
            })
        }
        // compute all modulators
        computeModulators(voice, channelObject.midiControllers);
        // set initial pan to avoid split second changing from middle to the correct value
        voice.currentPan = ((Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan] )) + 500) / 1000) // 0 to 1
    });

    this.totalVoicesAmount += voices.length;
    // cap the voices
    if(this.totalVoicesAmount > this.voiceCap)
    {
        this.voiceKilling(voices.length);
    }
    channelVoices.push(...voices);
    if(sendEvent)
    {
        this.sendChannelProperties();
        this.callEvent("noteon", {
            midiNote: midiNote,
            channel: channel,
            velocity: velocity,
        });
    }
}