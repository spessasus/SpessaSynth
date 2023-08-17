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
        this.volumeController.gain.setValueAtTime(this.volumeController.gain.value, this.currentTime);
        this.volumeController.gain.exponentialRampToValueAtTime(0.00001, this.currentTime + this.releaseTime);
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

        delete this.source;
        delete this.volumeController;
        delete this.panner;
        delete this;
    }
}