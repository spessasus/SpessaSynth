import {Preset} from "../../soundfont/chunk/presets.js";
import { SynthesisModel } from './synthesis_model.js'

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
     * @param modulation {number}
     */
    constructor(midiNote, targetVelocity, node, preset, vibratoOptions, tuningRatio, modulation) {
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

        /**
         * @type {Set<number>}
         */
        this.exclusives = new Set();

        /**
         * @type {SynthesisModel[]}
         */
        this.sampleNodes = samples.map(samAndGen => {
            const sm =  new SynthesisModel(
                samAndGen,
                midiNote,
                node,
                this.tuningRatio,
                this.velocity,
                (modulation / 128) * 50
            );

            if(vibratoOptions.rate > 0)
            {
                this.vibratoDepth.connect(sm.wavetableOscillator.detune);
            }
            this.exclusives.add(sm.exclusive);
            return sm;
        });
    }


    /**
     * @param debug {boolean}
     * @returns {Set<number>} exclusiveClass numbers
     */
    startNote(debug=false){

        // activate vibrato
        if(this.vibratoWave)
        {
            this.vibratoWave.start(this.ctx.currentTime + this.vibratoDelay);
        }

        for(let i = 0; i < this.sampleNodes.length; i++)
        {
            let sample = this.sampleNodes[i];

            sample.start(debug);
        }
        return this.exclusives;
    }


    /**
     * @returns {Promise<boolean>}
     */
    async stopNote(){
        // find the longest release time
        let maxFadeout = Math.max(...this.sampleNodes.map(s => s.stop()));

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
            sample.disconnect();
            if(!sample.wavetableOscillator || !sample.volumeControl) {
                continue;
            }
            delete sample.wavetableOscillator;
            delete sample.volumeControl;
            delete sample.panner;
            delete sample.lowpassFilter;
            delete sample.filEnv;
            delete sample.synthesisOptions;
            delete sample.volEnv;
            sample = undefined;
        }

        // remove vibrato in not needed
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
        for(let i = 0; i < this.sampleNodes.length; i++)
        {
            let sampleNode = this.sampleNodes[i];

            const newPlayback = sampleNode.synthesisOptions.getPlaybackRate() * Math.pow(2, bendRatio / 12) * this.tuningRatio;
            sampleNode.oscillatorSpeed(newPlayback);
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
            node.filEnv.releaseTime = 0.05;
            node.stop();
        }
        await new Promise(r => setTimeout(r, 50));
        return true;
    }
}