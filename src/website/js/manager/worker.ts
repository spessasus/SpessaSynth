/// <reference lib="webworker" />
import { WorkerSynthesizerCore } from "spessasynth_lib";
import { encodeVorbis } from "../../../externals/encode_vorbis.ts";

let workerSynthCore: WorkerSynthesizerCore;
onmessage = (e) => {
    if (e.ports[0]) {
        workerSynthCore = new WorkerSynthesizerCore(
            e.data as { sampleRate: number; initialTime: number },
            e.ports[0],
            postMessage.bind(this),
            encodeVorbis
        );
    } else {
        void workerSynthCore.handleMessage(
            e.data as Parameters<
                typeof WorkerSynthesizerCore.prototype.handleMessage
            >[0]
        );
    }
};
