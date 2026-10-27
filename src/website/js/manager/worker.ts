/// <reference lib="webworker" />
import type { SynthCoreConfig } from "spessasynth_lib";
import { WorkerSynthesizerCore } from "spessasynth_lib";
import { encodeVorbis } from "./export/utils/encode_vorbis.ts";

let workerSynthCore: WorkerSynthesizerCore;

// For sending the buffers back (for video render in worker mode)
const storedBankBuffers = new Map<string, ArrayBuffer>();

onmessage = (e) => {
    if (e.ports[0]) {
        workerSynthCore = new WorkerSynthesizerCore(
            e.data as SynthCoreConfig,
            e.ports[0],
            postMessage.bind(this),
            encodeVorbis
        );
        return;
    }
    const message = e.data as {
        type?: string;
        data?: unknown;
    };
    if (message?.type === "getSoundBankCopy") {
        const bankID = message.data as string;
        const stored = storedBankBuffers.get(bankID);
        if (!stored) {
            postMessage({
                type: "soundBankCopyResult",
                data: { bankID, buffer: null }
            });
            return;
        }
        // Clone!
        const copy = stored.slice();
        postMessage(
            {
                type: "soundBankCopyResult",
                data: { bankID, buffer: copy }
            },
            [copy]
        );
        return;
    }
    if (message?.type === "soundBankManager") {
        const sbkMessage = message.data as {
            type?: string;
            data?: unknown;
        };
        if (sbkMessage?.type === "addSoundBank") {
            const add = sbkMessage.data as {
                id: string;
                soundBankBuffer: ArrayBuffer;
            };
            storedBankBuffers.set(add.id, add.soundBankBuffer);
        } else if (sbkMessage?.type === "deleteSoundBank") {
            storedBankBuffers.delete(sbkMessage.data as string);
        }
    }
    void workerSynthCore.handleMessage(
        e.data as Parameters<typeof workerSynthCore.handleMessage>[0]
    );
};
