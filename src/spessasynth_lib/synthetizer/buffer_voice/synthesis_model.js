import { GeneratorTranslator } from './generator_translator.js';

export class SynthesisModel
{
    /**
     * Creates a new instance of a single sample
     * @param synthesisOptions {GeneratorTranslator}
     * @param outputNode {AudioNode}
     * @param tuningRatio {number}
     * @param velocity {number}
     * @param vibratoDepth {number} in cents
     */
    constructor(synthesisOptions, outputNode, tuningRatio, velocity, vibratoDepth) {
        const context = outputNode.context;
        const sample = synthesisOptions.sample;
        const offsets = synthesisOptions.getAddressOffsets();

        this.context = context;
        this.looping = synthesisOptions.getLoopingMode();
        this.synthesisOptions = synthesisOptions;
        this.velocity = velocity;
        this.volEnv = synthesisOptions.getVolumeEnvelope();
        this.filEnv = synthesisOptions.getFilterEnvelope();
        this.vibrato = synthesisOptions.getVibrato();

        /*
        ====================
        WAVETABLE OSCILLATOR
        ====================
         */
        this.wavetableOscillator = new AudioBufferSourceNode(context, {
            buffer: sample.getAudioBuffer(context, offsets.start, offsets.end),
            playbackRate: synthesisOptions.getPlaybackRate() * tuningRatio,
            loop: this.looping !== 0
        });

        // set up loop
        if (this.looping !== 0)
        {
            // lsI / (sr * 2)
            const loopStartIndex = sample.sampleLoopStartIndex
                + offsets.startLoop * 2;

            const loopEndIndex = sample.sampleLoopEndIndex
                + offsets.endLoop * 2;

            this.wavetableOscillator.loopStart = loopStartIndex / (sample.sampleRate * 2);
            this.wavetableOscillator.loopEnd = loopEndIndex / (sample.sampleRate * 2);
        }

        /*
        ===========
        VIBRATO LFO
        ===========
         */
        this.vibratoLfo = new OscillatorNode(context, {
            type: "sine",
            frequency: this.vibrato.freqHz
        });
        this.vibratoDepth = new GainNode(context, {
            gain: this.vibrato.depthCents + vibratoDepth
        });

        this.vibratoLfo.connect(this.vibratoDepth);
        this.vibratoDepth.connect(this.wavetableOscillator.detune);

        /*
        ====================
        FINAL GAIN AMPLIFIER
        ====================
         */
        this.volumeControl = new GainNode(context, {
            gain: 0
        });

        // create panner
        this.panner = new StereoPannerNode(context ,{
            pan:  synthesisOptions.getPan()
        });

        /*
        ===============================
        LOWPASS FILTER (only if needed)
        ===============================
         */
        this.lowpassFilter = undefined;
        if(synthesisOptions.filterCutoff < 13490) {
            this.lowpassFilter = new BiquadFilterNode(context, {
                type: "lowpass",
                Q: synthesisOptions.getFilterQ(),
                frequency: this.filEnv.startHz
            });
            // osc -> filter -> panner -> gain
            this.wavetableOscillator.connect(this.lowpassFilter);
            this.lowpassFilter.connect(this.volumeControl);
        }
        else
        {
            // osc -> panner -> gain
            this.wavetableOscillator.connect(this.volumeControl);
        }

        this.volumeControl.connect(this.panner);
        this.panner.connect(outputNode);

        this.exclusive = synthesisOptions.getExclusiveclass();
    }

    get now()
    {
        return this.context.currentTime;
    }

    start(debug=false)
    {
        if(debug)
        {
            this.displayDebugTable();
        }

        const attack = this.volEnv.attackTime + this.volEnv.delayTime;
        const hold = attack + this.volEnv.holdTime;
        const decay = hold + this.volEnv.decayTime;

        if(this.volEnv.attackTime + this.volEnv.delayTime < 0.01)
        {
            // skip because sometimes browser is too slow lmao
            this.volumeControl.gain.value = this.volEnv.attenuation;
        }
        else {
            // delay
            this.volumeControl.gain.setValueAtTime(0.0001, this.now + this.volEnv.delayTime);

            // attack
            this.volumeControl.gain.linearRampToValueAtTime(this.volEnv.attenuation, this.now + attack);
        }

        // hold
        this.volumeControl.gain.setValueAtTime(this.volEnv.attenuation, this.now + hold);

        // decay
        this.volumeControl.gain.exponentialRampToValueAtTime(this.volEnv.sustainLevel, this.now + decay);

        /*==================
        * FILTER ENVELOPE
        * ==================*/
        if(this.lowpassFilter) // can be undefined when filter freq is above 13490
        {
            const freq = this.lowpassFilter.frequency;
            const attackFinish = this.now + this.filEnv.delayTime + this.filEnv.attackTime;

            // skip to peak if short attack and delay
            if(this.filEnv.attackTime + this.filEnv.delayTime < 0.01) {
                freq.value = this.filEnv.peakHz;
            }
            else {
                // delay
                freq.value = this.filEnv.startHz;
                freq.setValueAtTime(this.filEnv.startHz, this.now + this.filEnv.delayTime);

                // attack
                freq.linearRampToValueAtTime(this.filEnv.peakHz, attackFinish);
            }

            // hold
            freq.setValueAtTime(this.filEnv.peakHz, attackFinish + this.filEnv.holdTime);

            // decay, sustain
            freq.exponentialRampToValueAtTime(this.filEnv.sustainHz, attackFinish + this.filEnv.holdTime + this.filEnv.decayTime);
        }

        // start both wavetable and lfo
        this.vibratoLfo.start(this.now + this.vibrato.delayS);
        this.wavetableOscillator.start();
    }

    stop()
    {
        // looping mode 3
        if(this.looping === 3)
        {
            this.wavetableOscillator.loop = false;
        }

        // stop the audio envelope
        if(this.volumeControl.gain.cancelAndHoldAtTime) {
            this.volumeControl.gain.cancelAndHoldAtTime(this.now);
            if(this.lowpassFilter) {
                this.lowpassFilter.frequency.cancelAndHoldAtTime(this.now);
            }
        }
        else
        {
            // firefox >:(
            this.volumeControl.gain.cancelScheduledValues(this.now + 0.000001);

            if(this.lowpassFilter) {
                this.lowpassFilter.frequency.cancelScheduledValues(this.now + 0.000001);
            }
        }
        this.wavetableOscillator.stop(this.now + this.volEnv.releaseTime);


        // begin release phase
        this.volumeControl.gain.setValueAtTime(this.volumeControl.gain.value + 0.00001, this.now); // if it's 0 for some reason then it won't be zero anymore ;)
        this.volumeControl.gain.exponentialRampToValueAtTime(0.00001, this.now + this.volEnv.releaseTime);

        // filter too
        if(this.lowpassFilter) {
            this.lowpassFilter.frequency.setValueAtTime(this.lowpassFilter.frequency.value, this.now);
            this.lowpassFilter.frequency.linearRampToValueAtTime(this.filEnv.endHz, this.now + this.filEnv.releaseTime);
        }
    }

    disconnect()
    {
        this.wavetableOscillator.stop();
        this.wavetableOscillator.disconnect();
        delete this.wavetableOscillator;

        this.volumeControl.disconnect();
        delete this.volumeControl;

        this.panner.disconnect();
        delete this.panner;

        this.vibratoLfo.stop();
        this.vibratoLfo.disconnect();
        this.vibratoDepth.disconnect();
        delete this.vibrato;
        delete this.vibratoDepth;
        delete this.vibratoLfo;

        if(this.lowpassFilter) {
            this.lowpassFilter.disconnect();
            delete this.lowpassFilter;
        }

        delete this.filEnv;
        delete this.volEnv;
        delete this.synthesisOptions;
        delete this;
    }

    oscillatorSpeed(rate)
    {
        this.wavetableOscillator.playbackRate.value = rate;
    }

    displayDebugTable()
    {
        let sampleOption = this.synthesisOptions;
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
        const env = this.volEnv;
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