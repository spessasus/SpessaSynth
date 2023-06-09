import {Preset} from "../../../soundfont/chunk/presets.js";
import {GeneratorTranslator} from "./preset_note/generator_translator.js";
import {SampleNode} from "./preset_note/sample_node.js";
import {SoundFont2} from "../../../soundfont/soundfont_parser.js";

export class PresetNote
{
    /**
     * Create a note
     * @param midiNote {number}
     * @param node {AudioNode}
     * @param soundFont {SoundFont2}
     * @param preset {Preset}
     * @param vibratoOptions {{depth: number, rate: number, delay: number}}
     * @param tuningRatio {number} the note's initial tuning ratio
     */
    constructor(midiNote, node, soundFont, preset, vibratoOptions, tuningRatio) {
        this.midiNote = midiNote;
        this.targetNode = node;
        this.SAMPLE_CAP = 4;
        this.ctx = this.targetNode.context;
        this.tuningRatio = tuningRatio;

        if(vibratoOptions.rate > 0) {
            this.vibratoWave = new OscillatorNode(this.ctx, {
                frequency: vibratoOptions.rate
            });
            this.vibratoDepth = new GainNode(this.ctx, {
                gain: vibratoOptions.depth
            });
            this.vibratoWave.connect(this.vibratoDepth);
            this.vibratoDelay = vibratoOptions.delay;
        }

        let samples = this.limitSamples(preset.getSampleAndGenerators(midiNote));

        this.sampleOptions = samples.map(s => new GeneratorTranslator(s));

        this.noteVolumeController = new GainNode(this.ctx, {
            gain: 0
        });

        /**
         * @type {SampleNode[]}
         */
        this.sampleNodes = this.sampleOptions.map(sampleOptions => {
            const sample = sampleOptions.sample;

            const bufferSource = new AudioBufferSourceNode(this.ctx, {
                buffer: sample.getBuffer(
                    this.ctx,
                    soundFont,
                    sampleOptions.getAddressOffsets().start,
                    sampleOptions.getAddressOffsets().end)
            });

            if(this.vibratoDepth) {
                this.vibratoDepth.connect(bufferSource.detune);
            }

            // correct playback rate
            bufferSource.playbackRate.value = sampleOptions.getPlaybackRate(midiNote) * this.tuningRatio;

            // set up loop
            this.applyLoopIndexes(bufferSource, sampleOptions);

            // create attenuation
            let volumeControl = new GainNode(this.ctx);
            volumeControl.connect(this.noteVolumeController);

            bufferSource.connect(volumeControl);
            return new SampleNode(bufferSource, volumeControl);
        });
        this.noteVolumeController.connect(node);
    }

    /**
     *
     * @param samples {{
     *  instrumentGenerators: Generator[],
     *  presetGenerators: Generator[],
     *  sample: Sample
     * }[]}
     * @return {{
     *  instrumentGenerators: Generator[],
     *  presetGenerators: Generator[],
     *  sample: Sample
     * }[]}
     */
    limitSamples(samples)
    {
        if(samples.length > this.SAMPLE_CAP) {
            // sort by longes samples if there are 150ms or shorter samples.
            // We don't want any additional instrument effects, just the actual samples.
            if (samples.find(s => (s.sample.sampleLength / s.sample.sampleRate) < 0.15)) {
                samples.sort((sample1, sample2) => {
                        return sample2.sample.sampleLength - sample1.sample.sampleLength;
                    }
                );
            }

            if(this.SAMPLE_CAP === 2)
            {
                let leftSample = samples.find(s => s.sample.sampleType === "leftSample");
                if (!leftSample) {
                    // cap normally
                    samples = samples.slice(0, this.SAMPLE_CAP);
                } else {
                    let rightSample = samples.find(s => s.sample.sampleType === "rightSample");
                    if (!rightSample) {
                        // cap normally
                        samples = samples.slice(0, this.SAMPLE_CAP);
                    } else {
                        samples = [leftSample, rightSample];
                    }
                }
            }
            else
            {
                // cap normally
                samples = samples.slice(0, this.SAMPLE_CAP);
            }
        }
        return samples;
    }

    /**
     * @param bufferSource {AudioBufferSourceNode}
     * @param sampleOptions {GeneratorTranslator}
     */
    applyLoopIndexes(bufferSource, sampleOptions)
    {
        if (sampleOptions.sample.sampleLoopStartIndex !== sampleOptions.sample.sampleLoopEndIndex &&
            (sampleOptions.loopingMode === 1 || sampleOptions.loopingMode === 3)) {

            // (lsI - sI) / (sr * 2)
            const loopStartIndex = (sampleOptions.sample.sampleLoopStartIndex - sampleOptions.sample.sampleStartIndex)
                + sampleOptions.getAddressOffsets().startLoop * 2;
            bufferSource.loopStart = loopStartIndex / (sampleOptions.sample.sampleRate * 2);

            const loopEndIndex = (sampleOptions.sample.sampleLoopEndIndex - sampleOptions.sample.sampleStartIndex)
                + sampleOptions.getAddressOffsets().endLoop * 2;
            bufferSource.loopEnd = loopEndIndex / (sampleOptions.sample.sampleRate * 2);

            bufferSource.loop = true;
        }
    }

    displayDebugTable()
    {
        for(let sampleOption of this.sampleOptions)
        {
            /**
             *  create a nice info table
             *  @type {Option[]}
             */

            let dataTable = []
            class Option
            {
                Name;
                RawData;
                CalculatedData;
                constructor(name, raw, calculated) {
                    this.Name = name;
                    this.RawData = raw;
                    this.CalculatedData = calculated
                }
            }
            const env = sampleOption.getVolumeEnvelope();
            dataTable.push(new Option("initialAttenuation", sampleOption.attenuation, env.attenuation));
            dataTable.push(new Option("delayTime", sampleOption.delayTime, env.delayTime));
            dataTable.push(new Option("attackTime", sampleOption.attackTime, env.attackTime));
            dataTable.push(new Option("holdTime", sampleOption.holdTime, env.holdTime));
            dataTable.push(new Option("sustainLevel", sampleOption.sustainLowerAmount, env.sustainLevel));
            dataTable.push(new Option("decayTime", sampleOption.decayTime, env.decayTime));
            dataTable.push(new Option("releaseTime", sampleOption.releaseTime, env.releaseTime));

            dataTable.push(new Option("pan", sampleOption.pan, sampleOption.getPan()));
            dataTable.push(new Option("rootKey", sampleOption.rootKey, null));
            dataTable.push(new Option("loopingMode", sampleOption.loopingMode, sampleOption.getLoopingMode()));
            dataTable.push(new Option("ScaleTuning", sampleOption.scaleTune, sampleOption.getScaleTuneInfluence()));
            dataTable.push(new Option("AddressOffsets", sampleOption.getAddressOffsets(), null));

            let generatorsString = sampleOption.instrumentGenerators.map(g => `${g.generatorType}: ${g.generatorValue}`).join("\n");
            dataTable.push(new Option("SampleAndGenerators", sampleOption.sample, generatorsString));

            console.table(dataTable);
        }
    }

    /**
     * @param gain {number} 0-1
     * @param debug {boolean}
     * @returns {number[]} exclusiveClass numbers
     */
    startNote(gain, debug=false){
        if(debug)
        {
            this.displayDebugTable();
        }
        // lower the gain if a lot of notes (or not...?)
        this.noteVolumeController.gain.value = gain / 2;

        //this.noteVolumeController.gain.value /= Math.pow(2, Math.max(this.sampleNodes.length, 2));

        // activate vibrato
        if(this.vibratoWave)
        {
            this.vibratoWave.start(this.ctx.currentTime + this.vibratoDelay);
        }

        /**
         * @type {number[]}
         */
        let exclusives = [];
        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sample = this.sampleNodes[i];
            let sampleOptions = this.sampleOptions[i];

            if(sampleOptions.getExclusiveclass() !== 0)
            {
                exclusives.push(sampleOptions.getExclusiveclass());
            }

            // sample.attenuation.gain.value = sampleOptions.getAttenuation() / this.sampleNodes.length;

            sample.startSample(sampleOptions.getVolumeEnvelope());
        }
        this.exclusives = exclusives;
        return exclusives;
    }


    /**
     * @returns {Promise<boolean>}
     */
    async stopNote(){
        let maxFadeout = 0;
        // looping mode 3 and fadeout time
        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sampleOptions = this.sampleOptions[i];
            let sampleNode = this.sampleNodes[i];
            if(sampleOptions.getLoopingMode() === 3)
            {
                sampleNode.source.loop = false;
            }
            sampleNode.stopSample();

            if(sampleNode.releaseTime > maxFadeout) maxFadeout = sampleNode.releaseTime;
        }
        // so .then() can be added to delete the note after it finished
        await new Promise(r => setTimeout(r, maxFadeout * 1000));
        return true;
    }

    disconnectNote(){
        if(!this.noteVolumeController)
        {
            return;
        }
        for(let sample of this.sampleNodes) {
            if(!sample.source || !sample.volumeController /*|| !sample.pan*/)
            {
                continue;
            }
            sample.disconnectSample();
            /*sample.pan.disconnect(sample.attenuation);*/
            delete sample.source;
            delete sample.volumeController;
            /*delete sample.pan;*/
            sample = undefined;
        }

        // apply vibrato if needed
        if(this.vibratoDepth) {
            this.vibratoDepth.disconnect();
            this.vibratoWave.stop();
            this.vibratoWave.disconnect();
            delete this.vibratoWave;
            delete this.vibratoDepth;
        }

        this.sampleNodes = [];
        this.noteVolumeController.disconnect();
        delete this.noteVolumeController;
    }

    /**
     * @param bendRatio {number}
     */
    bendNote(bendRatio){
        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sampleOptions = this.sampleOptions[i];
            let sampleNode = this.sampleNodes[i];

            const newPlayback = sampleOptions.getPlaybackRate(this.midiNote) * Math.pow(2, bendRatio / 12) * this.tuningRatio;
            sampleNode.setPlaybackRate(newPlayback);
            //sampleNode.source.playbackRate.setTargetAtTime(newPlayback, this.drawingContext.currentTime, 0.1);
        }
    }

    /**
     * Stops the note in 0.05s
     * @returns {Promise<boolean>}
     */
    async killNote()
    {
        for (let node of this.sampleNodes)
        {
            node.releaseTime = 0.05;
            node.stopSample();
        }
        await new Promise(r => setTimeout(r, 50));
        return true;
    }
}