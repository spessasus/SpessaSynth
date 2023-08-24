import { workletMessageType } from './worklet_channel.js'
import { WorkletGeneratorHandler } from './generator_handler.js'

// Deserialize data and reconstruct class
function deserializeAndReconstruct(serializedData) {
    const parsedData = JSON.parse(serializedData);
    const constructorFn = new Function(`return ${parsedData.constructor}`)();

    class ReconstructedClass extends constructorFn {
        constructor(...args) {
            super(...args);
            for (const methodName in parsedData.methods) {
                this[methodName] = new Function(parsedData.methods[methodName]);
            }
        }
    }

    return ReconstructedClass;
}

class ChannelProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        /**
         * @type {Preset}
         */
        this.preset = undefined;

        this.tuningRatio = 1;

        /**
         * @type {WorkletVoice[]}
         */
        this.playingVoices = [];

        /*
         * @type {WorkletVoice[]}
         */
        this.stoppingVoices = [];

        /**
         * @param e {{data: WorkletMessage}}
         */
        this.port.onmessage = e => {
            console.log(e.data);
            /**
             * @type {number[]|Preset|number}
             */
            const data = e.data.messageData;
            switch (e.data.messageType) {
                default:
                    break;

                // note off
                case workletMessageType.noteOff:
                    // remove the given voices from playing and add them to stopping
                    const playing = [];
                    this.playingVoices.forEach(v => {
                        if(v.midiNote === data)
                        {
                            this.stoppingVoices.push(v);
                            return;
                        }
                        playing.push(v);
                    });
                    this.playingVoices = playing;
                    break;

                case workletMessageType.noteOn:
                    const midiNote = data[0];
                    const velocity = data[1];
                    this.playingVoices.push(...this.preset
                        .getSamplesAndGenerators(midiNote, velocity)
                        .map(s =>
                            new WorkletGeneratorHandler(s)
                                .getWorkletVoiceData(midiNote, velocity, this.tuningRatio)
                        ));
                    break;

                case workletMessageType.presetChange:
                    this.preset = deserializeAndReconstruct(data);
                    console.log(this.preset);
                    break;
            }
        }
    }

    /**
     * @param inputs {Float32Array[][]}
     * @param outputs {Float32Array[][]}
     * @returns {boolean}
     */
    process(inputs, outputs) {
        const output = outputs[0];
        //this.renderVoice(output[0], output[1]);
        return true;
    }

    /**
     * @param leftChannel {Float32Array}
     * @param rightChannel {Float32Array}
     */
    renderVoice(leftChannel, rightChannel)
    {
        // calculate releaseGain for the releasing note
        if(this.status === 1) {
            this.voice.voiceData.forEach(vcData => {
                // webaudio equation (going from 1 to 0
                const releaseGain = Math.pow(0.00000001, (currentTime - this.voice.startTime) / vcData.envelope.releaseSecs)//1 - ((currentTime - this.worklet_channel.startTime) / vcData.envelope.releaseSecs);
                // find the correct attenuation for release time
                if (releaseGain <= 0) {
                    this.status = 2;
                    return;
                }

                // use sustainnGain in the release phase
                vcData.envelope.sustainAbsoluteGain = releaseGain;
            });
        }

        const BUFFER_SIZE = leftChannel.length;
        let avgGain = 0;
        // for every sample point in the buffer
        for (let i = 0; i < BUFFER_SIZE; i++) {
            // prepare the output
            let outputLeft = 0;
            let outputRight = 0;

            let cursorIndex = 0;

            // for every sample in the note
            this.voice.voiceData.forEach(vcData => {
                if(vcData.finished)
                {
                    return;
                }
                const sample = vcData.sample;


                const ceiling = Math.ceil(this.cursors[cursorIndex]);


                // if no loop and finished, skip
                if (this.cursors[cursorIndex] > sample.sampleData.length && !vcData.isLooped) {
                    vcData.finished = true;
                    return;
                }

                // linear interpolation
                const floor = Math.floor(this.cursors[cursorIndex]);
                const fraction = this.cursors[cursorIndex] - floor;

                const lower = sample.sampleData[floor];
                const upper = sample.sampleData[ceiling];


                // grab the sample point
                let samplePoint = (lower + (upper - lower) * fraction) * vcData.envelope.currentGain;
                //let samplePoint = sample.sampleData[Math.floor(this.cursors[cursorIndex])] * vcData.envelope.currentGain;

                // advance the playback
                this.cursors[cursorIndex] += sample.playbackStep;

                // loop
                if (this.cursors[cursorIndex] >= sample.loopEnd && vcData.isLooped) {
                    if (sample.loopStart === 0) {
                        this.cursors[cursorIndex] = 0;
                    } else {
                        this.cursors[cursorIndex] = sample.loopStart
                    }
                }

                // advance to the next cursor
                cursorIndex++;

                // SAMPLE PROCESSING

                // if release, multiply by sustain
                if (this.status === 1) {
                    samplePoint *= vcData.envelope.sustainAbsoluteGain;
                }

                // left channel panning and write to output
                outputLeft += samplePoint * vcData.panGainLeft;

                // right channel panning and write to output
                outputRight += samplePoint * vcData.panGainRight;
            })

            // write the data to the output buffer
            leftChannel[i] = outputLeft;
            rightChannel[i] = outputRight;

            avgGain += (Math.abs(outputLeft) + Math.abs(outputRight)) / 2;
        }
        avgGain /= BUFFER_SIZE;
        // if no sound and in release phase, end
        if(avgGain === 0 && this.status === 1)
        {
            this.status = 2;
        }
    }

}


registerProcessor("worklet-channel-processor", ChannelProcessor);
console.log("Processor succesfully registered!");