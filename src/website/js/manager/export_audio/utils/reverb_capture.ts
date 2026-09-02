// Copied from spessasynth_lib
import type {
    ReverbProcessor,
    ReverbProcessorSnapshot
} from "../../../../../../../spessasynth_core";
import { BLOCK_SIZE } from "../render_audio_data.ts";

export class ReverbCapture implements ReverbProcessor {
    public character = 0;
    public delayFeedback = 0;
    public level = 64;
    public preDelayTime = 0;
    public preLowpass = 0;
    public time = 0;
    public readonly capturedData = new Float32Array(BLOCK_SIZE);

    public getSnapshot(): ReverbProcessorSnapshot {
        return {
            character: this.character,
            delayFeedback: this.delayFeedback,
            level: this.level,
            preDelayTime: this.preDelayTime,
            preLowpass: this.preLowpass,
            time: this.time
        };
    }

    public process(
        input: Float32Array,
        _outputLeft: Float32Array,
        _outputRight: Float32Array,
        _startIndex: number,
        sampleCount: number
    ) {
        this.capturedData.set(input.subarray(0, sampleCount));
    }
}
