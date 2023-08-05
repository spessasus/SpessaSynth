class VoiceWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        /**
         * @param e {{data: WorkletMessage}}
         */
        this.port.onmessage = e => {
            switch (e.data.messageType) {
                default:
                    break;

                case 2:
                    this.voice.voiceData.forEach(vc => {
                        vc.tuningRatio = e.data.messageData;
                        vc.sample.playbackStep = (vc.sample.sampleRate / sampleRate) * vc.playbackRate * vc.tuningRatio;
                    }
                    );
                    break;

                case 0:
                    // prepare the cursors
                    this.cursors = new Float64Array(e.data.messageData.voiceData.length);

                    /**
                     * @type {WorkletVoiceMessage}
                     */
                    this.voice = e.data.messageData;

                    // calculate playback steps and apply current gain for now
                    this.voice.voiceData.forEach(vc => {
                        vc.sample.playbackStep = vc.sample.sampleRate / sampleRate * vc.playbackRate * vc.tuningRatio;
                        vc.envelope.currentGain = vc.envelope.attenuationGain;
                    });
                    break;

                case 1:
                    this.voice.startTime = currentTime;
                    this.status = 1;
                    break;

                case 3:
                    this.status = 2;
                    return;

            }
        }

        /**
         * 0 - playing
         * 1 - releasing
         * 2 - finished
         * @type {number}
         */
        this.status = 0;

        // another one for stopping
        this.finishedSamples = 0;
    }

    /**
     * @param inputs {Float32Array[][]}
     * @param outputs {Float32Array[][]}
     * @returns {boolean}
     */
    process(inputs, outputs) {
        if(!this.voice)
        {
            return true;
        }
        if(this.finishedSamples >= this.voice.voiceData.length)
        {
            this.status = 2;
        }
        if(this.status === 2)
        {
            delete this.voice;
            delete this.cursors;
            return false;
        }
        const output = outputs[0];
        this.renderVoice(output[0], output[1]);
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
                const releaseGain = Math.pow(0.00000001, (currentTime - this.voice.startTime) / vcData.envelope.releaseSecs)//1 - ((currentTime - this.worklet_voice.startTime) / vcData.envelope.releaseSecs);
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


registerProcessor("worklet_voice-processor", VoiceWorkletProcessor);
console.log("Processor succesfully registered!");