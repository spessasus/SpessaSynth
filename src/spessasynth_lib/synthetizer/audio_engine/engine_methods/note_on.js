import { computeModulators } from "../engine_components/compute_modulator.js";
import { generatorTypes } from "../../../soundfont/basic_soundfont/generator.js";
import { midiControllers } from "../../../midi/midi_message.js";
import { portamentoTimeToSeconds } from "./portamento_time.js";

/**
 * sends a "MIDI Note on message"
 * @param midiNote {number}
 * @param velocity {number}
 * @this {MidiAudioChannel}
 */
export function noteOn(midiNote, velocity)
{
    if (velocity < 1)
    {
        this.noteOff(midiNote);
        return;
    }
    velocity = Math.min(127, velocity);
    
    if (
        (this.synth.highPerformanceMode && this.synth.totalVoicesAmount > 200 && velocity < 40) ||
        (this.synth.highPerformanceMode && velocity < 10) ||
        (this.isMuted)
    )
    {
        return;
    }
    
    const realKey = midiNote + this.channelTransposeKeyShift;
    let sentMidiNote = realKey;
    
    if (realKey > 127 || realKey < 0)
    {
        return;
    }
    const program = this.preset.program;
    const tune = this.synth.tunings[program]?.[realKey]?.midiNote;
    if (tune >= 0)
    {
        sentMidiNote = tune;
    }
    
    // velocity override
    if (this.velocityOverride > 0)
    {
        velocity = this.velocityOverride;
    }
    
    // key velocity override
    const keyVel = this.synth.keyModifierManager.getVelocity(this.channelNumber, realKey);
    if (keyVel > -1)
    {
        velocity = keyVel;
    }
    
    // gain
    const voiceGain = this.synth.keyModifierManager.getGain(this.channelNumber, realKey);
    
    // portamento
    let portamentoFromKey = -1;
    let portamentoDuration = 0;
    // note: the 14-bit value needs to go down to 7-bit
    const portamentoTime = this.midiControllers[midiControllers.portamentoTime] >> 7;
    const control = this.midiControllers[midiControllers.portamentoControl];
    const currentFromKey = control >> 7;
    if (
        !this.drumChannel && // no portamento on drum channel
        currentFromKey !== sentMidiNote && // if the same note, there's no portamento
        this.midiControllers[midiControllers.portamentoOnOff] >= 8192 && // (64 << 7)
        portamentoTime > 0 // 0 duration is no portamento
    )
    {
        // a value of one means the initial portamento
        if (control !== 1)
        {
            const diff = Math.abs(sentMidiNote - currentFromKey);
            portamentoDuration = portamentoTimeToSeconds(portamentoTime, diff);
            portamentoFromKey = currentFromKey;
        }
        // set portamento control to previous value
        this.controllerChange(midiControllers.portamentoControl, sentMidiNote);
    }
    
    // get voices
    const voices = this.synth.getVoices(
        this.channelNumber,
        sentMidiNote,
        velocity,
        realKey
    );
    
    // zero means disabled
    let panOverride = 0;
    if (this.randomPan)
    {
        // the range is -500 to 500
        panOverride = Math.round(Math.random() * 1000 - 500);
    }
    
    // add voices
    const channelVoices = this.voices;
    voices.forEach(voice =>
    {
        // apply portamento
        voice.portamentoFromKey = portamentoFromKey;
        voice.portamentoDuration = portamentoDuration;
        
        // apply pan override
        voice.overridePan = panOverride;
        
        // apply gain override
        voice.gain = voiceGain;
        
        // apply exclusive class
        const exclusive = voice.exclusiveClass;
        if (exclusive !== 0)
        {
            // kill all voices with the same exclusive class
            channelVoices.forEach(v =>
            {
                if (v.exclusiveClass === exclusive)
                {
                    v.exclusiveRelease(this.synth.currentSynthTime);
                }
            });
        }
        // compute all modulators
        computeModulators(voice, this.midiControllers);
        // modulate sample offsets (these are not real time)
        const cursorStartOffset = voice.modulatedGenerators[generatorTypes.startAddrsOffset] + voice.modulatedGenerators[generatorTypes.startAddrsCoarseOffset] * 32768;
        const endOffset = voice.modulatedGenerators[generatorTypes.endAddrOffset] + voice.modulatedGenerators[generatorTypes.endAddrsCoarseOffset] * 32768;
        const loopStartOffset = voice.modulatedGenerators[generatorTypes.startloopAddrsOffset] + voice.modulatedGenerators[generatorTypes.startloopAddrsCoarseOffset] * 32768;
        const loopEndOffset = voice.modulatedGenerators[generatorTypes.endloopAddrsOffset] + voice.modulatedGenerators[generatorTypes.endloopAddrsCoarseOffset] * 32768;
        const sm = voice.sample;
        // apply them
        const clamp = num => Math.max(0, Math.min(sm.sampleData.length - 1, num));
        sm.cursor = clamp(sm.cursor + cursorStartOffset);
        sm.end = clamp(sm.end + endOffset);
        sm.loopStart = clamp(sm.loopStart + loopStartOffset);
        sm.loopEnd = clamp(sm.loopEnd + loopEndOffset);
        // swap loops if needed
        if (sm.loopEnd < sm.loopStart)
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
        voice.volumeEnvelope.attenuation = voice.volumeEnvelope.attenuationTargetGain;
        // set initial pan to avoid split second changing from middle to the correct value
        voice.currentPan = Math.max(-500, Math.min(500, voice.modulatedGenerators[generatorTypes.pan])); //  -500 to 500
    });
    
    this.synth.totalVoicesAmount += voices.length;
    // cap the voices
    if (this.synth.totalVoicesAmount > this.synth.voiceCap)
    {
        this.synth.voiceKilling(voices.length);
    }
    channelVoices.push(...voices);
    this.sendChannelProperty();
    this.synth.callEvent("noteon", {
        midiNote: midiNote,
        channel: this.channelNumber,
        velocity: velocity
    });
    
}