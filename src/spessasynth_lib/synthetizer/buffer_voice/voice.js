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
        this.velocity = targetVelocity;
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

        this.sampleOptions = samples.map(s => new GeneratorTranslator(s, midiNote));

        /**
         * @type {Set<number>}
         */
        this.exclusives = new Set();

        /**
         * @type {SampleNode[]}
         */
        this.sampleNodes = this.sampleOptions.map(sampleOptions => {
            const sample = sampleOptions.sample;

            const offsets = sampleOptions.getAddressOffsets();

            const bufferSource = new AudioBufferSourceNode(this.ctx, {
                buffer: sample.getAudioBuffer(this.ctx, offsets.start, offsets.end),
                playbackRate: sampleOptions.getPlaybackRate() * this.tuningRatio,
                loop: sampleOptions.getLoopingMode() !== 0
            });

            if(this.vibratoDepth) {
                this.vibratoDepth.connect(bufferSource.detune);
            }

            // set up loop
            this.applyLoopIndexes(bufferSource, sampleOptions);

            // create volume control
            let volumeControl = new GainNode(this.ctx, {
                gain: 0
            });
            volumeControl.connect(node);

            // create panner
            let panner = new StereoPannerNode(this.ctx ,{
                pan:  sampleOptions.getPan()
            });

            // lowpass filter (only if needed)
            let lowpassFilter = undefined;
            if(sampleOptions.filterCutoff < 13490) {
                lowpassFilter = new BiquadFilterNode(this.ctx, {
                    type: "lowpass",
                    Q: sampleOptions.getFilterQ()
                });
                bufferSource.connect(lowpassFilter);
                lowpassFilter.connect(panner);
            }
            else
            {
                bufferSource.connect(panner);
            }
            panner.connect(volumeControl);

            this.exclusives.add(sampleOptions.getExclusiveclass());

            return new SampleNode(bufferSource, volumeControl, panner, lowpassFilter);
        });
    }

    /**
     * @param bufferSource {AudioBufferSourceNode}
     * @param sampleOptions {GeneratorTranslator}
     */
    applyLoopIndexes(bufferSource, sampleOptions)
    {
        if (sampleOptions.loopingMode !== 0)
        {
            const offsets = sampleOptions.getAddressOffsets();
            // lsI / (sr * 2)
            const loopStartIndex = sampleOptions.sample.sampleLoopStartIndex
                + offsets.startLoop * 2;

            const loopEndIndex = sampleOptions.sample.sampleLoopEndIndex
                + offsets.endLoop * 2;

            bufferSource.loopStart = loopStartIndex / (sampleOptions.sample.sampleRate * 2);
            bufferSource.loopEnd = loopEndIndex / (sampleOptions.sample.sampleRate * 2);
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
            const env = sampleOption.getVolumeEnvelope(this.velocity);
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
            dataTable.push(new Option("FilterEnv", sampleOption.filterCutoff, sampleOption.getFilterEnvelope()));

            let generatorsString = sampleOption.instrumentGenerators.map(g => `${g.generatorType}: ${g.generatorValue}`).join("\n") + "\nPreset generators:" + sampleOption.presetGenerators.map(g => `${g.generatorType}: ${g.generatorValue}`).join("\n");
            dataTable.push(new Option("SampleAndGenerators", sampleOption.sample, generatorsString));

            console.table(dataTable);
        }
    }

    /**
     * @param debug {boolean}
     * @returns {Set<number>} exclusiveClass numbers
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

        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sample = this.sampleNodes[i];
            let sampleOptions = this.sampleOptions[i];

            sample.startSample(sampleOptions.getVolumeEnvelope(this.velocity), sampleOptions.getFilterEnvelope());
        }
        return this.exclusives;
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
        if(!this.sampleNodes)
        {
            return;
        }
        for(let sample of this.sampleNodes) {
            if(!sample.source || !sample.volumeController /*|| !sample.pan*/)
            {
                continue;
            }
            sample.source.stop();
            sample.disconnectSample();
            delete sample.source;
            delete sample.volumeController;
            delete sample.panner;
            delete sample.lowpass;
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
        delete this.sampleNodes;
    }

    /**
     * @param bendRatio {number}
     */
    bendNote(bendRatio){
        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sampleOptions = this.sampleOptions[i];
            let sampleNode = this.sampleNodes[i];

            const newPlayback = sampleOptions.getPlaybackRate() * Math.pow(2, bendRatio / 12) * this.tuningRatio;
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