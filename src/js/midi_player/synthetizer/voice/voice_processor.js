const BUFFER_SIZE = 128;
class VoiceWorkletProcessor extends AudioWorkletProcessor
{
    constructor() {
        super();
        /**
         * @param e {{data: (VoiceMessage[]|
         * string
         * |{
         *     bend: number
         * })}}
         */
        this.port.onmessage = e => {
            if(e.data === "stop")
            {
                this.buffers = undefined;
                this.stopped = true;
                return;
            }
            else if(e.data.bend){
                this.bendRatio = e.data.bend;
                return;
            }
            /**
             * @type {VoiceMessage[]}
             */
            this.buffers = e.data;
            this.bendRatio = 1;
            /**
             * @type {number[]}
             */
            this.cursors = [];
            for(const buf of this.buffers)
            {
                this.cursors.push(0);
            }
        }
    }



    /**
     * @param inputs {Float32Array[][]}
     * @param outputs {Float32Array[][]}
     * @param params
     * @returns {boolean}
     */
    process(inputs, outputs, params) {
        const output = outputs[0];
        if(this.stopped)
        {
            return false;
        }
        if (!this.buffers) {
            return true;
        }

        for (let i = 0; i < BUFFER_SIZE; i++) {
            let outputLeft = 0;
            let outputRight = 0;
            for(let bufI = 0; bufI < this.buffers.length; bufI++) {
                const bufferData = this.buffers[bufI];

                if(this.cursors[bufI] > bufferData.buffer.length && !bufferData.loop)
                {
                    continue;
                }

                //const x1 = bufferData.buffer[(index + 1) % bufferData.buffer.length];

                const samplePoint = bufferData.buffer[Math.floor(this.cursors[bufI]) % bufferData.buffer.length] * bufferData.gain / Math.max(this.buffers.length, 2);
                // left channel
                const leftSamplePoint = samplePoint * Math.min(1, 1 - bufferData.pan);
                outputLeft += leftSamplePoint //+ outputLeft - (leftSamplePoint * outputLeft);

                // right channel
                const rightSamplePoint = samplePoint * Math.min(1, bufferData.pan + 1);
                outputRight += rightSamplePoint //+ outputRight - (rightSamplePoint * outputRight);

                this.cursors[bufI] += bufferData.sampleRate / sampleRate * bufferData.playbackRate * this.bendRatio;
                if (this.cursors[bufI] >= bufferData.endLoop && bufferData.loop) {
                    if (bufferData.startLoop === 0) {
                        this.cursors[bufI] = 0;
                    } else {
                        this.cursors[bufI] = bufferData.startLoop + (this.cursors[bufI] - bufferData.endLoop);
                    }
                }
            }

            output[0][i] = outputLeft;
            output[1][i] = outputRight;
        }
        return true;
    }
}

registerProcessor("voice-processor", VoiceWorkletProcessor);
console.log("Processor succesfully registered!");