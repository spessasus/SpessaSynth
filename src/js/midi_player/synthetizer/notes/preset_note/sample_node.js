export class SampleNode
{
    /**
     * Creates a SampleNode, it holds a single sample and it's volume controller
     * @param bufferSrc {AudioBufferSourceNode}
     * @param attenuationNode {GainNode}
     */
    constructor(bufferSrc, attenuationNode) {
        this.source = bufferSrc;
        this.volumeController = attenuationNode;
    }

    /**
     * Starts the sample
     * @param audioEnvelope {volumeEnvelope}
     */
    startSample(audioEnvelope) {
        this.setValueNow(this.volumeController.gain, 0.0001);

        if (audioEnvelope.delayTime < 0.002 && audioEnvelope.attackTime < 0.002) {
            this.setValueNow(this.volumeController.gain, audioEnvelope.attenuation);
        }
        else {
            // delayTime, attackTime, initialAttenuation
            this.rampToValue(
                this.volumeController.gain,
                audioEnvelope.attenuation,
                audioEnvelope.attackTime,
                audioEnvelope.delayTime,
            );
        }

        // holdTime, decayTime, sustainLevel
        this.rampToValue(
            this.volumeController.gain,
            audioEnvelope.sustainLevel,
            audioEnvelope.decayTime,
            audioEnvelope.holdTime + audioEnvelope.delayTime + audioEnvelope.attackTime);

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
        this.volumeController.gain.cancelScheduledValues(this.currentTime);
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
            param.setValueAtTime(param.value, this.currentTime);
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
        this.source.stop();
        this.source.disconnect();
        this.volumeController.disconnect();
    }
}