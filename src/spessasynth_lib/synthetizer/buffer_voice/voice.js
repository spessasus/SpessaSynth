import {Preset} from "../../soundfont/chunk/presets.js";
import {GeneratorTranslator} from "./generator_translator.js";
import {SampleNode} from "./sample_node.js";

export class Voice
{
    /**
     * Create a note
     * @param midiNote {number}
     * @param targetVelocity {number}
     * @param node {AudioNode}
     * @param preset {Preset}
     * @param vibratoOptions {{depth: number, rate: number, delay: number}}
     * @param tuningRatio {number} the note's initial tuning ratio
     */
    constructor(midiNote, targetVelocity, node, preset, vibratoOptions, tuningRatio) {
        this.midiNote = midiNote;
        this.targetNode = node;
        /**
         * @type {BaseAudioContext}
         */
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

        let samples = preset.getSamplesAndGenerators(midiNote, targetVelocity);

        this.sampleOptions = samples.map(s => new GeneratorTranslator(s));

        this.noteVolumeController = new GainNode(this.ctx, {
            gain: targetVelocity / 127
        });

        /**
         * @type {SampleNode[]}
         */
        this.sampleNodes = this.sampleOptions.map(sampleOptions => {
            const sample = sampleOptions.sample;

            const offsets = sampleOptions.getAddressOffsets();

            // const audioData = sample.getAudioData(
            //     sampleOptions.getAddressOffsets().start,
            //     sampleOptions.getAddressOffsets().end);
            // /**
            //  * @type {AudioBuffer}
            //  */
            // let buffer = this.ctx.createBuffer(1, audioData.length, sample.sampleRate);
            // buffer.getChannelData(0).set(audioData);

            // const pan = sampleOptions.getPan();
            //
            // // panning
            // if(pan > 0.6)
            // {
            //     // right
            //     buffer = this.ctx.createBuffer(2, audioData.length, sample.sampleRate);
            //     buffer.getChannelData(1).set(audioData);
            // }
            // else if (pan < -0.6)
            // {
            //     // left
            //     buffer = this.ctx.createBuffer(2, audioData.length, sample.sampleRate);
            //     buffer.getChannelData(0).set(audioData);
            // }
            // else
            // {
            //     // mono
            //     buffer = this.ctx.createBuffer(1, audioData.length, sample.sampleRate);
            //     buffer.getChannelData(0).set(audioData);
            // }

            const bufferSource = new AudioBufferSourceNode(this.ctx, {
                buffer: sample.getAudioBuffer(this.ctx, offsets.start, offsets.end)
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

            // create panner
            let panner = new StereoPannerNode(this.ctx ,{
                pan:  sampleOptions.getPan()
            });
            bufferSource.connect(panner);

            // if(sampleOptions.filterCutoff > 13400)
            // {
                panner.connect(volumeControl);
            // }
            // else {
            //
            //     // create lowpass filter
            //     let filter = new BiquadFilterNode(this.ctx, {
            //         frequency: sampleOptions.getFilterCutoffHz(),
            //         type: "lowpass",
            //     });
            //
            //     panner.connect(filter);
            //     filter.connect(volumeControl);
            // }

            return new SampleNode(bufferSource, volumeControl, panner);
        });
        this.noteVolumeController.connect(node);
    }

    /**
     * @param bufferSource {AudioBufferSourceNode}
     * @param sampleOptions {GeneratorTranslator}
     */
    applyLoopIndexes(bufferSource, sampleOptions)
    {
        if (sampleOptions.loopingMode === 1 || sampleOptions.loopingMode === 3) {

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
            dataTable.push(new Option("isLooped", sampleOption.loopingMode, sampleOption.getLoopingMode()));
            dataTable.push(new Option("ScaleTuning", sampleOption.scaleTune, sampleOption.getScaleTuneInfluence()));
            dataTable.push(new Option("AddressOffsets", sampleOption.getAddressOffsets(), null));
            dataTable.push(new Option("InitialFilterFc", sampleOption.filterCutoff, sampleOption.getFilterCutoffHz()));

            let generatorsString = sampleOption.instrumentGenerators.map(g => `${g.generatorType}: ${g.generatorValue}`).join("\n") + "\nPreset generators:" + sampleOption.presetGenerators.map(g => `${g.generatorType}: ${g.generatorValue}`).join("\n");
            dataTable.push(new Option("SampleAndGenerators", sampleOption.sample, generatorsString));

            console.table(dataTable);
        }
    }

    /**
     * @param debug {boolean}
     * @returns {number[]} exclusiveClass numbers
     */
    startNote(debug=false){
        if(debug)
        {
            this.displayDebugTable();
        }

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
                if(exclusives.find(v => v === sampleOptions.getExclusiveclass()) === undefined) {
                    exclusives.push(sampleOptions.getExclusiveclass());
                }
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