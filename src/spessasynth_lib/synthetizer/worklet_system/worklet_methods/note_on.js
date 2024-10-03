import { generatorTypes } from '../../../soundfont/read_sf2/generators.js'
import { computeModulators } from '../worklet_utilities/worklet_modulator.js'
import { WorkletVolumeEnvelope } from '../worklet_utilities/volume_envelope.js'
import { WorkletModulationEnvelope } from '../worklet_utilities/modulation_envelope.js'

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
    const voices = this.getWorkletVoices(
        channel,
        sentMidiNote,
        velocity,
        channelObject,
        startTime,
        enableDebugging
    );

    // add voices and exclusive class apply
    const channelVoices = channelObject.voices;
    voices.forEach(voice => {
        const exclusive = voice.generators[generatorTypes.exclusiveClass];
        if(exclusive !== 0)
        {
            // kill all voices with the same exclusive class
            channelVoices.forEach(v => {
                if(v.generators[generatorTypes.exclusiveClass] === exclusive)
                {
                    this.releaseVoice(v);
                    v.modulatedGenerators[generatorTypes.releaseVolEnv] = -7000; // make the release nearly instant
                    v.modulatedGenerators[generatorTypes.releaseModEnv] = -7000;
                    WorkletVolumeEnvelope.recalculate(v);
                    WorkletModulationEnvelope.recalculate(v);
                }
            })
        }
        // compute all modulators
        computeModulators(voice, channelObject.midiControllers);
        // modulate sample offsets (these are not real time)
        const cursorStartOffset = voice.modulatedGenerators[generatorTypes.startAddrsOffset] + voice.modulatedGenerators[generatorTypes.startAddrsCoarseOffset] * 32768;
        const endOffset = voice.modulatedGenerators[generatorTypes.endAddrOffset] + voice.modulatedGenerators[generatorTypes.endAddrsCoarseOffset] * 32768;
        const loopStartOffset = voice.modulatedGenerators[generatorTypes.startloopAddrsOffset] + voice.modulatedGenerators[generatorTypes.startloopAddrsCoarseOffset] * 32768;
        const loopEndOffset = voice.modulatedGenerators[generatorTypes.endloopAddrsOffset] + voice.modulatedGenerators[generatorTypes.endloopAddrsCoarseOffset] * 32768;
        const sm = voice.sample;
        // apply them
        const clamp = num => Math.max(0, Math.min(sm.sampleData.length, num));
        sm.cursor = clamp( sm.cursor + cursorStartOffset);
        sm.end = clamp(sm.end + endOffset);
        sm.loopStart = clamp(sm.loopStart + loopStartOffset);
        sm.loopEnd = clamp(sm.loopEnd + loopEndOffset);
        // swap loops if needed
        if(sm.loopEnd < sm.loopStart)
        {
            const temp = sm.loopStart;
            sm.loopStart = sm.loopEnd;
            sm.loopEnd = temp;
        }
        if (sm.loopEnd - sm.loopStart < 1)
        {
            sm.loopingMode = 0;
            sm.isLooping = false;
        }
        // set the current attenuation to target,
        // as it's interpolated (we don't want 0 attenuation for even a split second)
        voice.volumeEnvelope.attenuation = voice.volumeEnvelope.attenuationTarget;
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