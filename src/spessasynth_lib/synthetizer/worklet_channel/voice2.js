


/**
 * @typedef {{midiNote: number,
 * startTime: number,
 * voiceData: WorkletVoice[]}} WorkletVoiceMessage
 */

import {Preset} from "../../soundfont/chunk/presets.js";
import {WorkletGeneratorHandler} from "./generator_handler.js";

export class Voice2 extends AudioWorkletNode{
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
        super(node.context,"worklet_channel-processor" , {
            outputChannelCount: [2]
        });
        this.midiNote = midiNote;
        this.tuningRatio = tuningRatio;
        const samples = preset.getSamplesAndGenerators(midiNote, targetVelocity);

        /**
         * @type {WorkletVoiceMessage}
         */
        this.message = {
            midiNote: midiNote,
            startTime: node.context.currentTime,
            voiceData: samples.map(s => new WorkletGeneratorHandler(s).getWorkletVoiceData(midiNote, targetVelocity, tuningRatio))
        }

        /**
         * find exclusives
         * @type {number[]}
         */
        this.exclusives = [];
        samples.forEach(s => {
            const exclusive = s.instrumentGenerators.find(g => g.generatorType === "exclusiveClass");
            if(exclusive)
            {
                if(exclusive.generatorValue !== 0)
                {
                    this.exclusives.push(exclusive.generatorValue);
                }
            }
        })

        this.connect(node);
    }

    /**
     * @param debug {boolean}
     * @returns {number[]}
     */
    startNote(debug){
        if(debug)
        {
            console.log(this.message)
        }
        this.port.postMessage({messageType: 0, messageData: this.message});
        return this.exclusives;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async stopNote(){
        this.port.postMessage({messageType: 1});
        // find the longest release
        const maxFadeout = Math.max(...this.message.voiceData.map(vc => vc.envelope.releaseSecs));
        await new Promise(r => setTimeout(r, maxFadeout * 1000));
        return true;
    }

    disconnectNote(){
        this.disconnect();
        delete this.message;
        delete this.midiNote;
        delete this.exclusives;
        delete this.tuningRatio;
        delete this;
    }

    /**
     * @param semitones {number}
     */
    bendNote(semitones){
        const msg =  {messageType: 2, messageData: Math.pow(2, semitones / 12) * this.tuningRatio};
        this.port.postMessage(msg)
        //Math.pow(2, bendRatio / 12) * this.tuningRatio;
    }

    /**
     * Stops the note now
     * @returns {Promise<boolean>}
     */
    async killNote() {
        this.port.postMessage({messageType: 3});
    }
}