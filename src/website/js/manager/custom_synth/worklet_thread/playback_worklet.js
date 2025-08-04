/**
 * @typedef {[Float32Array, Float32Array]} AudioChunk
 * @typedef {AudioChunk[]} AudioChunks
 */

const BLOCK_SIZE = 128;

const MAX_QUEUED = 20;

/**
 * An AudioWorkletProcessor that plays back 18 separate streams of stereo audio: reverb, and chorus and 16 dry channels.
 */
// noinspection JSUnresolvedReference
class PlaybackProcessor extends AudioWorkletProcessor
{
    
    
    /** @type {Float32Array[]} */
    data = [];
    
    updateRequested = false;
    
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
                    this.data.push(e.data);
                    this.updateRequested = false;
                    // if we need more, request immediately
                    if (this.data.length < MAX_QUEUED)
                    {
                        this.sentPort.postMessage(null);
                    }
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
        if (!data)
        {
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
        
        // if it has already been requested, we need to wait
        if (!this.updateRequested)
        {
            this.sentPort.postMessage(null);
            this.updateRequested = true;
        }
        
        // keep it online
        return true;
    }
}

console.info("Registered JS processor");
// noinspection JSUnresolvedReference
registerProcessor("playback-processor", PlaybackProcessor);
