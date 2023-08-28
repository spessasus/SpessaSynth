export class SampleNode
{
    /**
     * Creates a SampleNode, it holds a single sample and it's volume controller
     * @param bufferSrc {AudioBufferSourceNode}
     * @param attenuationNode {GainNode}
     * @param panner {StereoPannerNode}
     * @param lowpass {BiquadFilterNode}
     */
    constructor(bufferSrc, attenuationNode, panner, lowpass) {
        this.source = bufferSrc;
        this.volumeController = attenuationNode;
        this.panner = panner;
        this.lowpass = lowpass;
    }

    /**
     * Starts the sample
     * @param audioEnvelope {volumeEnvelope}
     * @param filterEnvelope {filterEnvelope}
     */
    startSample(audioEnvelope, filterEnvelope) {
        const attack = audioEnvelope.attackTime + audioEnvelope.delayTime;
        const hold = attack + audioEnvelope.holdTime;
        const decay = hold + audioEnvelope.decayTime;

        if(audioEnvelope.attackTime + audioEnvelope.delayTime < 0.01)
        {
            // skip because sometimes browser is too slow lmao
            this.volumeController.gain.value = audioEnvelope.attenuation;
        }
        else {
            // delay
            this.volumeController.gain.setValueAtTime(0.0001, this.currentTime + audioEnvelope.delayTime);

            // attack
            this.volumeController.gain.linearRampToValueAtTime(audioEnvelope.attenuation, this.currentTime + attack);
        }

        // hold
        this.volumeController.gain.setValueAtTime(audioEnvelope.attenuation, this.currentTime + hold);

        // decay
        this.volumeController.gain.exponentialRampToValueAtTime(audioEnvelope.sustainLevel, this.currentTime + decay);

        /*==================
        * FILTER ENVELOPE
        * ==================*/
        if(this.lowpass) // can be undefined when filter freq is above 13490
        {
            const freq = this.lowpass.frequency;
            const attackFinish = this.currentTime + filterEnvelope.delayTime + filterEnvelope.attackTime;
            if(filterEnvelope.attackTime + filterEnvelope.delayTime < 0.01) {
                freq.value = filterEnvelope.peakHz;
            }
            else {
                // delay
                freq.value = filterEnvelope.startHz;
                freq.setValueAtTime(filterEnvelope.startHz, this.currentTime + filterEnvelope.delayTime);

                // attack
                freq.linearRampToValueAtTime(filterEnvelope.peakHz, attackFinish);
            }

            // hold
            freq.setValueAtTime(filterEnvelope.peakHz, attackFinish + filterEnvelope.holdTime);

            // decay, sustain
            freq.linearRampToValueAtTime(filterEnvelope.sustainHz, attackFinish + filterEnvelope.holdTime + filterEnvelope.decayTime);
        }

        this.source.start();
        this.releaseTime = audioEnvelope.releaseTime;
        this.endHz = filterEnvelope.endHz;
        this.filterRelease = filterEnvelope.releaseTime;
    }

    /**
     * Stops the sample
     */
    stopSample()
    {
        // stop the audio envelope
        if(this.volumeController.gain.cancelAndHoldAtTime) {
            this.volumeController.gain.cancelAndHoldAtTime(this.currentTime);
            if(this.lowpass) {
                this.lowpass.frequency.cancelAndHoldAtTime(this.currentTime);
            }
        }
        else
        {
            // firefox >:(
            this.volumeController.gain.cancelScheduledValues(this.currentTime + 0.000001);

            if(this.lowpass) {
                this.lowpass.frequency.cancelScheduledValues(this.currentTime + 0.000001);
            }
        }
        this.source.stop(this.source.context.currentTime + this.releaseTime);


        // begin release phase
        this.volumeController.gain.setValueAtTime(this.volumeController.gain.value + 0.00001, this.currentTime); // if it's 0 for some reason then it won't be zero anymore ;)
        this.volumeController.gain.exponentialRampToValueAtTime(0.00001, this.currentTime + this.releaseTime);

        // filter too
        if(this.lowpass) {
            this.lowpass.frequency.setValueAtTime(this.lowpass.frequency.value, this.currentTime);
            this.lowpass.frequency.linearRampToValueAtTime(this.endHz, this.currentTime + this.filterRelease);
        }
    }

    get currentTime()
    {
        return this.source.context.currentTime + 0.0001;
    }

    /**
     * @param playbackRate {number}
     */
    setPlaybackRate(playbackRate)
    {
        this.source.playbackRate.value = playbackRate;
    }

    disconnectSample()
    {
        this.source.stop();
        this.source.disconnect();
        this.volumeController.disconnect();
        this.panner.disconnect();
        if(this.lowpass) {
            this.lowpass.disconnect();
            delete this.lowpass;
        }

        delete this.source;
        delete this.volumeController;
        delete this.panner;
        delete this;
    }
}