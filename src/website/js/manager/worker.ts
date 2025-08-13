/// <reference lib="webworker" />
import { WorkerSynthesizerCore } from "spessasynth_lib";

let workerSynthCore: WorkerSynthesizerCore;
onmessage = (e) => {
    if (e.ports[0]) {
        const data = e.data as {
            sampleRate: number;
            currentTime: number;
        };
        workerSynthCore = new WorkerSynthesizerCore(
            {
                sampleRate: data.sampleRate,
                initialTime: data.currentTime
            },
            e.ports[0],
            postMessage.bind(this)
        );
    } else {
        void workerSynthCore.handleMessage(
            e.data as Parameters<
                typeof WorkerSynthesizerCore.prototype.handleMessage
            >[0]
        );
    }
};
