/**
 * worklet_voice.js
 * purpose: prepares workletvoices from sample and generator data and manages sample dumping
 * note: sample dumping means sending it over to the AudioWorkletGlobalScope
 */

class WorkletSample
{
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
    }
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
     * 2 - loop then play when released
     * @type {0|1|2}
     */
    loopingMode = 0;
}

import { addAndClampGenerator, generatorTypes } from '../../../soundfont/read_sf2/generators.js'
import { SpessaSynthTable, SpessaSynthWarn } from '../../../utils/loggin.js'
import { WorkletLowpassFilter } from './lowpass_filter.js'
import { WorkletVolumeEnvelope } from './volume_envelope.js'
import { WorkletModulationEnvelope } from './modulation_envelope.js'


/**
 * WorkletVoice represents a single instance of the
 * SoundFont2 synthesis model.
 * That is:
 * A wavetable oscillator (sample)
 * A volume envelope (volumeEnvelope)
 * A modulation envelope (modulationEnvelope)
 * Generators (generators and modulatedGenerators)
 * Modulators (modulators)
 * And MIDI params such as channel, MIDI note, velocity
 */
class WorkletVoice
{
    /**
     * Creates a new voice
     * @param sampleRate {number}
     * @param workletSample {WorkletSample}
     * @param midiNote {number}
     * @param velocity {number}
     * @param channel {number}
     * @param currentTime {number}
     * @param targetKey {number}
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
        generators,
        modulators,
    )
    {
        this.sample = workletSample;
        this.generators = generators;
        this.modulatedGenerators = new Int16Array(generators);
        this.modulators = modulators;

        this.velocity = velocity;
        this.midiNote = midiNote;
        this.channelNumber = channel;
        this.startTime = currentTime;
        this.targetKey = targetKey;
        this.volumeEnvelope = new WorkletVolumeEnvelope(sampleRate);
    }
    /**
     * Sample ID for voice.
     * @type {WorkletSample}
     */
    sample;

    /**
     * Lowpass filter applied to the voice.
     * @type {WorkletLowpassFilter}
     */
    filter = new WorkletLowpassFilter();

    /**
     * The unmodulated (constant) generators of the voice.
     * @type {Int16Array}
     */
    generators;

    /**
     * The voice's modulators.
     * Grouped by the destination.
     * @type {Modulator[]}
     */
    modulators = [];

    /**
     * The generators modulated by the modulators.
     * @type {Int16Array}
     */
    modulatedGenerators;

    /**
     * Indicates if the voice has finished.
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
     * The pressure of the note.
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
     * @type {WorkletModulationEnvelope}
     */
    modulationEnvelope = new WorkletModulationEnvelope();

    /**
     * Volume envelope.
     * @type {WorkletVolumeEnvelope}
     */
    volumeEnvelope;

    /**
     * Start time of the voice absolute.
     * @type {number}
     */
    startTime = 0;

    /**
     * Start time of the release phase absolute.
     * @type {number}
     */
    releaseStartTime = Infinity;

    /**
     * Current tuning adjustment in cents.
     * @type {number}
     */
    currentTuningCents = 0;

    /**
     * Calculated tuning adjustment.
     * @type {number}
     */
    currentTuningCalculated = 1;

    /**
     * From 0 to 1.
     * @type {number}
     */
    currentPan = 0.5;

    /**
     * Copies a workletVoice instance
     * @param voice {WorkletVoice}
     * @param currentTime {number}
     * @returns WorkletVoice
     */
    static copy(voice, currentTime)
    {
        const sampleToCopy = voice.sample;
        const sample = new WorkletSample(
            sampleToCopy.sampleData,
            sampleToCopy.playbackStep,
            sampleToCopy.cursor,
            sampleToCopy.rootKey,
            sampleToCopy.loopStart,
            sampleToCopy.loopEnd,
            sampleToCopy.end,
            sampleToCopy.loopingMode
        )
        return new WorkletVoice(
            voice.volumeEnvelope.sampleRate,
            sample,
            voice.midiNote,
            voice.velocity,
            voice.channelNumber,
            currentTime,
            voice.targetKey,
            voice.generators,
            voice.modulators.slice()
        );
    }
}

/**
 * @param channel {number} a hint for the processor to recalculate sample cursors when sample dumping
 * @param midiNote {number}
 * @param velocity {number}
 * @param channelObject {WorkletProcessorChannel}
 * @param currentTime {number}
 * output is an array of WorkletVoices
 * @param debug {boolean}
 * @this {SpessaSynthProcessor}
 * @returns {WorkletVoice[]}
 */
export function getWorkletVoices(channel,
                                 midiNote,
                                 velocity,
                                 channelObject,
                                 currentTime,
                                 debug=false)
{
    /**
     * @type {WorkletVoice[]}
     */
    let workletVoices;

    const cached = channelObject.cachedVoices[midiNote][velocity];
    if(cached !== undefined)
    {
        workletVoices = cached.map(v => WorkletVoice.copy(v, currentTime));
    }
    else
    {
        const preset = channelObject.preset;
        /**
         * @returns {WorkletVoice[]}
         */
        workletVoices = preset.getSamplesAndGenerators(midiNote, velocity)
            .reduce((voices, sampleAndGenerators) => {
            if(sampleAndGenerators.sample.sampleData === undefined)
            {
                SpessaSynthWarn(`Discarding invalid sample: ${sampleAndGenerators.sample.sampleName}`);
                return voices;
            }

            // create the generator list
            const generators = new Int16Array(60);
            // apply and sum the gens
            for (let i = 0; i < 60; i++)
            {
                generators[i] = addAndClampGenerator(i, sampleAndGenerators.presetGenerators, sampleAndGenerators.instrumentGenerators);
            }

            // !! EMU initial attenuation correction, multiply initial attenuation by 0.4
            generators[generatorTypes.initialAttenuation] = Math.floor(generators[generatorTypes.initialAttenuation] * 0.4);

            // key override
            let rootKey = sampleAndGenerators.sample.samplePitch;
            if (generators[generatorTypes.overridingRootKey] > -1) {
                rootKey = generators[generatorTypes.overridingRootKey];
            }

            let targetKey = midiNote;
            if (generators[generatorTypes.keyNum] > -1) {
                targetKey = generators[generatorTypes.keyNum];
            }

            // determine looping mode now. if the loop is too small, disable
            let loopStart = (sampleAndGenerators.sample.sampleLoopStartIndex / 2) + (generators[generatorTypes.startloopAddrsOffset] + (generators[generatorTypes.startloopAddrsCoarseOffset] * 32768));
            let loopEnd = (sampleAndGenerators.sample.sampleLoopEndIndex / 2) + (generators[generatorTypes.endloopAddrsOffset] + (generators[generatorTypes.endloopAddrsCoarseOffset] * 32768));
            let loopingMode = generators[generatorTypes.sampleModes];
            const sampleLength = sampleAndGenerators.sample.getAudioData().length;
            // clamp loop
            loopStart = Math.min(Math.max(0, loopStart), sampleLength);
            // clamp loop
            loopEnd = Math.min(Math.max(0, loopEnd), sampleLength);
            if (loopEnd - loopStart < 1)
            {
                loopingMode = 0;
            }
            /**
             * create the worklet sample and calculate offsets
             * @type {WorkletSample}
             */
            const workletSample = new WorkletSample(
                sampleAndGenerators.sample.getAudioData(),
                (sampleAndGenerators.sample.sampleRate / sampleRate) * Math.pow(2, sampleAndGenerators.sample.samplePitchCorrection / 1200), // cent tuning
                generators[generatorTypes.startAddrsOffset] + (generators[generatorTypes.startAddrsCoarseOffset] * 32768),
                rootKey,
                loopStart,
                loopEnd,
                Math.floor( sampleAndGenerators.sample.sampleData.length) - 1 + (generators[generatorTypes.endAddrOffset] + (generators[generatorTypes.endAddrsCoarseOffset] * 32768)),
                loopingMode
            )
            // velocity override
            if (generators[generatorTypes.velocity] > -1)
            {
                velocity = generators[generatorTypes.velocity];
            }

            if(debug)
            {
                SpessaSynthTable([{
                    Sample: sampleAndGenerators.sample.sampleName,
                    Generators: generators,
                    Modulators: sampleAndGenerators.modulators.map(m => m.debugString()),
                    Velocity: velocity,
                    TargetKey: targetKey,
                    MidiNote: midiNote,
                    WorkletSample: workletSample
                }]);
            }


            voices.push(
                new WorkletVoice(
                    sampleRate,
                    workletSample,
                    midiNote,
                    velocity,
                    channel,
                    currentTime,
                    targetKey,
                    generators,
                    sampleAndGenerators.modulators
                )
            );
            return voices;
        }, []);
        // cache the voice
        channelObject.cachedVoices[midiNote][velocity] = workletVoices.map(v => WorkletVoice.copy(v, currentTime));
    }
    return workletVoices;
}