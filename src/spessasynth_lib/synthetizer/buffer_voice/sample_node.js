export class SampleNode
{
    /**
     * Creates a SampleNode, it holds a single sample and it's volume controller
     * @param bufferSrc {AudioBufferSourceNode}
     * @param attenuationNode {GainNode}
     * @param panner {StereoPannerNode}
     */
    constructor(bufferSrc, attenuationNode, panner) {
        this.source = bufferSrc;
        this.volumeController = attenuationNode;
        this.panner = panner;
    }

    /**
     * Starts the sample
     * @param audioEnvelope {volumeEnvelope}
     */
    startSample(audioEnvelope) {
        const attack = audioEnvelope.attackTime + audioEnvelope.delayTime;
        const hold = attack + audioEnvelope.holdTime;
        const decay = hold + audioEnvelope.decayTime;

        this.setValueNow(this.volumeController.gain, 0);

        // delay
        this.volumeController.gain.setValueAtTime(0.0001, this.currentTime + audioEnvelope.delayTime);

        // attack
        this.volumeController.gain.linearRampToValueAtTime(audioEnvelope.attenuation, this.currentTime + attack);

        // hold
        this.volumeController.gain.setValueAtTime(audioEnvelope.attenuation, this.currentTime + hold);

        // decay
        this.volumeController.gain.linearRampToValueAtTime(audioEnvelope.sustainLevel, this.currentTime + decay);

        // holdTime, decayTime, sustainLevel
        // this.rampToValue(
        //     this.volumeController.gain,
        //     audioEnvelope.sustainLevel,
        //     audioEnvelope.decayTime,
        //     audioEnvelope.holdTime /*+ audioEnvelope.delayTime + audioEnvelope.attackTime*/);

        this.source.start();
        this.releaseTime = audioEnvelope.releaseTime;
    }

    /**
     * Stops the sample
     */
    stopSample()
    {
        // stop the audio envelope
        clearTimeout(this.timeout);
        if(this.volumeController.gain.cancelAndHoldAtTime) {
            this.volumeController.gain.cancelAndHoldAtTime(this.currentTime);
        }
        else
        {
            // firefox >:(
            this.volumeController.gain.cancelScheduledValues(this.currentTime + 0.000001);
        }
        this.source.stop(this.source.context.currentTime + this.releaseTime);

        // begin release phase
        this.rampToValue(this.volumeController.gain, 0, this.releaseTime);
    }

    /**
     * sets the target at time, but in seconds
     * @param param {AudioParam}
     * @param value {number}
     * @param timeInSeconds {number}
     * @param relativeStartTime {number} in seconds
     */
    rampToValue(param, value, timeInSeconds, relativeStartTime = 0)
    {
        if(value === 0)
        {
            value = 0.000001;
        }
        this.timeout = setTimeout(() => {
            param.setValueAtTime(param.value, this.currentTime + 0.00001);
            param.exponentialRampToValueAtTime(value, this.currentTime + 0.001 + timeInSeconds);
        }, relativeStartTime * 1000);
    }

    get currentTime()
    {
        return this.source.context.currentTime + 0.0001;
    }

    /**
     * @param param {AudioParam}
     * @param value {number}
     */
    setValueNow(param, value)
    {
        param.value = value;
        // param.setValueAtTime(value, this.ctx.currentTime + 0.0001);
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
        clearTimeout(this.timeout);
        this.source.stop();
        this.source.disconnect();
        this.volumeController.disconnect();
        this.panner.disconnect();

        delete this.source;
        delete this.volumeController;
        delete this.panner;
        delete this;
    }
}