/**
 * @typedef {{sampleID: number,
 * playbackStep: number,
 * cursor: number,
 * rootKey: number,
 * loopStart: number,
 * loopEnd: number,
 * end: number,
 * loopingMode: 0|1|2,
 * }} WorkletSample
 *
 *
 * @typedef {{
 *     a0: number,
 *     a1: number,
 *     a2: number,
 *     a3: number,
 *     a4: number,
 *
 *     x1: number,
 *     x2: number,
 *     y1: number,
 *     y2: number
 *
 *     reasonanceCb: number,
 *     reasonanceGain: number
 *
 *     cutoffCents: number,
 *     cutoffHz: number
 * }} WorkletLowpassFilter
 *
 * @typedef {{
 * sample: WorkletSample,
 * filter: WorkletLowpassFilter
 *
 * generators: Int16Array,
 * modulators: Modulator[],
 * modulatedGenerators: Int16Array,
 *
 * finished: boolean,
 * isInRelease: boolean,
 *
 * velocity: number,
 * midiNote: number,
 * targetKey: number,
 *
 * currentAttenuationDb: number,
 * currentModEnvValue: number,
 * startTime: number,
 *
 * releaseStartTime: number,
 * releaseStartModEnv: number,
 *
 * currentTuningCents: number,
 * currentTuningCalculated: number
 * }} WorkletVoice
 */
import { addAndClampGenerator, generatorTypes } from '../../../soundfont/chunk/generators.js'
import { workletMessageType } from '../worklet_channel.js'


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
 * @param sample {Sample}
 * @param id {number}
 * @param messagePort {MessagePort}
 * @param dumpedSamplesList {Set<number>}
 */
dumpSample(sample, id, messagePort, dumpedSamplesList)
{
    // flag as dumped so other calls won't dump it again
    dumpedSamplesList.add(id);

    // if uncompressed, load right away
    if(sample.isCompressed === false)
    {
        messagePort.postMessage({
            messageType: workletMessageType.sampleDump,
            messageData: {
                sampleID: id,
                sampleData: sample.getAudioDataSync()
            }
        });
        return;
    }

    // load the data
    sample.getAudioData().then(sampleData => {
        messagePort.postMessage({
            messageType: workletMessageType.sampleDump,
            messageData: {
                sampleID: id,
                sampleData: sampleData
            }
        });
    })
}

/**
 * @param midiNote {number}
 * @param velocity {number}
 * @param preset {Preset}
 * @param dumpedSamples {Set<number>}
 * @param context {BaseAudioContext}
 * @param workletMessagePort {MessagePort}
 * @param cachedVoices {WorkletVoice[][][]} first is midi note, second is velocity. output is an array of WorkletVoices
 * @param debug {boolean}
 * @returns {WorkletVoice[]}
 */
export function getWorkletVoices(midiNote, velocity, preset, dumpedSamples, context, workletMessagePort, cachedVoices, debug=false)
{
    /**
     * @type {WorkletVoice[]}
     */
    let workletVoices;

    const cached = cachedVoices[midiNote][velocity];
    if(cached)
    {
        workletVoices = cached;
        workletVoices.forEach(v => {
            v.startTime = context.currentTime;
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
            if (!dumpedSamples.has(sampleAndGenerators.sampleID)) {
                dumpSample(sampleAndGenerators.sample, sampleAndGenerators.sampleID, workletMessagePort, dumpedSamples);

                // can't cache the voice as the end in workletSample maybe is incorrect (the sample is still loading)
                if(sampleAndGenerators.sample.isSampleLoaded === false)
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
                playbackStep: (sampleAndGenerators.sample.sampleRate / context.sampleRate) * Math.pow(2, sampleAndGenerators.sample.samplePitchCorrection / 1200),// cent tuning
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
                console.table([{
                    Sample: sampleAndGenerators.sample,
                    Generators: generators,
                    Modulators: sampleAndGenerators.modulators.map(m => m.debugString()),
                    Velocity: velocity,
                    TargetKey: targetKey,
                    MidiNote: midiNote,
                    WorkletSample: workletSample
                }]);
            }

            return {
                filter: {
                    a0: 0,
                    a1: 0,
                    a2: 0,
                    a3: 0,
                    a4: 0,

                    x1: 0,
                    x2: 0,
                    y1: 0,
                    y2: 0,
                    reasonanceCb: 0,
                    reasonanceGain: 1,
                    cutoffCents: 13500,
                    cutoffHz: 20000
                },
                generators: generators,
                modulatedGenerators: new Int16Array(60),
                sample: workletSample,
                modulators: sampleAndGenerators.modulators,
                finished: false,
                velocity: velocity,
                currentAttenuationDb: 100,
                currentModEnvValue: 0,
                releaseStartModEnv: 1,
                midiNote: midiNote,
                startTime: context.currentTime,
                isInRelease: false,
                releaseStartTime: -1,
                targetKey: targetKey,
                currentTuningCalculated: 1,
                currentTuningCents: 0
            };

        });

        // cache the voice
        if(canCache) {
            cachedVoices[midiNote][velocity] = workletVoices;
        }
    }
    return workletVoices;
}