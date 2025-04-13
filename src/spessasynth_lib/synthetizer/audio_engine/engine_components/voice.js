/**
 * voice.js
 * purpose: prepares Voices from sample and generator data and manages sample dumping
 * note: sample dumping means sending it over to the AudioWorkletGlobalScope
 */
import { MIN_EXCLUSIVE_LENGTH, MIN_NOTE_LENGTH } from "../main_processor.js";
import { SpessaSynthWarn } from "../../../utils/loggin.js";
import { WorkletLowpassFilter } from "./lowpass_filter.js";
import { VolumeEnvelope } from "./volume_envelope.js";
import { ModulationEnvelope } from "./modulation_envelope.js";
import { addAndClampGenerator, generatorTypes } from "../../../soundfont/basic_soundfont/generator.js";
import { Modulator } from "../../../soundfont/basic_soundfont/modulator.js";
import { isSystemXG } from "../../../utils/xg_hacks.js";

const EXCLUSIVE_CUTOFF_TIME = -2320;
const EXCLUSIVE_MOD_CUTOFF_TIME = -1130; // less because filter shenanigans

class AudioSample
{
    /**
     * the sample's audio data
     * @type {Float32Array}
     */
    sampleData;
    /**
     * Current playback step (rate)
     * @type {number}
     */
    playbackStep = 0;
    /**
     * Current position in the sample
     * @type {number}
     */
    cursor = 0;
    /**
     * MIDI root key of the sample
     * @type {number}
     */
    rootKey = 0;
    /**
     * Start position of the loop
     * @type {number}
     */
    loopStart = 0;
    /**
     * End position of the loop
     * @type {number}
     */
    loopEnd = 0;
    /**
     * End position of the sample
     * @type {number}
     */
    end = 0;
    /**
     * Looping mode of the sample:
     * 0 - no loop
     * 1 - loop
     * 2 - UNOFFICIAL: polyphone 2.4 added start on release
     * 3 - loop then play when released
     * @type {0|1|2|3}
     */
    loopingMode = 0;
    /**
     * Indicates if the sample is currently looping
     * @type {boolean}
     */
    isLooping = false;
    
    /**
     * @param data {Float32Array}
     * @param playbackStep {number} the playback step, a single increment
     * @param cursorStart {number} the sample id which starts the playback
     * @param rootKey {number} MIDI root key
     * @param loopStart {number} loop start index
     * @param loopEnd {number} loop end index
     * @param endIndex {number} sample end index (for end offset)
     * @param loopingMode {number} sample looping mode
     */
    constructor(
        data,
        playbackStep,
        cursorStart,
        rootKey,
        loopStart,
        loopEnd,
        endIndex,
        loopingMode
    )
    {
        this.sampleData = data;
        this.playbackStep = playbackStep;
        this.cursor = cursorStart;
        this.rootKey = rootKey;
        this.loopStart = loopStart;
        this.loopEnd = loopEnd;
        this.end = endIndex;
        this.loopingMode = loopingMode;
        this.isLooping = this.loopingMode === 1 || this.loopingMode === 3;
    }
}


/**
 * Voice represents a single instance of the
 * SoundFont2 synthesis model.
 * That is:
 * A wavetable oscillator (sample)
 * A volume envelope (volumeEnvelope)
 * A modulation envelope (modulationEnvelope)
 * Generators (generators and modulatedGenerators)
 * Modulators (modulators)
 * And MIDI params such as channel, MIDI note, velocity
 */
class Voice
{
    /**
     * The sample of the voice.
     * @type {AudioSample}
     */
    sample;
    
    /**
     * Lowpass filter applied to the voice.
     * @type {WorkletLowpassFilter}
     */
    filter;
    
    /**
     * Linear gain of the voice. Used with Key Modifiers.
     * @type {number}
     */
    gain = 1;
    
    /**
     * The unmodulated (copied to) generators of the voice.
     * @type {Int16Array}
     */
    generators;
    
    /**
     * The voice's modulators.
     * @type {Modulator[]}
     */
    modulators = [];
    
    /**
     * The generators in real-time, affected by modulators.
     * This is used during rendering.
     * @type {Int16Array}
     */
    modulatedGenerators;
    
    /**
     * Indicates if the voice is finished.
     * @type {boolean}
     */
    finished = false;
    
    /**
     * Indicates if the voice is in the release phase.
     * @type {boolean}
     */
    isInRelease = false;
    
    /**
     * MIDI channel number.
     * @type {number}
     */
    channelNumber = 0;
    
    /**
     * Velocity of the note.
     * @type {number}
     */
    velocity = 0;
    
    /**
     * MIDI note number.
     * @type {number}
     */
    midiNote = 0;
    
    /**
     * The pressure of the voice
     * @type {number}
     */
    pressure = 0;
    
    /**
     * Target key for the note.
     * @type {number}
     */
    targetKey = 0;
    
    /**
     * Modulation envelope.
     * @type {ModulationEnvelope}
     */
    modulationEnvelope = new ModulationEnvelope();
    
    /**
     * Volume envelope.
     * @type {VolumeEnvelope}
     */
    volumeEnvelope;
    
    /**
     * Start time of the voice, absolute.
     * @type {number}
     */
    startTime = 0;
    
    /**
     * Start time of the release phase, absolute.
     * @type {number}
     */
    releaseStartTime = Infinity;
    
    /**
     * Current tuning in cents.
     * @type {number}
     */
    currentTuningCents = 0;
    
    /**
     * Current calculated tuning. (as in ratio)
     * @type {number}
     */
    currentTuningCalculated = 1;
    
    /**
     * From -500 to 500.
     * @param {number}
     */
    currentPan = 0;
    
    /**
     * If MIDI Tuning Standard is already applied (at note-on time),
     * this will be used to take the values at real-time tuning as "midiNote"
     * property contains the tuned number.
     * see #29 comment by @paulikaro
     * @type {number}
     */
    realKey;
    
    /**
     * @type {number} Initial key to glide from, MIDI Note number. If -1, the portamento is OFF.
     */
    portamentoFromKey = -1;
    
    /**
     * Duration of the linear glide, in seconds.
     * @type {number}
     */
    portamentoDuration = 0;
    
    /**
     * From -500 to 500, where zero means disabled (use the channel pan). Used for random pan.
     * @type {number}
     */
    overridePan = 0;
    
    /**
     * Exclusive class number for hi-hats etc.
     * @type {number}
     */
    exclusiveClass = 0;
    
    /**
     * Creates a Voice
     * @param sampleRate {number}
     * @param workletSample {AudioSample}
     * @param midiNote {number}
     * @param velocity {number}
     * @param channel {number}
     * @param currentTime {number}
     * @param targetKey {number}
     * @param realKey {number}
     * @param generators {Int16Array}
     * @param modulators {Modulator[]}
     */
    constructor(
        sampleRate,
        workletSample,
        midiNote,
        velocity,
        channel,
        currentTime,
        targetKey,
        realKey,
        generators,
        modulators
    )
    {
        this.sample = workletSample;
        this.generators = generators;
        this.exclusiveClass = this.generators[generatorTypes.exclusiveClass];
        this.modulatedGenerators = new Int16Array(generators);
        this.modulators = modulators;
        this.filter = new WorkletLowpassFilter(sampleRate);
        
        this.velocity = velocity;
        this.midiNote = midiNote;
        this.channelNumber = channel;
        this.startTime = currentTime;
        this.targetKey = targetKey;
        this.realKey = realKey;
        this.volumeEnvelope = new VolumeEnvelope(sampleRate, generators[generatorTypes.sustainVolEnv]);
    }
    
    /**
     * copies the voice
     * @param voice {Voice}
     * @param currentTime {number}
     * @param realKey {number}
     * @returns Voice
     */
    static copy(voice, currentTime, realKey)
    {
        const sampleToCopy = voice.sample;
        const sample = new AudioSample(
            sampleToCopy.sampleData,
            sampleToCopy.playbackStep,
            sampleToCopy.cursor,
            sampleToCopy.rootKey,
            sampleToCopy.loopStart,
            sampleToCopy.loopEnd,
            sampleToCopy.end,
            sampleToCopy.loopingMode
        );
        return new Voice(
            voice.volumeEnvelope.sampleRate,
            sample,
            voice.midiNote,
            voice.velocity,
            voice.channelNumber,
            currentTime,
            voice.targetKey,
            realKey,
            voice.generators,
            voice.modulators.map(m => Modulator.copy(m))
        );
    }
    
    /**
     * Releases the voice as exclusiveClass
     * @param currentTime {number}
     */
    exclusiveRelease(currentTime)
    {
        this.release(currentTime, MIN_EXCLUSIVE_LENGTH);
        this.modulatedGenerators[generatorTypes.releaseVolEnv] = EXCLUSIVE_CUTOFF_TIME; // make the release nearly instant
        this.modulatedGenerators[generatorTypes.releaseModEnv] = EXCLUSIVE_MOD_CUTOFF_TIME;
        VolumeEnvelope.recalculate(this);
        ModulationEnvelope.recalculate(this);
    }
    
    /**
     * Stops the voice
     * @param currentTime {number}
     * @param minNoteLength {number} minimum note length in seconds
     */
    release(currentTime, minNoteLength = MIN_NOTE_LENGTH)
    {
        this.releaseStartTime = currentTime;
        // check if the note is shorter than the min note time, if so, extend it
        if (this.releaseStartTime - this.startTime < minNoteLength)
        {
            this.releaseStartTime = this.startTime + minNoteLength;
        }
    }
}

/**
 * @param channel {number} a hint for the processor to recalculate sample cursors when sample dumping
 * @param midiNote {number} the MIDI note to use
 * @param velocity {number} the velocity to use
 * @param realKey {number} the real MIDI note if the "midiNote" was changed by MIDI Tuning Standard
 * @this {SpessaSynthProcessor}
 * @returns {Voice[]} output is an array of Voices
 */
export function getVoices(channel,
                          midiNote,
                          velocity,
                          realKey)
{
    /**
     * @type {Voice[]}
     */
    let voices;
    const channelObject = this.midiAudioChannels[channel];
    
    // override patch
    const overridePatch = this.keyModifierManager.hasOverridePatch(channel, midiNote);
    
    let bank = channelObject.getBankSelect();
    let program = channelObject.preset.program;
    if (overridePatch)
    {
        const override = this.keyModifierManager.getPatch(channel, midiNote);
        bank = override.bank;
        program = override.program;
    }
    
    const cached = this.getCachedVoice(bank, program, midiNote, velocity);
    // if cached, return it!
    if (cached !== undefined)
    {
        return cached.map(v => Voice.copy(v, this.currentSynthTime, realKey));
    }
    
    // not cached...
    let preset = channelObject.preset;
    if (overridePatch)
    {
        preset = this.soundfontManager.getPreset(bank, program, isSystemXG(this.system));
    }
    /**
     * @returns {Voice[]}
     */
    voices = preset.getSamplesAndGenerators(midiNote, velocity)
        .reduce((voices, sampleAndGenerators) =>
        {
            if (sampleAndGenerators.sample.getAudioData() === undefined)
            {
                SpessaSynthWarn(`Discarding invalid sample: ${sampleAndGenerators.sample.sampleName}`);
                return voices;
            }
            
            // create the generator list
            const generators = new Int16Array(60);
            // apply and sum the gens
            for (let i = 0; i < 60; i++)
            {
                generators[i] = addAndClampGenerator(
                    i,
                    sampleAndGenerators.presetGenerators,
                    sampleAndGenerators.instrumentGenerators
                );
            }
            
            // !! EMU initial attenuation correction, multiply initial attenuation by 0.4
            generators[generatorTypes.initialAttenuation] = Math.floor(generators[generatorTypes.initialAttenuation] * 0.4);
            
            // key override
            let rootKey = sampleAndGenerators.sample.samplePitch;
            if (generators[generatorTypes.overridingRootKey] > -1)
            {
                rootKey = generators[generatorTypes.overridingRootKey];
            }
            
            let targetKey = midiNote;
            if (generators[generatorTypes.keyNum] > -1)
            {
                targetKey = generators[generatorTypes.keyNum];
            }
            
            // determine looping mode now. if the loop is too small, disable
            let loopStart = sampleAndGenerators.sample.sampleLoopStartIndex;
            let loopEnd = sampleAndGenerators.sample.sampleLoopEndIndex;
            let loopingMode = generators[generatorTypes.sampleModes];
            /**
             * create the worklet sample
             * offsets are calculated at note on time (to allow for modulation of them)
             * @type {AudioSample}
             */
            const workletSample = new AudioSample(
                sampleAndGenerators.sample.sampleData,
                (sampleAndGenerators.sample.sampleRate / this.sampleRate) * Math.pow(
                    2,
                    sampleAndGenerators.sample.samplePitchCorrection / 1200
                ), // cent tuning
                0,
                rootKey,
                loopStart,
                loopEnd,
                Math.floor(sampleAndGenerators.sample.sampleData.length) - 1,
                loopingMode
            );
            // velocity override
            if (generators[generatorTypes.velocity] > -1)
            {
                velocity = generators[generatorTypes.velocity];
            }
            
            // uncomment to print debug info
            // SpessaSynthTable([{
            //     Sample: sampleAndGenerators.sample.sampleName,
            //     Generators: generators,
            //     Modulators: sampleAndGenerators.modulators.map(m => Modulator.debugString(m)),
            //     Velocity: velocity,
            //     TargetKey: targetKey,
            //     MidiNote: midiNote,
            //     AudioSample: workletSample
            // }]);
            
            
            voices.push(
                new Voice(
                    this.sampleRate,
                    workletSample,
                    midiNote,
                    velocity,
                    channel,
                    this.currentSynthTime,
                    targetKey,
                    realKey,
                    generators,
                    sampleAndGenerators.modulators.map(m => Modulator.copy(m))
                )
            );
            return voices;
        }, []);
    // cache the voice
    this.setCachedVoice(bank, program, midiNote, velocity, voices.map(v =>
        Voice.copy(v, this.currentSynthTime, realKey)));
    return voices;
}