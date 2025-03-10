import { WorkletVolumeEnvelope } from "../worklet_utilities/volume_envelope.js";
import { WorkletModulationEnvelope } from "../worklet_utilities/modulation_envelope.js";
import { generatorTypes } from "../../../soundfont/basic_soundfont/generator.js";
import { customControllers } from "../worklet_utilities/controller_tables.js";
import { absCentsToHz, timecentsToSeconds } from "../worklet_utilities/unit_converter.js";
import { getLFOValue } from "../worklet_utilities/lfo.js";
import {
    getSampleCubic,
    getSampleLinear,
    getSampleNearest,
    interpolationTypes
} from "../worklet_utilities/wavetable_oscillator.js";
import { WorkletLowpassFilter } from "../worklet_utilities/lowpass_filter.js";

/**
 * Renders a voice to the stereo output buffer
 * @param channel {WorkletProcessorChannel} the voice's channel
 * @param voice {WorkletVoice} the voice to render
 * @param outputLeft {Float32Array} the left output buffer
 * @param outputRight {Float32Array} the right output buffer
 * @param reverbOutput {Float32Array[]} output for reverb
 * @param chorusOutput {Float32Array[]} output for chorus
 * @this {SpessaSynthProcessor}
 */
export function renderVoice(
    channel,
    voice,
    outputLeft, outputRight,
    reverbOutput,
    chorusOutput
)
{
    // check if release
    if (!voice.isInRelease)
    {
        // if not in release, check if the release time is
        if (currentTime >= voice.releaseStartTime)
        {
            // release the voice here
            voice.isInRelease = true;
            WorkletVolumeEnvelope.startRelease(voice);
            WorkletModulationEnvelope.startRelease(voice);
            if (voice.sample.loopingMode === 3)
            {
                voice.sample.isLooping = false;
            }
        }
    }
    
    
    // if the initial attenuation is more than 100dB, skip the voice (it's silent anyway)
    if (voice.modulatedGenerators[generatorTypes.initialAttenuation] > 2500)
    {
        if (voice.isInRelease)
        {
            voice.finished = true;
        }
        return;
    }
    
    // TUNING
    let targetKey = voice.targetKey;
    
    // calculate tuning
    let cents = voice.modulatedGenerators[generatorTypes.fineTune]             // soundfont fine tune
        + channel.customControllers[customControllers.channelTuning]           // RPN channel fine tuning
        + channel.customControllers[customControllers.channelTransposeFine]    // custom tuning (synth.transpose)
        + channel.customControllers[customControllers.masterTuning]            // master tuning, set by sysEx
        + channel.channelOctaveTuning[voice.midiNote % 12]                     // MTS octave tuning
        + channel.keyCentTuning[voice.midiNote];                           // SysEx key tuning
    let semitones = voice.modulatedGenerators[generatorTypes.coarseTune]       // soundfont coarse tuning
        + channel.customControllers[customControllers.channelTuningSemitones]; // RPN channel coarse tuning
    
    // midi tuning standard
    const tuning = this.tunings[channel.preset.program]?.[voice.realKey];
    if (tuning?.midiNote >= 0)
    {
        // override key
        targetKey = tuning.midiNote;
        // add micro-tonal tuning
        cents += tuning.centTuning;
    }
    
    // portamento
    if (voice.portamentoFromKey > -1)
    {
        // 0 to 1
        const elapsed = Math.min((currentTime - voice.startTime) / voice.portamentoDuration, 1);
        const diff = targetKey - voice.portamentoFromKey;
        // zero progress means the pitch being in fromKey, full progress means the normal pitch
        semitones -= diff * (1 - elapsed);
    }
    
    // calculate tuning by key using soundfont's scale tuning
    cents += (targetKey - voice.sample.rootKey) * voice.modulatedGenerators[generatorTypes.scaleTuning];
    
    // vibrato LFO
    const vibratoDepth = voice.modulatedGenerators[generatorTypes.vibLfoToPitch];
    if (vibratoDepth !== 0)
    {
        // calculate start time and lfo value
        const vibStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayVibLFO]);
        const vibFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqVibLFO]);
        const lfoVal = getLFOValue(vibStart, vibFreqHz, currentTime);
        // use modulation multiplier (RPN modulation depth)
        cents += lfoVal * (vibratoDepth * channel.customControllers[customControllers.modulationMultiplier]);
    }
    
    // low pass frequency
    const initialFc = voice.modulatedGenerators[generatorTypes.initialFilterFc];
    let lowpassCents = initialFc;
    
    // mod LFO
    const modPitchDepth = voice.modulatedGenerators[generatorTypes.modLfoToPitch];
    const modVolDepth = voice.modulatedGenerators[generatorTypes.modLfoToVolume];
    const modFilterDepth = voice.modulatedGenerators[generatorTypes.modLfoToFilterFc];
    let modLfoCentibels = 0;
    if (modPitchDepth + modFilterDepth + modVolDepth !== 0)
    {
        // calculate start time and lfo value
        const modStart = voice.startTime + timecentsToSeconds(voice.modulatedGenerators[generatorTypes.delayModLFO]);
        const modFreqHz = absCentsToHz(voice.modulatedGenerators[generatorTypes.freqModLFO]);
        const modLfoValue = getLFOValue(modStart, modFreqHz, currentTime);
        // use modulation multiplier (RPN modulation depth)
        cents += modLfoValue * (modPitchDepth * channel.customControllers[customControllers.modulationMultiplier]);
        // vole nv volume offset
        // negate the lfo value because audigy starts with increase rather than decrease
        modLfoCentibels = -modLfoValue * modVolDepth;
        // low pass frequency
        lowpassCents += modLfoValue * modFilterDepth;
    }
    
    // channel vibrato (GS NRPN)
    if (channel.channelVibrato.depth > 0)
    {
        // same as others
        const channelVibrato = getLFOValue(
            voice.startTime + channel.channelVibrato.delay,
            channel.channelVibrato.rate,
            currentTime
        );
        if (channelVibrato)
        {
            cents += channelVibrato * channel.channelVibrato.depth;
        }
    }
    
    // mod env
    const modEnvPitchDepth = voice.modulatedGenerators[generatorTypes.modEnvToPitch];
    const modEnvFilterDepth = voice.modulatedGenerators[generatorTypes.modEnvToFilterFc];
    const modEnv = WorkletModulationEnvelope.getValue(voice, currentTime);
    // apply values
    lowpassCents += modEnv * modEnvFilterDepth;
    cents += modEnv * modEnvPitchDepth;
    
    // finally, calculate the playback rate
    const centsTotal = ~~(cents + semitones * 100);
    if (centsTotal !== voice.currentTuningCents)
    {
        voice.currentTuningCents = centsTotal;
        voice.currentTuningCalculated = Math.pow(2, centsTotal / 1200);
    }
    
    
    // SYNTHESIS
    const bufferOut = new Float32Array(outputLeft.length);
    
    // wave table oscillator
    switch (this.interpolationType)
    {
        case interpolationTypes.linear:
        default:
            getSampleLinear(voice, bufferOut);
            break;
        
        case interpolationTypes.nearestNeighbor:
            getSampleNearest(voice, bufferOut);
            break;
        
        case interpolationTypes.fourthOrder:
            getSampleCubic(voice, bufferOut);
    }
    
    /* low pass filter
     * note: the check is because of the filter optimization (if cents are the maximum then the filter is open)
     * filter cannot use this optimization if it's dynamic (see #53)
     *, and the filter can only be dynamic if the initial filter is not open
     */
    WorkletLowpassFilter.apply(voice, bufferOut, lowpassCents, initialFc > 13499);
    
    // vol env
    WorkletVolumeEnvelope.apply(voice, bufferOut, modLfoCentibels, this.volumeEnvelopeSmoothingFactor);
    
    this.panVoice(
        voice,
        bufferOut,
        outputLeft, outputRight,
        reverbOutput,
        chorusOutput
    );
}