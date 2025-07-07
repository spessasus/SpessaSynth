/**
 * @typedef {[Float32Array, Float32Array]} AudioChunk
 * @typedef {AudioChunk[]} AudioChunks
 */

/**
 * An AudioWorkletProcessor that plays back 18 separate streams of stereo audio: reverb, and chorus and 16 dry channels.
 */
// noinspection JSUnresolvedReference
class PlaybackProcessor extends AudioWorkletProcessor
{
    
    
    /** @type {Float32Array[]} */
    data = [];
    
    /**
     *
     * @type {undefined|MessagePort}
     */
    sentPort = undefined;
    
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
                this.sentPort = e.ports[0];
                this.sentPort.onmessage = (e) =>
                {
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
        const blockSize = outputs[0][0].length;
        
        const data = this.data.shift();
        if (!data)
        {
            this.sentPort?.postMessage(this.data.length);
            return true;
        }
        let offset = 0;
        for (let i = 0; i < 18; i++)
        {
            outputs[i][0].set(data.subarray(offset, offset + blockSize));
            offset += blockSize;
            outputs[i][1].set(data.subarray(offset, offset + blockSize));
            offset += blockSize;
        }
        
        this.sentPort?.postMessage(this.data.length);
        return true;
    }
}

console.log("Registered JS processor");
// noinspection JSUnresolvedReference
registerProcessor("playback-processor", PlaybackProcessor);
