import {Preset} from "../../../soundfont2_parser/chunk/presets.js";
import {PresetNoteModifiers} from "./preset_note_modifiers.js";

export class PresetNote
{
    /**
     * Create a note
     * @param midiNote {number}
     * @param node {AudioNode}
     * @param preset {Preset}
     * @param vibratoOptions {{depth: number, rate: number, delay: number}}
     */
    constructor(midiNote, node, preset, vibratoOptions = {delay: 0, depth: 0, rate: 0}) {
        this.midiNote = midiNote;
        this.targetNode = node;
        this.SAMPLE_CAP = 2;
        this.ctx = this.targetNode.context;
        this.preset = preset;

        if(vibratoOptions.rate > 0) {
            this.vibratoOscTest = new OscillatorNode(this.ctx, {
                frequency: vibratoOptions.rate
            });
            this.vibratoGainTest = new GainNode(this.ctx, {
                gain: vibratoOptions.depth
            });
            this.vibratoOscTest.connect(this.vibratoGainTest);
            this.vibratoDelay = vibratoOptions.delay;
        }

        let samples = preset.getSampleAndGenerators(midiNote);
        // cap the samples... it's probably my shitty code, or maybe browser cant handle that.
        if(samples.length > this.SAMPLE_CAP)
        {
            // sort by longes samples if there are 150ms or shorter samples.
            // We don't want any additional instrument effects, just the actual samples.
            if(samples.find(s => (s.sample.sampleLength / s.sample.sampleRate) < 0.15))
            {
                samples.sort((sample1, sample2) => {
                    return sample2.sample.sampleLength - sample1.sample.sampleLength;
                }
                );
            }

            let leftSample = samples.find(s => s.sample.sampleType === "leftSample");
            if(!leftSample)
            {
                // cap normally
                samples = samples.slice(0, this.SAMPLE_CAP);
            }
            else
            {
                let rightSample = samples.find(s => s.sample.sampleType === "rightSample");
                if(!rightSample)
                {
                    // cap normally
                    samples = samples.slice(0, this.SAMPLE_CAP);
                }
                else
                {
                    samples = [leftSample, rightSample];
                }
            }
        }

        this.sampleOptions = samples.map(s => new PresetNoteModifiers(s));

        this.gainNode = new GainNode(this.ctx, {
            gain: 0
        });
        // this.isPercussion = preset.midiBankNumber === 128;

        /**
         * @type {{attenuation: GainNode, buffer: AudioBufferSourceNode}[]}
         */
        this.sampleNodes = this.sampleOptions.map(sampleOptions => {
            let sample = sampleOptions.sample;
            let bufferSource = new AudioBufferSourceNode(this.ctx, {
                buffer: sample.getBuffer(this.ctx)
            });
            bufferSource.channelCount = 2;

            if(this.vibratoGainTest) {
                this.vibratoGainTest.connect(bufferSource.detune);
            }

            // correct pitch
            this.applyPitch(bufferSource, sampleOptions, midiNote);

            // calculate loop
            this.calculateLoop(bufferSource, sampleOptions);

            // create attenuation
            let attenuationNode = this.createAttenuation();

            // percussion has fadeout time of 30s sometimes for some reason
            //if (this.preset.midiBankNumber === 128) {
                // -3986 ~ 0.1s
                // 0 = 1s
                // if (sampleOptions.getReleaseTime() > 5) {
                //     sampleOptions.releaseTime = 0;
                // }
            // }

            // apply pan
            // let panNode = node.context.createStereoPanner();
            // panNode.connect(attenuationNode);
            // this.setValueNow(panNode.pan, sampleOptions.getPan());

            bufferSource.connect(attenuationNode);
            return {buffer: bufferSource, attenuation: attenuationNode/*, pan: panNode*/};
        });
        this.gainNode.connect(node);
    }

    /**
     * sets the target at time, but in seconds
     * @param param {AudioParam}
     * @param value {number}
     * @param timeInSeconds {number}
     * @param relativeStartTime {number} in seconds
     */
    targetAtTime(param, value, timeInSeconds, relativeStartTime = 0)
    {
        if(value === 0)
        {
            value = 0.0001;
        }
        param.setValueAtTime(param.value, this.ctx.currentTime + 0.00001 + relativeStartTime);
        param.exponentialRampToValueAtTime(value, this.ctx.currentTime + 0.001 + relativeStartTime + timeInSeconds)
        //const timeConstant = timeInSeconds / Math.log(9);
        // const timeConstant = timeInSeconds / (Math.log(1 / 0.01));
        // param.setTargetAtTime(value, this.ctx.currentTime + 0.0001 + relativeStartTime, timeConstant);
    }

    /**
     * @param bufferSource {AudioBufferSourceNode}
     * @param sampleOptions {PresetNoteModifiers}
     * @param midiNote {number}
     */
    applyPitch(bufferSource, sampleOptions, midiNote)
    {
        let playback = sampleOptions.getPlaybackRate(midiNote);
        this.setValueNow(bufferSource.playbackRate, playback);
    }

    /**
     * @param bufferSource {AudioBufferSourceNode}
     * @param sampleOptions {PresetNoteModifiers}
     */
    calculateLoop(bufferSource, sampleOptions)
    {
        if (sampleOptions.sample.sampleLoopStartIndex !== sampleOptions.sample.sampleLoopEndIndex &&
            (sampleOptions.loopingMode === 1 || sampleOptions.loopingMode === 3)) {

            bufferSource.loopStart =
                (sampleOptions.sample.sampleLoopStartIndex - sampleOptions.sample.sampleStartIndex) / (sampleOptions.sample.sampleRate * 2);
            bufferSource.loopEnd =
                (sampleOptions.sample.sampleLoopEndIndex - sampleOptions.sample.sampleStartIndex) / (sampleOptions.sample.sampleRate * 2);
            bufferSource.loop = true;
        }
    }

    createAttenuation()
    {
        let attenuationNode = new GainNode(this.ctx);
        attenuationNode.connect(this.gainNode);
        // if (this.isPercussion) {
        //     this.setValueNow(attenuationNode.gain, 2);
        //     attenuationNode.gain.value = 2;
        // }
        return attenuationNode;
    }

    /**
     * setValueAtTime but it adds 0.0001 for chromium compability...
     * @param param {AudioParam}
     * @param value {number}
     */
    setValueNow(param, value)
    {
        param.value = value;
        param.setValueAtTime(value, this.ctx.currentTime + 0.0001);
    }

    displayDebugTable()
    {
        for(let sampleOption of this.sampleOptions)
        {
            /**
             *  create a nice keyboard
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
            dataTable.push(new Option("initialAttenuation", sampleOption.attenuation, sampleOption.getAttenuation()));
            dataTable.push(new Option("pan", sampleOption.pan, sampleOption.getPan()));
            dataTable.push(new Option("rootKey", sampleOption.rootKey, null));
            dataTable.push(new Option("sustainLevel", sampleOption.sustainLowerAmount, sampleOption.getSustainLevel()));
            dataTable.push(new Option("decayTime", sampleOption.decayTime, sampleOption.getDecayTime()));
            dataTable.push(new Option("loopingMode", sampleOption.loopingMode, sampleOption.getLoopingMode()));
            dataTable.push(new Option("releaseTime", sampleOption.releaseTime, sampleOption.getReleaseTime()));
            dataTable.push(new Option("ScaleTuning", sampleOption.scaleTune, sampleOption.getScaleTuneInfluence()));
            dataTable.push(new Option("holdTime", sampleOption.holdTime, sampleOption.getHoldTime()));

            let generatorsString = sampleOption.generators.map(g => `${g.generatorType}: ${g.generatorValue}`).join("\n");
            dataTable.push(new Option("SampleAndGenerators", sampleOption.sample, generatorsString));

            console.table(dataTable);
        }
    }

    /**
     * @param velocity {number}
     * @param debug {boolean}
     * @returns {number[]} exclusiveClass numbers
     */
    startNote(velocity, debug=false){
        if(debug)
        {
            this.displayDebugTable();
        }
        let gain = velocity / 127;
        // if(!this.isPercussion) {
        // lower the gain if a lot of notes
        gain = gain / (this.sampleNodes.length < 1 ? 1 : this.sampleNodes.length + 1);
        //}
        this.setValueNow(this.gainNode.gain, gain);

        if(this.vibratoOscTest)
        {
            this.vibratoOscTest.start(this.ctx.currentTime + this.vibratoDelay);
        }

        let exclusives = [];
        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sample = this.sampleNodes[i];
            let sampleOptions = this.sampleOptions[i];


            // TODO: fix the exclusive class to finally fix that damn percussion
            if(sampleOptions.getExclusiveclass() !== 0)
            {
                exclusives.push(sampleOptions.getExclusiveclass());
            }

            // sample.attenuation.gain.value = sampleOptions.getAttenuation() / this.sampleNodes.length;
            sample.buffer.start(0.01);
            this.setValueNow(sample.attenuation.gain, sampleOptions.getAttenuation());

            // start fading to sustain in decay time, after hold (whew, that's a lot)
            this.targetAtTime(sample.attenuation.gain, sampleOptions.getSustainLevel(),
                sampleOptions.getDecayTime(), sampleOptions.getHoldTime());
        }
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
                sampleNode.buffer.loop = false;
            }
            let fadeout = sampleOptions.getReleaseTime();
            sampleNode.attenuation.gain.cancelScheduledValues(0);
            this.targetAtTime(sampleNode.attenuation.gain, 0.0001, fadeout);

            if(fadeout > maxFadeout) maxFadeout = fadeout;
        }
        // so .then() can be added to delete the note after it finished
        await new Promise(r => setTimeout(r, maxFadeout * 1000));
        return true;
    }

    /**
     * kills the note in 0.1s
     */
    async killNote()
    {
        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sampleOptions = this.sampleOptions[i];
            let sampleNode = this.sampleNodes[i];
            // start the fadeout...
            this.setValueNow(sampleNode.attenuation.gain, sampleOptions.getAttenuation());

            this.sampleNodes[i].attenuation.gain.linearRampToValueAtTime(0.001,
                this.ctx.currentTime + 0.1);

        }
        await new Promise(r => setTimeout(r, 110));
    }

    disconnectNote(){
        if(!this.gainNode)
        {
            return;
        }
        for(let sample of this.sampleNodes) {
            if(!sample.buffer || !sample.attenuation /*|| !sample.pan*/)
            {
                continue;
            }
            sample.buffer.stop();
            sample.buffer.disconnect();
            sample.attenuation.disconnect(this.gainNode);
            /*sample.pan.disconnect(sample.attenuation);*/
            delete sample.buffer;
            delete sample.attenuation;
            /*delete sample.pan;*/
            sample = undefined;
        }
        if(this.vibratoGainTest) {
            this.vibratoGainTest.disconnect();
            this.vibratoOscTest.stop();
            this.vibratoOscTest.disconnect();
            delete this.vibratoOscTest;
            delete this.vibratoGainTest;
        }

        this.sampleNodes = [];
        this.gainNode.disconnect();
        delete this.gainNode;
    }

    /**
     * @param pitchBend {number}
     */
    bendNote(pitchBend){
        // calculate normal playback rate
        const bendRatio = pitchBend / 8192 / 2;
        for(let i = 0; i < this.sampleOptions.length; i++)
        {
            let sampleOptions = this.sampleOptions[i];
            let sampleNode = this.sampleNodes[i];

            const newPlayback = sampleOptions.getPlaybackRate(this.midiNote) * Math.pow(2, bendRatio);
            this.setValueNow(sampleNode.buffer.playbackRate, newPlayback);
            //sampleNode.buffer.playbackRate.setTargetAtTime(newPlayback, this.drawingContext.currentTime, 0.1);
        }
    }
}