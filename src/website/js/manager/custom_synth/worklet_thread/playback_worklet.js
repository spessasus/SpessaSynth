/**
 * @typedef {[Float32Array, Float32Array]} AudioChunk
 * @typedef {AudioChunk[]} AudioChunks
 */

const BLOCK_SIZE = 128;

/**
 * An AudioWorkletProcessor that plays back 18 separate streams of stereo audio: reverb, and chorus and 16 dry channels.
 */
// noinspection JSUnresolvedReference
class PlaybackProcessor extends AudioWorkletProcessor
{
    
    
    /** @type {Float32Array[]} */
    data = [];
    
    requestUpdate = false;
    
    /**
     *
     * @type {MessagePort}
     */
    sentPort;
    
    constructor()
    {
        super();
        
        /**
         * @param e {MessageEvent}
         */
        this.port.onmessage = (e) =>
        {
            if (e.ports.length)
            {
                const sentPort = e.ports[0];
                this.sentPort = sentPort;
                sentPort.onmessage = (e) =>
                {
                    this.requestUpdate = true;
                    if (!e.data)
                    {
                        // worker has nothing to do, but requested the postMessage update
                        return;
                    }
                    this.data.push(e.data);
                };
                
            }
        };
    }
    
    // noinspection JSUnusedGlobalSymbols
    /**
     * @param _inputs {[Float32Array, Float32Array][]}
     * @param outputs {[Float32Array, Float32Array][]}
     * @returns {boolean}
     */
    process(_inputs, outputs)
    {
        const data = this.data.shift();
        if (this.requestUpdate)
        {
            this.sentPort.postMessage(this.data.length);
            this.requestUpdate = false;
        }
        if (!data)
        {
            console.warn("No audio data!");
            return true;
        }
        let offset = 0;
        // decode the data nicely
        for (let i = 0; i < 18; i++)
        {
            outputs[i][0].set(data.subarray(offset, offset + BLOCK_SIZE));
            offset += BLOCK_SIZE;
            outputs[i][1].set(data.subarray(offset, offset + BLOCK_SIZE));
            offset += BLOCK_SIZE;
        }
        // keep it online
        return true;
    }
}

console.info("Registered JS processor");
// noinspection JSUnresolvedReference
registerProcessor("playback-processor", PlaybackProcessor);
