/**
 * worklet_voice.js
 * purpose: prepares workletvoices from sample and generator data and manages sample dumping
 * note: sample dumping means sending it over to the AudioWorkletGlobalScope
 */

/**
 * @typedef {Object} WorkletSample
 * @property {number} sampleID - ID of the sample
 * @property {number} playbackStep - current playback step (rate)
 * @property {number} cursor - current position in the sample
 * @property {number} rootKey - root key of the sample
 * @property {number} loopStart - start position of the loop
 * @property {number} loopEnd - end position of the loop
 * @property {number} end - end position of the sample
 * @property {0|1|2} loopingMode - looping mode of the sample
 */

/**
 * @typedef {Object} WorkletVoice
 * @property {WorkletSample} sample - sample ID for voice.
 * @property {WorkletLowpassFilter} filter - lowpass filter applied to the voice
 * @property {Int16Array} generators - the unmodulated (constant) generators of the voice
 * @property {Modulator[]} modulators - the voice's modulators
 * @property {Int16Array} modulatedGenerators - the generators modulated by the modulators
 *
 * @property {boolean} finished - indicates if the voice has finished
 * @property {boolean} isInRelease - indicates if the voice is in the release phase
 * @property {boolean} hasStarted - indicates if the voice has started rendering
 *
 * @property {number} channelNumber - MIDI channel number
 * @property {number} velocity - velocity of the note
 * @property {number} midiNote - MIDI note number
 * @property {number} targetKey - target key for the note
 *
 * @property {WorkletVolumeEnvelope} volumeEnvelope
 *
 * @property {number} currentModEnvValue - current value of the modulation envelope
 * @property {number} releaseStartModEnv - modenv value at the start of the release phase
 *
 * @property {number} startTime - start time of the voice
 * @property {number} releaseStartTime - start time of the release phase
 *
 * @property {number} currentTuningCents - current tuning adjustment in cents
 * @property {number} currentTuningCalculated - calculated tuning adjustment
 * @property {number} currentPan - from 0 to 1
 */

import { addAndClampGenerator, generatorTypes } from '../../../soundfont/chunk/generators.js'
import { SpessaSynthTable } from '../../../utils/loggin.js'
import { DEFAULT_WORKLET_VOLUME_ENVELOPE } from './volume_envelope.js'
import { DEFAULT_WORKLET_LOWPASS_FILTER } from './lowpass_filter.js'


/**
 * the sampleID is the index
 * @type {boolean[]}
 */
let globalDumpedSamplesList = [];

export function clearSamplesList()
{
    globalDumpedSamplesList = [];
}

function /**
 * This is how the logic works: since sf3 is compressed, we rely on an async decoder.
 * So, if the sample isn't loaded yet:
 * send the workletVoice (generators, modulators, etc) and the WorkletSample(sampleID + end offset + loop)
 * once the voice is done, then we dump it.
 *
 * on the WorkletScope side:
 * skip the voice if sampleID isn't valid
 * once we receive a sample dump, adjust all voice endOffsets (loop is already correct in sf3)
 * now the voice starts playing, yay!
 * @param channel {number} channel hint for the processor to recalculate cursor positions
 * @param sample {Sample}
 * @param id {number}
 * @param sampleDumpCallback {function({channel: number, sampleID: number, sampleData: Float32Array})}
 */
dumpSample(channel, sample, id, sampleDumpCallback)
{
    // flag as defined, so it's currently being dumped
    globalDumpedSamplesList[id] = false;

    // load the data
    sampleDumpCallback({
        channel: channel,
        sampleID: id,
        sampleData: sample.getAudioData()
    });
    globalDumpedSamplesList[id] = true;
}

/**
 * Deep clone function for the WorkletVoice object and its nested structures.
 * This function handles Int16Array, objects, arrays, and primitives.
 * It does not handle circular references.
 * @param {WorkletVoice} obj - The object to clone.
 * @returns {WorkletVoice} - Cloned object.
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Handle Int16Array separately
    if (obj instanceof Int16Array) {
        return new Int16Array(obj);
    }

    // Handle objects and arrays
    const clonedObj = Array.isArray(obj) ? [] : {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                clonedObj[key] = deepClone(obj[key]); // Recursively clone nested objects
            } else if (obj[key] instanceof Int16Array) {
                clonedObj[key] = new Int16Array(obj[key]); // Clone Int16Array
            } else {
                clonedObj[key] = obj[key]; // Copy primitives
            }
        }
    }
    return clonedObj;
}


/**
 * @param channel {number} a hint for the processor to recalculate sample cursors when sample dumping
 * @param midiNote {number}
 * @param velocity {number}
 * @param preset {Preset}
 * @param currentTime {number}
 * @param sampleRate {number}
 * @param sampleDumpCallback {function({channel: number, sampleID: number, sampleData: Float32Array})}
 * @param cachedVoices {WorkletVoice[][][]} first is midi note, second is velocity. output is an array of WorkletVoices
 * @param debug {boolean}
 * @returns {WorkletVoice[]}
 */
export function getWorkletVoices(channel,
                                 midiNote,
                                 velocity,
                                 preset,
                                 currentTime,
                                 sampleRate,
                                 sampleDumpCallback,
                                 cachedVoices,
                                 debug=false)
{
    /**
     * @type {WorkletVoice[]}
     */
    let workletVoices;

    const cached = cachedVoices[midiNote][velocity];
    if(cached)
    {
        workletVoices = cached.map(deepClone);
        workletVoices.forEach(v => {
            v.startTime = currentTime;
        });
    }
    else
    {
        let canCache = true;
        /**
         * @returns {WorkletVoice}
         */
        workletVoices = preset.getSamplesAndGenerators(midiNote, velocity).map(sampleAndGenerators => {
            // dump the sample if haven't already
            if (globalDumpedSamplesList[sampleAndGenerators.sampleID] !== true) {
                // if the sample is currently being loaded, don't dump again (undefined means not loaded, false means is being loaded)
                if(globalDumpedSamplesList[sampleAndGenerators.sampleID] === undefined) {
                    dumpSample(channel, sampleAndGenerators.sample, sampleAndGenerators.sampleID, sampleDumpCallback);
                }

                // can't cache the voice as the end in workletSample maybe is incorrect (the sample is still loading)
                if(globalDumpedSamplesList[sampleAndGenerators.sampleID] !== true)
                {
                    canCache = false;
                }
            }

            // create the generator list
            const generators = new Int16Array(60);
            // apply and sum the gens
            for (let i = 0; i < 60; i++) {
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
            const loopStart = (sampleAndGenerators.sample.sampleLoopStartIndex / 2) + (generators[generatorTypes.startloopAddrsOffset] + (generators[generatorTypes.startloopAddrsCoarseOffset] * 32768));
            const loopEnd = (sampleAndGenerators.sample.sampleLoopEndIndex / 2) + (generators[generatorTypes.endloopAddrsOffset] + (generators[generatorTypes.endloopAddrsCoarseOffset] * 32768));
            let loopingMode = generators[generatorTypes.sampleModes];
            if (loopEnd - loopStart < 1) {
                loopingMode = 0;
            }

            // determine end
            /**
             * create the worklet sample
             * @type {WorkletSample}
             */
            const workletSample = {
                sampleID: sampleAndGenerators.sampleID,
                playbackStep: (sampleAndGenerators.sample.sampleRate / sampleRate) * Math.pow(2, sampleAndGenerators.sample.samplePitchCorrection / 1200),// cent tuning
                cursor: generators[generatorTypes.startAddrsOffset] + (generators[generatorTypes.startAddrsCoarseOffset] * 32768),
                rootKey: rootKey,
                loopStart: loopStart,
                loopEnd: loopEnd,
                end: Math.floor( sampleAndGenerators.sample.sampleData.length) - 1 + (generators[generatorTypes.endAddrOffset] + (generators[generatorTypes.endAddrsCoarseOffset] * 32768)),
                loopingMode: loopingMode
            };

            // velocity override
            if (generators[generatorTypes.velocity] > -1) {
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

            return {
                filter: deepClone(DEFAULT_WORKLET_LOWPASS_FILTER),
                // generators and modulators
                generators: generators,
                modulators: sampleAndGenerators.modulators,
                modulatedGenerators: new Int16Array(60),

                // sample and playback data
                sample: workletSample,
                velocity: velocity,
                midiNote: midiNote,
                channelNumber: channel,
                startTime: currentTime,
                targetKey: targetKey,
                currentTuningCalculated: 1,
                currentTuningCents: 0,
                releaseStartTime: Infinity,

                // envelope data
                finished: false,
                isInRelease: false,
                hasStarted: false,
                currentModEnvValue: 0,
                releaseStartModEnv: 1,
                currentPan: 0.5,

                volumeEnvelope: deepClone(DEFAULT_WORKLET_VOLUME_ENVELOPE)
            };

        });
        // cache the voice
        if(canCache) {
            // clone it so the system won't mess with it!
            cachedVoices[midiNote][velocity] = workletVoices.map(deepClone);
        }
    }
    return workletVoices;
}