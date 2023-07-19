/**
 * @typedef {{
 * buffer: Float32Array,
 * startLoop: number,
 * endLoop: number,
 * sampleRate: number,
 * playbackRate: number,
 * gain: number,
 * pan: number,
 * loop: boolean
 * }} VoiceMessage
 */

export class VoiceWorklet extends AudioWorkletNode
{
    /**
     * @param context {BaseAudioContext}
     */
    constructor(context) {
        super(context, "voice-processor", {
            outputChannelCount: [2]
        });
    }

    /**
     * @param bufferData {VoiceMessage[]}
     */
    startBuffer(bufferData)
    {
        this.port.postMessage(bufferData);
    }

    stopBuffer()
    {
        this.port.postMessage("stop");
    }

    bendBuffer(ratio)
    {
        this.port.postMessage({bend: ratio})
    }
}