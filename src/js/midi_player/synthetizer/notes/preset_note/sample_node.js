
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
     * @param audioEnvelope {{initialAttenuation: number,
     * holdTime: number,
     * decayTime: number,
     * sustainLevel: number}}
     */
    startSample(audioEnvelope)
    {

        // initialAttenuation
        this.setValueNow(this.volumeController.gain, audioEnvelope.initialAttenuation);

        // holdTime, decayTime, sustainLevel
        this.targetAtTime(
            this.volumeController.gain,
            audioEnvelope.sustainLevel,
            audioEnvelope.decayTime,
            audioEnvelope.holdTime);

        this.source.start();
    }

    /**
     * Stops the sample
     * @param releaseTime {number} seconds
     */
    stopSample(releaseTime)
    {
        // stop the audio envelope
        this.volumeController.gain.cancelScheduledValues(this.currentTime);

        // begin release phase
        this.targetAtTime(this.volumeController.gain, 0, releaseTime);
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
        param.setValueAtTime(param.value, this.currentTime + relativeStartTime);
        param.exponentialRampToValueAtTime(value, this.currentTime + 0.00001 + relativeStartTime + timeInSeconds);
    }

    get currentTime()
    {
        return this.source.context.currentTime;
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