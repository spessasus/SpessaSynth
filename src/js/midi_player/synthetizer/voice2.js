import {VoiceWorklet} from "./voice/voice_worklet.js";
import {Preset} from "../../soundfont/chunk/presets.js";
import {GeneratorTranslator} from "./voice/generator_translator.js";
import {SoundFont2} from "../../soundfont/soundfont_parser.js";
import {SampleNode} from "./voice/sample_node.js";

export class Voice2{
    /**
     * Create a note
     * @param midiNote {number}
     * @param node {AudioNode}
     * @param soundFont {SoundFont2}
     * @param preset {Preset}
     * @param vibratoOptions {{depth: number, rate: number, delay: number}}
     * @param tuningRatio {number} the note's initial tuning ratio
     * @param sampleCap {number}
     */
    constructor(midiNote, node, soundFont, preset, vibratoOptions, tuningRatio, sampleCap = 4) {
        this.midiNote = midiNote;
        this.targetNode = node;
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

        let samples = preset.getSampleAndGenerators(midiNote);

        this.sampleOptions = samples.map(s => new GeneratorTranslator(s));

        this.noteVolumeController = new GainNode(this.ctx, {
            gain: 0
        });

        this.buffersData = [];
        for(const gentrans of this.sampleOptions)
        {
            this.buffersData.push({
                buffer: gentrans.sample.getBuffer(soundFont, 0, 0),
                startLoop: (gentrans.sample.sampleLoopStartIndex - gentrans.sample.sampleStartIndex) / 2,
                endLoop: (gentrans.sample.sampleLoopEndIndex - gentrans.sample.sampleStartIndex) / 2,
                sampleRate: gentrans.sample.sampleRate,
                playbackRate: gentrans.getPlaybackRate(midiNote),
                gain: gentrans.getVolumeEnvelope().attenuation,
                pan: gentrans.getPan(),
                loop: gentrans.getLoopingMode() !== 0
            });
            //console.log(samandgen.sample.sampleName)
        }
        this.buffersData.splice(10, 200)


        this.worklet = new VoiceWorklet(node.context);
        this.worklet.connect(this.noteVolumeController);

        this.noteVolumeController.connect(node);
    }

    startNote(gain){

        this.noteVolumeController.gain.value = gain;

        /**
         * @type {number[]}
         */
        let exclusives = [];
        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sampleOptions = this.sampleOptions[i];

            if(sampleOptions.getExclusiveclass() !== 0)
            {
                exclusives.push(sampleOptions.getExclusiveclass());
            }

            // sample.attenuation.gain.value = sampleOptions.getAttenuation() / this.sampleNodes.length;
        }
        this.exclusives = exclusives;
        this.worklet.startBuffer(this.buffersData);
        this.worklet.bendBuffer(this.tuningRatio)
        return exclusives;
    }

    async stopNote(){
        this.worklet.stopBuffer();
        return true;
    }

    disconnectNote(){
        if(!this.noteVolumeController)
        {
            return;
        }
        this.worklet.disconnect();
        this.noteVolumeController.disconnect();
        delete this.worklet;
        this.noteVolumeController.disconnect();
        delete this.noteVolumeController;
    }

    bendNote(bendRatio){
        this.worklet.bendBuffer(Math.pow(2, bendRatio / 12) * this.tuningRatio);
    }
}